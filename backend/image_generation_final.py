"""
Image Generation using Gemini/nanobannan
Similar to logo generation but for marketing posts
"""

import os
import json
import base64
import io
import asyncio
from typing import Any, List, Dict, Optional
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv
from services.gemini_service import GeminiImageGenerator
import openai
import requests

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

async def generate_post_with_gemini(
    prompt: str,
    brand_name: str,
    variance: int = 70,
    reference_image: Optional[str] = None
) -> str:
    """Generate a marketing post image using Gemini API - returns base64"""
    try:
        gemini = GeminiImageGenerator()

        # Enhance prompt for marketing post generation
        enhanced_prompt = f"""Create a professional marketing social media post for {brand_name}.
{prompt}

IMPORTANT: This must be a high-quality marketing image with:
- Professional composition suitable for social media
- Clear visual hierarchy and appeal
- Modern aesthetic that engages viewers
- Instagram-ready square format (1080x1080)
- Clean, polished look

Style variance level: {variance}% (0=conservative, 100=creative)"""

        if reference_image:
            enhanced_prompt += """

Use the provided reference image as the visual anchor.
- Preserve the main subject, composition, and brand-relevant structure unless the prompt explicitly requests a change
- Apply the requested variation as a believable evolution of that image
"""

        # Generate the image using Gemini service
        base64_image = await gemini.generate_image(
            enhanced_prompt,
            reference_image=reference_image
        )

        if base64_image and base64_image.startswith('data:image'):
            return base64_image
        else:
            # If Gemini returns a URL instead of base64, convert it
            if base64_image.startswith('http'):
                img_response = requests.get(base64_image)
                img_base64 = base64.b64encode(img_response.content).decode()
                return f"data:image/png;base64,{img_base64}"
            raise Exception("Invalid image data received from Gemini")

    except Exception as e:
        print(f"Gemini post generation error: {str(e)}")
        # Fallback to placeholder if Gemini fails
        return generate_placeholder_post(brand_name, 0)

