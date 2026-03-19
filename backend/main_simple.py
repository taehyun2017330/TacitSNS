from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="TacitSNS Local API", version="1.0.0")

# Configure CORS for localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase (keep for storage)
from firebase_config import initialize_firebase
initialize_firebase()

# Import existing routers
from routers import brands, themes, proposal, logo, autocomplete

# Include routers
app.include_router(brands.router, prefix="/api/brands", tags=["brands"])
app.include_router(themes.router, prefix="/api/themes", tags=["themes"])
app.include_router(proposal.router, prefix="/api/proposal", tags=["proposal"])
app.include_router(logo.router, prefix="/api/logo", tags=["logo"])
app.include_router(autocomplete.router, tags=["autocomplete"])  # Autocomplete routes have their own prefixes

# Simple in-memory storage for current session
current_brand = {}

# ============== Pydantic Models ==============

class BrandInfo(BaseModel):
    name: str
    category: str
    description: str
    images: Optional[List[str]] = []

class LogoRequest(BaseModel):
    brandName: str
    brandCategory: str
    brandDescription: str
    style: Optional[str] = "modern"
    variant: Optional[int] = 0

class PostGenerationRequest(BaseModel):
    brandSummary: Optional[str] = None
    keywords: Optional[List[str]] = []
    parentNodeId: Optional[str] = None
    parentImageUrl: Optional[str] = None
    parentKeywords: Optional[List[str]] = None
    direction: Optional[str] = None
    iteration: Optional[int] = 0
    userFeedback: Optional[dict] = None
    # For collective feedback from all 4 images
    imagesFeedback: Optional[List[dict]] = None
    explorationLevel: Optional[float] = 0.5
    similarity: Optional[float] = None
    actionType: Optional[str] = None
    editOptions: Optional[dict] = None
    numImages: Optional[int] = 4

class CaptionRequest(BaseModel):
    imageUrl: str
    keywords: List[str]
    brandInfo: Optional[dict] = {}
    tone: Optional[str] = "casual"

# ============== Brand Endpoints ==============

@app.post("/brand/create")
async def create_brand(brand_info: BrandInfo):
    """Create or update the current brand"""
    current_brand.update({
        "name": brand_info.name,
        "category": brand_info.category,
        "description": brand_info.description,
        "images": brand_info.images,
        "created_at": datetime.now().isoformat()
    })
    return {"message": "Brand created successfully", "brand": current_brand}

@app.get("/brand/current")
async def get_current_brand():
    """Get the current brand information"""
    if not current_brand:
        raise HTTPException(status_code=404, detail="No brand currently set")
    return current_brand

# ============== Logo Generation ==============

@app.post("/logo/generate")
async def generate_logo(request: LogoRequest):
    """Generate logo variations for a brand"""

    # Mock logo generation
    base_colors = {
        "modern": ["#2563eb", "#3b82f6", "#60a5fa"],
        "classic": ["#111827", "#374151", "#6b7280"],
        "playful": ["#ec4899", "#f472b6", "#f9a8d4"],
        "natural": ["#10b981", "#34d399", "#86efac"]
    }

    style_colors = base_colors.get(request.style, base_colors["modern"])

    logos = []
    for i in range(4):
        color_index = (request.variant + i) % len(style_colors)
        logos.append({
            "id": f"logo_{i+1}",
            "url": f"https://placehold.co/400x400/{style_colors[color_index].replace('#', '')}/ffffff?text={request.brandName[0]}",
            "keywords": generate_mock_keywords(
                {"name": request.brandName, "category": request.brandCategory},
                request.style
            ),
            "metadata": {
                "style": request.style,
                "variant": request.variant + i,
                "color": style_colors[color_index],
                "brandName": request.brandName,
                "category": request.brandCategory
            }
        })

    return {
        "logos": logos,
        "delta": f"Generated {request.style} style logos with variant {request.variant}"
    }

