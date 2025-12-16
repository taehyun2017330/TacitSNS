import os
import google.generativeai as genai
from typing import List, Dict
import uuid
import httpx
import base64
from services.storage_service import storage_service

# Configure Gemini API
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

class GeminiImageGenerator:
    """Service for generating images using Google's Gemini API"""

    def __init__(self):
        # Use the text generation model directly via REST API to avoid SDK version issues
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.image_generation_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent"
        self.text_generation_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    def generate_image_prompt(
        self,
        mood: str,
        colors: List[str],
        imagery: str,
        brand_name: str = "your brand"
    ) -> str:
        """
        Generate a detailed image prompt based on theme parameters

        Args:
            mood: The mood/aesthetic (e.g., Professional, Playful, Elegant)
            colors: List of hex color codes
            imagery: Imagery style (e.g., Product-focused, Lifestyle, Flat lay)
            brand_name: Name of the brand

        Returns:
            A detailed prompt for image generation
        """
        # Convert hex colors to color names for better prompt
        color_descriptions = ", ".join(colors)

        prompt = f"""Create a high-quality, professional social media post image for {brand_name}.

Style Requirements:
- Mood/Aesthetic: {mood}
- Visual Style: {imagery}
- Color Palette: Use these colors prominently - {color_descriptions}
- Format: Instagram post (square, 1080x1080)
- Professional quality with clean composition
- Eye-catching and engaging for social media

The image should feel {mood.lower()}, incorporate {imagery.lower()} style photography,
and use the specified color palette to create a cohesive brand aesthetic.
Make it suitable for a professional social media marketing campaign."""

        return prompt

    async def generate_image(
        self,
        prompt: str
    ) -> str:
        """
        Generate an image using Gemini REST API

        Args:
            prompt: The image generation prompt

        Returns:
            Base64 data URL of the generated image (data:image/png;base64,...)
        """
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.image_generation_url,
                    headers={
                        'Content-Type': 'application/json',
                        'x-goog-api-key': self.api_key,
                    },
                    json={
                        'contents': [
                            {
                                'parts': [
                                    {
                                        'text': prompt
                                    }
                                ]
                            }
                        ]
                    }
                )

                if not response.is_success:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', response.text)
                    raise Exception(f"Gemini API error: {response.status_code} - {error_msg}")

                data = response.json()

                # Check for inline_data (image) in the response
                response_parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])

                if not response_parts:
                    raise Exception('No content generated from Gemini')

                # Look for inline image data (handle both snake_case and camelCase)
                for part in response_parts:
                    # REST API uses snake_case (inline_data), SDK uses camelCase (inlineData)
                    inline_data = part.get('inline_data') or part.get('inlineData')

                    if inline_data:
                        # Handle both mime_type (REST) and mimeType (SDK)
                        mime_type = inline_data.get('mime_type') or inline_data.get('mimeType') or 'image/png'
                        base64_data = inline_data.get('data')

                        if not base64_data:
                            raise Exception('Image data is empty in response')

                        print(f"✅ Received image data ({mime_type}), {len(base64_data)} bytes")
                        return f"data:{mime_type};base64,{base64_data}"

                # Fallback: if no image, check for text response
                if response_parts and response_parts[0].get('text'):
                    text_response = response_parts[0].get('text')
                    print(f'Gemini returned text instead of image. Response: {text_response}')
                    raise Exception('Gemini image generation not available. The model returned text instead of an image.')

                raise Exception('No image data found in Gemini response')

        except httpx.TimeoutException:
            raise Exception('Image generation request timed out. Please try again.')
        except Exception as e:
            print(f"Error generating image: {e}")
            raise

    async def generate_caption(
        self,
        theme_name: str,
        mood: str,
        tone: str,
        caption_length: str,
        use_emojis: bool,
        use_hashtags: bool,
        brand_name: str = "your brand"
    ) -> Dict[str, any]:
        """
        Generate a caption using Gemini based on theme parameters

        Args:
            theme_name: Name of the theme
            mood: Visual mood
            tone: Caption tone (Professional, Casual, etc.)
            caption_length: short, medium, or long
            use_emojis: Whether to include emojis
            use_hashtags: Whether to include hashtags
            brand_name: Name of the brand

        Returns:
            Dict with caption and hashtags
        """
        length_guide = {
            'short': '1-2 sentences (under 50 words)',
            'medium': '2-3 sentences (50-100 words)',
            'long': '3-5 sentences (100-150 words)'
        }

        prompt = f"""Write an engaging Instagram caption for {brand_name}.

Theme: {theme_name}
Tone: {tone}
Mood: {mood}
Length: {length_guide.get(caption_length, 'medium')}
{'Include relevant emojis naturally throughout the text.' if use_emojis else 'Do not use any emojis.'}
{'Include 3-5 relevant hashtags at the end.' if use_hashtags else 'Do not include hashtags.'}

The caption should be {tone.lower()}, engaging, and suitable for a {mood.lower()} post.
Make it authentic and brand-appropriate."""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.text_generation_url,
                    headers={
                        'Content-Type': 'application/json',
                        'x-goog-api-key': self.api_key,
                    },
                    json={
                        'contents': [
                            {
                                'parts': [
                                    {
                                        'text': prompt
                                    }
                                ]
                            }
                        ]
                    }
                )

                if not response.is_success:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', response.text)
                    raise Exception(f"Gemini API error: {response.status_code} - {error_msg}")

                data = response.json()
                response_parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])

                if not response_parts or not response_parts[0].get('text'):
                    raise Exception('No text generated from Gemini')

                caption_text = response_parts[0]['text'].strip()

                # Extract hashtags if present
                hashtags = []
                if use_hashtags and '#' in caption_text:
                    # Find all hashtags in the caption
                    words = caption_text.split()
                    hashtags = [word.strip('.,!?') for word in words if word.startswith('#')]
                    # Remove hashtags from caption text for separate storage
                    for tag in hashtags:
                        caption_text = caption_text.replace(tag, '').strip()

                return {
                    'caption': caption_text,
                    'hashtags': hashtags
                }
        except Exception as e:
            print(f"Error generating caption: {e}")
            # Fallback caption
            return {
                'caption': f"Check out our latest {theme_name}! ✨",
                'hashtags': ['#brand', '#social', '#marketing'] if use_hashtags else []
            }

    async def generate_posts(
        self,
        theme_id: str,
        theme_name: str,
        posts_count: int,
        mood: str,
        colors: List[str],
        imagery: str,
        tone: str,
        caption_length: str,
        use_emojis: bool,
        use_hashtags: bool,
        brand_name: str = "your brand"
    ) -> List[Dict]:
        """
        Generate multiple social media posts with images and captions

        Args:
            theme_id: ID of the theme
            theme_name: Name of the theme
            posts_count: Number of posts to generate
            mood: Visual mood
            colors: List of color hex codes
            imagery: Imagery style
            tone: Caption tone
            caption_length: short, medium, or long
            use_emojis: Include emojis in captions
            use_hashtags: Include hashtags in captions
            brand_name: Name of the brand

        Returns:
            List of post objects with images and captions
        """
        posts = []
        post_types = [
            'Functional', 'Brand resonance', 'Emotional', 'Educational',
            'Experiential', 'Current events', 'Personal', 'Employee',
            'Community', 'Customer story', 'Cause', 'Sales'
        ]

        # Generate the base image prompt
        base_image_prompt = self.generate_image_prompt(
            mood=mood,
            colors=colors,
            imagery=imagery,
            brand_name=brand_name
        )

        for i in range(posts_count):
            print(f"Generating post {i + 1}/{posts_count}...")

            # Generate caption using Gemini
            caption_data = await self.generate_caption(
                theme_name=theme_name,
                mood=mood,
                tone=tone,
                caption_length=caption_length,
                use_emojis=use_emojis,
                use_hashtags=use_hashtags,
                brand_name=brand_name
            )

            # Generate image using Gemini REST API
            try:
                # Add variation to each image prompt
                variation_prompt = f"{base_image_prompt}\n\nVariation {i + 1}: Create a unique composition."
                base64_image = await self.generate_image(variation_prompt)
                print(f"✅ Image {i + 1} generated successfully")

                # Upload to Firebase Storage
                try:
                    image_filename = f"{theme_id}_{uuid.uuid4()}.png"
                    image_url = storage_service.upload_base64_image(
                        base64_data=base64_image,
                        folder="generated_images",
                        filename=image_filename
                    )
                    print(f"✅ Image {i + 1} uploaded to Firebase Storage")
                except Exception as upload_error:
                    print(f"⚠️ Failed to upload image {i + 1} to Firebase: {upload_error}")
                    # Use base64 as fallback
                    image_url = base64_image
            except Exception as e:
                print(f"⚠️ Failed to generate image {i + 1}: {e}")
                # Fallback to placeholder if image generation fails
                image_url = f"https://images.unsplash.com/photo-{1600000000000 + i}?w=1080"

            post = {
                'id': str(uuid.uuid4()),
                'theme_id': theme_id,
                'image_url': image_url,
                'caption': caption_data['caption'],
                'hashtags': caption_data['hashtags'],
                'post_type': post_types[i % len(post_types)],
                'selected': False,
                'scheduled_time': None,
                'status': 'draft'
            }

            posts.append(post)

        return posts


# Create a singleton instance
gemini_generator = GeminiImageGenerator()
