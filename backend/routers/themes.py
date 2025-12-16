from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List
from firebase_config import get_firestore_client
from dependencies.auth import get_current_user_id
from models.theme import Theme, ThemeCreate, ThemeUpdate
from services.gemini_service import gemini_generator
from services.openai_service import OpenAIThemeGenerator
from datetime import datetime
import uuid
import json
import asyncio

router = APIRouter()
db = get_firestore_client()
openai_generator = OpenAIThemeGenerator()

@router.post("/", response_model=Theme)
async def create_theme(theme_data: ThemeCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new theme for a brand"""
    # Verify brand ownership
    brand_ref = db.collection('brands').document(theme_data.brand_id)
    brand_doc = brand_ref.get()

    if not brand_doc.exists:
        raise HTTPException(status_code=404, detail="Brand not found")

    brand = brand_doc.to_dict()
    if brand.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to create theme for this brand")

    theme_id = str(uuid.uuid4())

    theme_dict = theme_data.model_dump()
    theme_dict.update({
        "id": theme_id,
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    # Save to Firestore
    db.collection('themes').document(theme_id).set(theme_dict)

    return Theme(**theme_dict)

@router.get("/", response_model=List[Theme])
async def get_user_themes(brand_id: str = None, user_id: str = Depends(get_current_user_id)):
    """Get all themes for the authenticated user, optionally filtered by brand"""
    themes_ref = db.collection('themes').where('user_id', '==', user_id)

    if brand_id:
        themes_ref = themes_ref.where('brand_id', '==', brand_id)

    themes_docs = themes_ref.stream()

    themes = []
    for doc in themes_docs:
        theme_data = doc.to_dict()
        themes.append(Theme(**theme_data))

    return themes

@router.get("/auto-generate-stream")
async def auto_generate_theme_stream(brand_id: str, user_id: str):
    """
    Auto-generate a complete theme with AI-generated parameters and images.
    Streams: theme parameters first, then images one by one.
    """

    async def event_generator():
        try:
            # 1. Get brand data
            brand_ref = db.collection('brands').document(brand_id)
            brand_doc = brand_ref.get()

            if not brand_doc.exists:
                yield f"data: {json.dumps({'error': 'Brand not found'})}\n\n"
                return

            brand_data = brand_doc.to_dict()

            # Verify ownership
            if brand_data.get('user_id') != user_id:
                yield f"data: {json.dumps({'error': 'Not authorized'})}\n\n"
                return

            # 2. Generate 5 theme parameter sets using OpenAI
            print("Generating 5 theme options with OpenAI...")
            all_theme_params = await openai_generator.generate_theme_parameters(brand_data, count=5)

            brand_name = brand_data.get('name', 'your brand')

            # 3. Generate one image for each theme and stream theme+image pairs
            for i, theme_params in enumerate(all_theme_params):
                print(f"Generating theme option {i + 1}/5: {theme_params['name']}...")

                # Generate image prompt for this theme
                image_prompt = gemini_generator.generate_image_prompt(
                    mood=theme_params['mood'],
                    colors=theme_params['colors'],
                    imagery=theme_params['imagery'],
                    brand_name=brand_name
                )

                # Generate one representative image
                try:
                    base64_image = await gemini_generator.generate_image(image_prompt)

                    # Upload to Firebase Storage
                    from services.storage_service import storage_service
                    temp_id = str(uuid.uuid4())
                    image_filename = f"theme_option_{temp_id}.png"
                    image_url = storage_service.upload_base64_image(
                        base64_data=base64_image,
                        folder="theme_options",
                        filename=image_filename
                    )
                except Exception as e:
                    print(f"Error generating image for theme {i + 1}: {e}")
                    image_url = f"https://images.unsplash.com/photo-{1600000000000 + i}?w=1080"

                # Stream this theme option to frontend
                theme_option = {
                    'type': 'theme_option',
                    'index': i + 1,
                    'total': 5,
                    'theme': {
                        'name': theme_params['name'],
                        'mood': theme_params['mood'],
                        'colors': theme_params['colors'],
                        'imagery': theme_params['imagery'],
                        'tone': theme_params['tone'],
                        'caption_length': theme_params['caption_length'],
                        'use_emojis': theme_params['use_emojis'],
                        'use_hashtags': theme_params['use_hashtags'],
                        'image_url': image_url
                    }
                }
                yield f"data: {json.dumps(theme_option)}\n\n"

            # 4. Send completion message (no theme saved yet - user needs to select one)
            yield f"data: {json.dumps({'type': 'complete', 'total_options': 5})}\n\n"

        except Exception as e:
            print(f"Error in auto-generate stream: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

@router.get("/{theme_id}", response_model=Theme)
async def get_theme(theme_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific theme by ID"""
    theme_ref = db.collection('themes').document(theme_id)
    theme_doc = theme_ref.get()

    if not theme_doc.exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    theme_data = theme_doc.to_dict()

    # Verify ownership
    if theme_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this theme")

    return Theme(**theme_data)

@router.put("/{theme_id}", response_model=Theme)
async def update_theme(theme_id: str, theme_update: ThemeUpdate, user_id: str = Depends(get_current_user_id)):
    """Update a theme"""
    theme_ref = db.collection('themes').document(theme_id)
    theme_doc = theme_ref.get()

    if not theme_doc.exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    theme_data = theme_doc.to_dict()

    # Verify ownership
    if theme_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this theme")

    # Update fields
    update_data = theme_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow().isoformat()

    theme_ref.update(update_data)

    # Get updated theme
    updated_doc = theme_ref.get()
    return Theme(**updated_doc.to_dict())

@router.delete("/{theme_id}")
async def delete_theme(theme_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a theme"""
    theme_ref = db.collection('themes').document(theme_id)
    theme_doc = theme_ref.get()

    if not theme_doc.exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    theme_data = theme_doc.to_dict()

    # Verify ownership
    if theme_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this theme")

    theme_ref.delete()

    return {"message": "Theme deleted successfully"}

@router.get("/regenerate-images-stream")
async def regenerate_images_stream(
    brand_id: str,
    user_id: str,
    name: str,
    mood: str,
    colors: str,  # JSON string of color array
    imagery: str,
    tone: str,
    caption_length: str,
    use_emojis: str,  # "true" or "false"
    use_hashtags: str  # "true" or "false"
):
    """
    Regenerate 5 image variations based on user's current theme parameters.
    Streams images as they're generated.
    """

    async def event_generator():
        try:
            # Parse parameters
            import json as json_lib
            colors_list = json_lib.loads(colors)
            use_emojis_bool = use_emojis.lower() == 'true'
            use_hashtags_bool = use_hashtags.lower() == 'true'

            # Get brand data
            brand_ref = db.collection('brands').document(brand_id)
            brand_doc = brand_ref.get()

            if not brand_doc.exists:
                yield f"data: {json.dumps({'error': 'Brand not found'})}\n\n"
                return

            brand_data = brand_doc.to_dict()

            # Verify ownership
            if brand_data.get('user_id') != user_id:
                yield f"data: {json.dumps({'error': 'Not authorized'})}\n\n"
                return

            brand_name = brand_data.get('name', 'your brand')

            # Generate 5 image variations with the provided parameters
            for i in range(5):
                print(f"Regenerating image {i + 1}/5 with custom parameters...")

                # Generate image prompt
                image_prompt = gemini_generator.generate_image_prompt(
                    mood=mood,
                    colors=colors_list,
                    imagery=imagery,
                    brand_name=brand_name
                )

                # Generate image
                try:
                    variation_prompt = f"{image_prompt}\n\nVariation {i + 1}: Create a unique composition."
                    base64_image = await gemini_generator.generate_image(variation_prompt)

                    # Upload to Firebase Storage
                    from services.storage_service import storage_service
                    temp_id = str(uuid.uuid4())
                    image_filename = f"regenerated_{temp_id}.png"
                    image_url = storage_service.upload_base64_image(
                        base64_data=base64_image,
                        folder="theme_options",
                        filename=image_filename
                    )
                except Exception as e:
                    print(f"Error generating image {i + 1}: {e}")
                    image_url = f"https://images.unsplash.com/photo-{1600000000000 + i}?w=1080"

                # Stream this theme option to frontend
                theme_option = {
                    'type': 'theme_option',
                    'index': i + 1,
                    'total': 5,
                    'theme': {
                        'name': name,
                        'mood': mood,
                        'colors': colors_list,
                        'imagery': imagery,
                        'tone': tone,
                        'caption_length': caption_length,
                        'use_emojis': use_emojis_bool,
                        'use_hashtags': use_hashtags_bool,
                        'image_url': image_url
                    }
                }
                yield f"data: {json.dumps(theme_option)}\n\n"

            # Send completion message
            yield f"data: {json.dumps({'type': 'complete', 'total_options': 5})}\n\n"

        except Exception as e:
            print(f"Error in regenerate stream: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

@router.get("/{theme_id}/generate-posts-stream")
async def generate_posts_stream(theme_id: str, user_id: str):
    """Stream posts as they're generated using Server-Sent Events"""

    async def event_generator():
        try:
            # Get the theme
            theme_ref = db.collection('themes').document(theme_id)
            theme_doc = theme_ref.get()

            if not theme_doc.exists:
                yield f"data: {json.dumps({'error': 'Theme not found'})}\n\n"
                return

            theme_data = theme_doc.to_dict()

            # Verify ownership
            if theme_data.get('user_id') != user_id:
                yield f"data: {json.dumps({'error': 'Not authorized'})}\n\n"
                return

            # Get brand information
            brand_id = theme_data.get('brand_id')
            brand_ref = db.collection('brands').document(brand_id)
            brand_doc = brand_ref.get()

            brand_name = "your brand"
            if brand_doc.exists:
                brand_data = brand_doc.to_dict()
                brand_name = brand_data.get('name', 'your brand')

            # Extract theme parameters
            theme_name = theme_data.get('name', 'Untitled Theme')
            posts_count = theme_data.get('posts_count', 5)
            mood = theme_data.get('mood', 'Professional')
            colors = theme_data.get('colors', ['#4F46E5', '#EC4899', '#F59E0B', '#10B981'])
            imagery = theme_data.get('imagery', 'Product-focused')
            tone = theme_data.get('tone', 'Professional')
            caption_length = theme_data.get('caption_length', 'medium')
            use_emojis = theme_data.get('use_emojis', False)
            use_hashtags = theme_data.get('use_hashtags', True)

            # Generate base image prompt
            base_image_prompt = gemini_generator.generate_image_prompt(
                mood=mood,
                colors=colors,
                imagery=imagery,
                brand_name=brand_name
            )

            all_posts = []

            # Generate posts one by one and stream them
            for i in range(posts_count):
                print(f"Streaming post {i + 1}/{posts_count}...")

                # Generate caption
                caption_data = await gemini_generator.generate_caption(
                    theme_name=theme_name,
                    mood=mood,
                    tone=tone,
                    caption_length=caption_length,
                    use_emojis=use_emojis,
                    use_hashtags=use_hashtags,
                    brand_name=brand_name
                )

                # Generate image
                try:
                    variation_prompt = f"{base_image_prompt}\n\nVariation {i + 1}: Create a unique composition."
                    base64_image = await gemini_generator.generate_image(variation_prompt)

                    # Upload to Firebase Storage
                    from services.storage_service import storage_service
                    image_filename = f"{theme_id}_{uuid.uuid4()}.png"
                    image_url = storage_service.upload_base64_image(
                        base64_data=base64_image,
                        folder="generated_images",
                        filename=image_filename
                    )
                except Exception as e:
                    print(f"Error generating image {i + 1}: {e}")
                    image_url = f"https://images.unsplash.com/photo-{1600000000000 + i}?w=1080"

                # Create post object
                post = {
                    'id': str(uuid.uuid4()),
                    'theme_id': theme_id,
                    'image_url': image_url,
                    'caption': caption_data['caption'],
                    'hashtags': caption_data['hashtags'],
                    'post_type': ['Functional', 'Brand resonance', 'Emotional', 'Educational',
                                  'Experiential', 'Current events', 'Personal', 'Employee',
                                  'Community', 'Customer story', 'Cause', 'Sales'][i % 12],
                    'selected': False,
                    'scheduled_time': None,
                    'status': 'draft'
                }

                all_posts.append(post)

                # Send the post to frontend immediately
                yield f"data: {json.dumps({'type': 'post', 'post': post, 'index': i + 1, 'total': posts_count})}\n\n"

            # Update theme in Firestore with all posts
            theme_data['posts'] = all_posts
            theme_data['updated_at'] = datetime.utcnow().isoformat()
            theme_ref.update({
                'posts': all_posts,
                'updated_at': theme_data['updated_at']
            })

            # Send completion message
            yield f"data: {json.dumps({'type': 'complete', 'total_posts': len(all_posts)})}\n\n"

        except Exception as e:
            print(f"Error in stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

@router.post("/{theme_id}/generate-posts", response_model=Theme)
async def generate_posts(theme_id: str, user_id: str = Depends(get_current_user_id)):
    """Generate posts for a theme using Gemini AI"""
    # Get the theme
    theme_ref = db.collection('themes').document(theme_id)
    theme_doc = theme_ref.get()

    if not theme_doc.exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    theme_data = theme_doc.to_dict()

    # Verify ownership
    if theme_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to generate posts for this theme")

    # Get brand information for context
    brand_id = theme_data.get('brand_id')
    brand_ref = db.collection('brands').document(brand_id)
    brand_doc = brand_ref.get()

    brand_name = "your brand"
    if brand_doc.exists:
        brand_data = brand_doc.to_dict()
        brand_name = brand_data.get('name', 'your brand')

    # Extract theme parameters for post generation
    theme_name = theme_data.get('name', 'Untitled Theme')
    posts_count = theme_data.get('posts_count', 5)
    mood = theme_data.get('mood', 'Professional')
    colors = theme_data.get('colors', ['#4F46E5', '#EC4899', '#F59E0B', '#10B981'])
    imagery = theme_data.get('imagery', 'Product-focused')
    tone = theme_data.get('tone', 'Professional')
    caption_length = theme_data.get('caption_length', 'medium')
    use_emojis = theme_data.get('use_emojis', False)
    use_hashtags = theme_data.get('use_hashtags', True)

    # Generate posts using Gemini
    try:
        generated_posts = await gemini_generator.generate_posts(
            theme_id=theme_id,
            theme_name=theme_name,
            posts_count=posts_count,
            mood=mood,
            colors=colors,
            imagery=imagery,
            tone=tone,
            caption_length=caption_length,
            use_emojis=use_emojis,
            use_hashtags=use_hashtags,
            brand_name=brand_name
        )

        # Update theme with generated posts
        theme_data['posts'] = generated_posts
        theme_data['updated_at'] = datetime.utcnow().isoformat()

        # Save to Firestore
        theme_ref.update({
            'posts': generated_posts,
            'updated_at': theme_data['updated_at']
        })

        return Theme(**theme_data)

    except Exception as e:
        print(f"Error generating posts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate posts: {str(e)}")