def generate_mock_keywords(brand_info: dict, style: str = "default") -> List[str]:
    """Generate mock keywords based on brand and style"""
    base_keywords = ["professional", "innovative", brand_info.get("category", "business")]

    style_keywords = {
        "modern": ["minimal", "clean", "tech-forward"],
        "classic": ["timeless", "elegant", "traditional"],
        "playful": ["fun", "vibrant", "energetic"],
        "natural": ["organic", "sustainable", "eco-friendly"]
    }

    return base_keywords + style_keywords.get(style, ["contemporary"])

# ============== Post Generation ==============

def generate_delta_description(parent_keywords: List[str], child_keywords: List[str], direction: str = None) -> str:
    """Generate a description of changes between parent and child keywords"""
    if not parent_keywords:
        return "Initial generation based on brand identity"

    added = set(child_keywords) - set(parent_keywords)
    removed = set(parent_keywords) - set(child_keywords)

    changes = []
    if added:
        changes.append(f"Added: {', '.join(added)}")
    if removed:
        changes.append(f"Removed: {', '.join(removed)}")
    if direction:
        changes.append(f"Direction: {direction}")

    return " | ".join(changes) if changes else "Refined variation"


def normalize_exploration_level(request: PostGenerationRequest) -> float:
    raw_value = request.similarity if request.similarity is not None else request.explorationLevel
    if raw_value is None:
        return 0.5

    if raw_value > 1:
        raw_value = raw_value / 100

    return max(0.0, min(1.0, raw_value))


def build_action_prompt(
    base_prompt: str,
    request: PostGenerationRequest,
    variant_index: int
) -> str:
    prompt = base_prompt
    action_type = request.actionType or "initial"

    if request.direction:
        prompt += f"\nCreative direction: {request.direction}"

    if request.parentKeywords:
        prompt += f"\nReference keywords: {', '.join(request.parentKeywords[:8])}"

    if action_type == "explore":
        prompt += """
\nUse the reference image as a starting point and deliberately evolve it.
Keep recognizable brand DNA while changing the visible execution in a meaningful way.
"""
    elif action_type == "regenerate":
        prompt += """
\nRegenerate this concept from the same creative seed.
Keep the overall idea but change the composition, subject pose, framing, and styling enough to feel like a new candidate.
"""
    elif action_type == "edit":
        edit_instructions: List[str] = []
        if request.editOptions:
            edit_instructions.extend(request.editOptions.get("suggestedEdits", []))
            custom_edit = request.editOptions.get("customEdit")
            if custom_edit:
                edit_instructions.append(custom_edit)

        prompt += """
\nThis is a targeted edit of the reference image, not a new concept.
Preserve everything that is not explicitly mentioned below.
"""
        if edit_instructions:
            prompt += f"\nRequested edits: {', '.join(edit_instructions)}"

    prompt += f"\nVariation slot: {variant_index + 1}"
    return prompt


def get_generation_variance(action_type: Optional[str], exploration_level: float) -> int:
    if action_type == "edit":
        return 18
    if action_type == "regenerate":
        return int(25 + (exploration_level * 35))
    if action_type == "explore":
        return int(20 + (exploration_level * 60))
    return int(40 + (exploration_level * 40))