def generate_placeholder_post(brand_name: str, index: int) -> str:
    """Generate a placeholder post as base64 encoded image"""
    width, height = 800, 800
    colors = [
        (99, 102, 241),   # Indigo
        (59, 130, 246),   # Blue
        (139, 92, 246),   # Purple
        (236, 72, 153),   # Pink
    ]

    # Create image
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Draw background
    bg_color = colors[index % len(colors)]
    draw.rectangle([0, 0, width, height], fill=bg_color)

    # Add text
    text = f"{brand_name}\nMarketing Post"
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    except:
        font = ImageFont.load_default()

    # Draw text
    draw.text((width//2 - 100, height//2 - 50), text, fill='white', font=font)

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()

    return f"data:image/png;base64,{img_str}"

def generate_image_prompts(
    brand_description: str,
    images_feedback: Optional[List[Dict]] = None,
    exploration_level: float = 1.0
) -> List[str]:
    """
    Generate prompts for 4 marketing posts
    """

    # Direct brand description - no added concepts
    base = f"Marketing post for: {brand_description}"

    if not images_feedback:
        # Initial generation - 4 variations
        # Let Gemini create natural variations
        return [
            f"{base}\nVariation 1: Focus on product/service features",
            f"{base}\nVariation 2: Focus on customer benefits",
            f"{base}\nVariation 3: Focus on brand story",
            f"{base}\nVariation 4: Focus on lifestyle/aspirational"
        ]

    # With feedback - adjust based on exploration level
    liked = []
    disliked = []

    for feedback in images_feedback:
        if feedback.get('feedback_type') == 'like':
            liked.extend(feedback.get('reasons', []))
        elif feedback.get('feedback_type') == 'dislike':
            disliked.extend(feedback.get('reasons', []))

    # Create prompts based on feedback
    if exploration_level < 0.3:
        # Low exploration - refine what worked
        focus = ', '.join(liked[:3]) if liked else "refined style"
        return [
            f"{base}\nRefinement focusing on {focus}",
            f"{base}\nVariation emphasizing {focus}",
            f"{base}\nPolished version with {focus}",
            f"{base}\nEnhanced approach featuring {focus}"
        ]
    elif exploration_level < 0.7:
        # Medium exploration - mix elements
        return [
            f"{base}\nOriginal approach",
            f"{base}\nIncorporating {liked[0] if liked else 'new elements'}",
            f"{base}\nFresh perspective",
            f"{base}\nAvoiding {disliked[0] if disliked else 'previous issues'}"
        ]
    else:
        # High exploration - bold new directions
        avoid_text = f"avoiding {', '.join(disliked[:2])}" if disliked else "new creative direction"
        return [
            f"{base}\nCompletely new artistic approach, {avoid_text}",
            f"{base}\nExperimental style, {avoid_text}",
            f"{base}\nUnconventional creative direction, {avoid_text}",
            f"{base}\nBold innovative concept, {avoid_text}"
        ]

async def generate_image_async(
    prompt: str,
    brand_name: str,
    variance: int = 70,
    reference_image: Optional[str] = None
) -> str:
    """Async wrapper for image generation"""
    return await generate_post_with_gemini(
        prompt,
        brand_name,
        variance,
        reference_image=reference_image
    )

def generate_image(prompt: str) -> str:
    """Synchronous wrapper for compatibility with existing code"""
    # Extract brand name from prompt if possible
    brand_name = "Brand"
    if "Marketing post for:" in prompt:
        parts = prompt.split("Marketing post for:")
        if len(parts) > 1:
            brand_name = parts[1].split('\n')[0].strip()

    # Since we're already in an async context (FastAPI), use nest_asyncio
    import nest_asyncio
    import asyncio

    nest_asyncio.apply()

    loop = asyncio.get_event_loop()
    return loop.run_until_complete(generate_image_async(prompt, brand_name))

def _create_openai_client():
    return openai.OpenAI()


def _fallback_delta_summary(
    action_type: Optional[str],
    direction: Optional[str],
    edit_instructions: Optional[List[str]],
    similarity: Optional[float]
) -> Dict[str, Any]:
    if edit_instructions:
        summary = f"Edited: {', '.join(edit_instructions[:2])}"
    elif direction:
        summary = f'Explored "{direction}" direction'
    elif action_type == "regenerate":
        summary = "Regenerated with a refreshed composition"
    elif action_type == "explore":
        if similarity is not None:
            summary = f"Explored variations at {int(similarity)}% similarity"
        else:
            summary = "Explored new visual variations"
    else:
        summary = "Refined the previous concept"

    return {
        "delta": summary,
        "visible_changes": [],
        "continuity": "Keeps the same overall concept"
    }


def analyze_image(image_data: str, brand_context: str = "") -> Dict:
    """
    Analyze generated image using GPT Vision
    Extract keywords from actual image content
    """
    try:
        client = _create_openai_client()

        # Handle both base64 and URL images
        if image_data.startswith('data:image'):
            image_url = image_data
        else:
            # Assume it's a URL
            image_url = image_data

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Analyze this marketing image. Extract what you see.
Return JSON:
- keywords: 8-10 words describing visual elements
- description: 20-30 word description
- vibe: one word feeling
Context: {brand_context}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=200
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Analysis error: {e}")
        return {
            "keywords": ["marketing", "visual", "content", "social", "media"],
            "description": "Marketing visual content for social media",
            "vibe": "professional"
        }


def summarize_image_delta(
    parent_image: str,
    child_image: str,
    action_type: str,
    brand_context: str = "",
    direction: Optional[str] = None,
    edit_instructions: Optional[List[str]] = None,
    similarity: Optional[float] = None
) -> Dict[str, Any]:
    """Compare two images with vision and summarize the visible delta."""
    if not parent_image or not child_image:
        return _fallback_delta_summary(action_type, direction, edit_instructions, similarity)

    try:
        client = _create_openai_client()
        edit_instruction_text = ", ".join(edit_instructions or []) or "None provided"

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Compare these two marketing images.

The first image is the parent/reference.
The second image is the newly generated result.

Task:
- Focus only on visible changes between the two images
- Ignore imagined intent that is not actually visible
- Keep the main delta short and specific
- Mention what stayed consistent in the continuity field

Context:
- Action type: {action_type}
- Brand context: {brand_context or "N/A"}
- Exploration direction: {direction or "N/A"}
- Requested edits: {edit_instruction_text}
- Similarity target: {similarity if similarity is not None else "N/A"}

Return JSON with:
- delta: short sentence, max 18 words
- visible_changes: array of up to 3 brief bullets
- continuity: short sentence
"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": parent_image}
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": child_image}
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=250
        )

        payload = json.loads(response.choices[0].message.content)
        delta = payload.get("delta", "").strip()

        if not delta:
            return _fallback_delta_summary(action_type, direction, edit_instructions, similarity)

        return {
            "delta": delta,
            "visible_changes": payload.get("visible_changes", [])[:3],
            "continuity": payload.get("continuity", "").strip()
        }
    except Exception as e:
        print(f"Delta analysis error: {e}")
        return _fallback_delta_summary(action_type, direction, edit_instructions, similarity)