@app.post("/api/generate-post-images")
async def generate_post_images(request: PostGenerationRequest):
    """Simple, clean image generation endpoint"""

    from image_generation_final import (
        generate_image_prompts,
        generate_image,
        analyze_image,
        summarize_image_delta
    )

    try:
        iteration = request.iteration or 0
        posts = []

        # Parse brand description
        brand_description = request.brandSummary or "Brand"
        if " - " in brand_description and ":" in brand_description:
            parts = brand_description.split(":")
            brand_description = parts[1].strip() if len(parts) > 1 else brand_description

        # Determine exploration level from the UI slider. The frontend sends 0-100 similarity values.
        exploration_level = normalize_exploration_level(request)

        # Generate prompts
        print(f"Generating with exploration level: {exploration_level}")
        prompts = generate_image_prompts(
            brand_description=brand_description,
            images_feedback=request.imagesFeedback,
            exploration_level=exploration_level
        )

        # Generate and analyze images
        import asyncio
        from image_generation_final import generate_image_async

        # Extract brand name
        brand_name = "Brand"
        if brand_description and ":" in brand_description:
            brand_name = brand_description.split(":")[0].strip()

        # Determine how many images to generate
        num_to_generate = request.numImages or 4
        if request.actionType == 'edit':
            num_to_generate = 1  # Edit is always 1-to-1

        edit_instructions: List[str] = []
        if request.editOptions:
            edit_instructions.extend(request.editOptions.get("suggestedEdits", []))
            custom_edit = request.editOptions.get("customEdit")
            if custom_edit:
                edit_instructions.append(custom_edit)

        # Generate all images in parallel
        tasks = []
        prompt_batch = [build_action_prompt(prompt, request, i) for i, prompt in enumerate(prompts[:num_to_generate])]
        variance = get_generation_variance(request.actionType, exploration_level)

        for prompt in prompt_batch:
            tasks.append(
                generate_image_async(
                    prompt,
                    brand_name,
                    variance=variance,
                    reference_image=request.parentImageUrl
                )
            )

        # Wait for all images to generate
        image_urls = await asyncio.gather(*tasks)

        batch_delta = None
        delta_candidates: List[str] = []

        # Analyze each image
        for i, image_url in enumerate(image_urls):
            analysis = analyze_image(image_url, brand_description)
            delta_summary = None

            if request.parentImageUrl:
                delta_summary = summarize_image_delta(
                    parent_image=request.parentImageUrl,
                    child_image=image_url,
                    action_type=request.actionType or "explore",
                    brand_context=brand_description,
                    direction=request.direction,
                    edit_instructions=edit_instructions,
                    similarity=request.similarity if request.similarity is not None else request.explorationLevel
                )
                if delta_summary.get("delta"):
                    delta_candidates.append(delta_summary["delta"])

            posts.append({
                "id": f"post_{iteration}_{i}",
                "imageUrl": image_url,
                "keywords": analysis.get('keywords', [])[:8],
                "description": analysis.get('description', ''),
                "vibe": analysis.get('vibe', ''),
                "deltaFromParent": delta_summary.get("delta") if delta_summary else None,
                "deltaDetails": delta_summary,
                "metadata": {
                    "iteration": iteration,
                    "variant": i,
                    "vibe": analysis.get('vibe', ''),
                    "prompt_used": prompt_batch[i],
                    "exploration_level": exploration_level
                }
            })

        if request.actionType == "edit" and edit_instructions:
            batch_delta = f"Edited: {', '.join(edit_instructions[:2])}"
        elif request.direction:
            batch_delta = f'Explored "{request.direction}" direction'
        elif delta_candidates:
            batch_delta = delta_candidates[0]
        elif request.imagesFeedback:
            liked = sum(1 for f in request.imagesFeedback if f.get('feedback_type') == 'like')
            batch_delta = f"Based on feedback ({liked}/4 liked) | Exploration: {int(exploration_level * 100)}%"
        elif request.actionType == "regenerate":
            batch_delta = "Regenerated a fresh set of variations"

        return {
            "posts": posts,
            "delta": batch_delta,
            "iteration": iteration
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Image Editing ==============

class EditImageRequest(BaseModel):
    imageUrl: str
    suggestedEdits: List[str] = []
    customEdit: str = ""
    brandSummary: str

@app.post("/api/edit-image")
async def edit_image(request: EditImageRequest):
    """Edit an image based on user instructions"""
    try:
        # Combine all edit instructions
        edit_instructions = []
        if request.suggestedEdits:
            edit_instructions.extend(request.suggestedEdits)
        if request.customEdit:
            edit_instructions.append(request.customEdit)

        if not edit_instructions:
            raise HTTPException(status_code=400, detail="No edit instructions provided")

        # Create a refined prompt incorporating the edits
        edit_prompt = f"""Modify this marketing image with these changes:
{', '.join(edit_instructions)}

Brand: {request.brandSummary}
Keep the core concept but apply these specific edits."""

        # Generate new image with edits
        from image_generation_final import generate_image_async

        # Extract brand name
        brand_name = request.brandSummary.split('-')[0].strip() if '-' in request.brandSummary else "Brand"

        # Generate edited image
        edited_image = await generate_image_async(edit_prompt, brand_name, variance=30)  # Lower variance for edits

        # Analyze the edited image
        from image_generation_final import analyze_image
        analysis = analyze_image(edited_image, request.brandSummary)

        return {
            "imageUrl": edited_image,
            "keywords": analysis.get('keywords', []),
            "vibe": analysis.get('vibe', ''),
            "description": analysis.get('description', ''),
            "editApplied": edit_instructions
        }

    except Exception as e:
        print(f"Edit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Caption Generation ==============

class CaptionGenerationRequest(BaseModel):
    imageUrl: str
    brandSummary: str
    tone: List[str] = ["professional"]
    length: str = "medium"  # short, medium, long
    includeHashtags: bool = True
    includeEmojis: bool = False
    customDirection: str = ""

@app.post("/api/generate-captions")
async def generate_captions(request: CaptionGenerationRequest):
    """Generate captions for a social media post using GPT-4"""
    try:
        import openai
        from image_generation_final import analyze_image

        # First analyze the image to understand what's in it
        image_analysis = analyze_image(request.imageUrl, request.brandSummary)
        keywords = image_analysis.get('keywords', [])
        description = image_analysis.get('description', '')
        vibe = image_analysis.get('vibe', '')

        # Build the prompt for GPT-4
        tone_str = ', '.join(request.tone) if request.tone else 'professional'

        length_map = {
            'short': '1-2 lines (under 50 characters)',
            'medium': '3-4 lines (50-150 characters)',
            'long': '5+ lines (150-280 characters)'
        }
        length_instruction = length_map.get(request.length, length_map['medium'])

        prompt = f"""Generate 4 different Instagram captions for this marketing post.

Image description: {description}
Image vibe: {vibe}
Keywords from image: {', '.join(keywords)}
Brand: {request.brandSummary}

Requirements:
- Tone: {tone_str}
- Length: {length_instruction}
- Include hashtags: {request.includeHashtags}
- Include emojis: {request.includeEmojis}
- Custom direction: {request.customDirection if request.customDirection else 'None'}

Generate 4 unique captions that would work well for this specific image and brand.
Return as a JSON array of strings."""

        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=500,
            temperature=0.8
        )

        import json
        captions_data = json.loads(response.choices[0].message.content)

        # Extract captions array from various possible formats
        if isinstance(captions_data, dict):
            captions = captions_data.get('captions', [])
            if not captions:
                # Try other common keys
                captions = captions_data.get('results', captions_data.get('options', []))
        elif isinstance(captions_data, list):
            captions = captions_data
        else:
            captions = []

        # Fallback if GPT fails
        if not captions:
            brand_name = request.brandSummary.split('-')[0].strip() if '-' in request.brandSummary else "Brand"
            hashtag_list = [f"#{kw.replace(' ', '').replace('-', '')}" for kw in keywords[:3]]
            hashtags = ' '.join(hashtag_list) if request.includeHashtags else ''
            emoji = '✨' if request.includeEmojis else ''

            captions = [
                f"Discover something amazing today {emoji} {hashtags}".strip(),
                f"Your new favorite is here {emoji} #{brand_name} {hashtags}".strip(),
                f"Experience excellence like never before {emoji} {hashtags}".strip(),
                f"Join us on this journey {emoji} #{brand_name} {hashtags}".strip()
            ]

        return {
            "captions": captions[:4],  # Ensure we only return 4
            "imageAnalysis": {
                "keywords": keywords,
                "vibe": vibe,
                "description": description
            }
        }

    except Exception as e:
        print(f"Caption generation error: {e}")
        # Return fallback captions
        return {
            "captions": [
                "Transform your experience today ✨",
                "Discover what makes us different 🚀",
                "Your journey starts here 💫",
                "Excellence in every detail 🎯"
            ],
            "imageAnalysis": {
                "keywords": [],
                "vibe": "professional",
                "description": "Marketing content"
            }
        }

# ============== OLD Caption Generation (keeping for backward compatibility) ==============

@app.post("/api/generate-captions-old")
async def generate_captions_old(request: CaptionRequest):
    """Old caption generation endpoint for backward compatibility"""

    keywords = request.keywords
    tone = request.tone
    brand_name = request.brandInfo.get("name", "YourBrand") if request.brandInfo else "YourBrand"

    # Generate captions based on tone
    caption_templates = {
        "casual": [
            f"Just dropped something special for you! 🎉 #{brand_name}",
            f"Vibes on point today ✨ Check this out! #{brand_name}",
            f"Your daily dose of awesome 💫 #{brand_name}",
            f"Can't keep calm about this one! 🔥 #{brand_name}"
        ],
        "professional": [
            f"Introducing our latest innovation. Learn more at {brand_name}.",
            f"Excellence meets innovation. Discover what's new at {brand_name}.",
            f"Setting new standards in the industry. #{brand_name}",
            f"Transforming the way you work. Experience {brand_name}."
        ],
        "playful": [
            f"Plot twist: This is amazing! 🎨 #{brand_name}",
            f"Warning: May cause extreme happiness! 😄 #{brand_name}",
            f"Spoiler alert: You're going to love this! 🌈 #{brand_name}",
            f"Breaking: Fun levels off the charts! 🚀 #{brand_name}"
        ]
    }

    base_captions = caption_templates.get(tone, caption_templates["casual"])

    # Add keyword-based hashtags
    hashtags = [f"#{kw.replace(' ', '').replace('-', '')}" for kw in keywords[:3]]

    captions = []
    for i, base in enumerate(base_captions):
        caption = base
        if i < 2:  # Add hashtags to first two captions
            caption += " " + " ".join(hashtags)

        captions.append({
            "text": caption,
            "tone": tone,
            "hashtags": hashtags if i < 2 else [],
            "length": len(caption)
        })

    return {
        "captions": captions,
        "recommendedIndex": 0
    }

# ============== Persona Summarization ==============

@app.post("/api/summarize-persona")
async def summarize_persona(history: Dict):
    """Summarize persona preferences from exploration history"""

    nodes = history.get("nodes", {})
    edges = history.get("edges", [])

    if not nodes:
        return {
            "summary": "No exploration history yet",
            "preferences": [],
            "patterns": []
        }

    # Analyze the history
    keywords_frequency = {}
    directions_used = []

    for node_id, node_data in nodes.items():
        if "posts" in node_data:
            for post in node_data["posts"]:
                for keyword in post.get("keywords", []):
                    keywords_frequency[keyword] = keywords_frequency.get(keyword, 0) + 1

    for edge in edges:
        if "data" in edge and "direction" in edge["data"]:
            directions_used.append(edge["data"]["direction"])

    # Sort keywords by frequency
    top_keywords = sorted(keywords_frequency.items(), key=lambda x: x[1], reverse=True)[:5]

    # Generate summary
    preferences = [keyword for keyword, _ in top_keywords]
    patterns = list(set(directions_used))[:3] if directions_used else ["exploratory"]

    summary = f"Your style leans toward {', '.join(preferences[:3]) if preferences else 'varied content'}. "
    summary += f"You tend to explore {', '.join(patterns) if patterns else 'different directions'}."

    return {
        "summary": summary,
        "preferences": preferences,
        "patterns": patterns,
        "topKeywords": dict(top_keywords),
        "explorationCount": len(nodes),
        "directionCount": len(set(directions_used))
    }

# ============== Health Check ==============

@app.get("/")
async def root():
    return {"message": "TacitSNS API - Local Development", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ============== Run Server ==============

if __name__ == "__main__":
    uvicorn.run("main_simple:app", host="0.0.0.0", port=8001, reload=True)
