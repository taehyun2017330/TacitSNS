import asyncio
import base64
import io
import os
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

from services.gemini_service import GeminiImageGenerator

load_dotenv()


async def generate_post_with_gemini(
    prompt: str,
    brand_name: str,
    variance: int = 70,
    reference_image: Optional[str] = None,
    reference_mode: str = "balanced",
) -> str:
    """Generate a marketing post image using Gemini API - returns base64"""
    try:
        gemini = GeminiImageGenerator()

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
            if reference_mode == "strict":
                enhanced_prompt += """

Use the provided reference image as the visual anchor.
- Preserve the main subject, composition, and brand-relevant structure unless the prompt explicitly requests a change
- Apply the requested variation as a believable evolution of that image
"""
            elif reference_mode == "loose":
                enhanced_prompt += """

Use the provided reference image only as loose visual context.
- Keep the brand-relevant DNA and subject logic
- Do not copy the exact crop, composition, pose, or styling
- Make this feel like a genuinely different candidate, not a near-duplicate
"""
            else:
                enhanced_prompt += """

Use the provided reference image as a starting point, not a template.
- Keep the core concept and brand-relevant subject matter
- Change the composition, framing, styling, and emphasis enough for this to feel like a new option
"""

        base64_image = await gemini.generate_image(
            enhanced_prompt,
            reference_image=reference_image
        )

        if base64_image and base64_image.startswith('data:image'):
            return base64_image

        if base64_image.startswith('http'):
            img_response = requests.get(base64_image)
            img_base64 = base64.b64encode(img_response.content).decode()
            return f"data:image/png;base64,{img_base64}"

        raise Exception("Invalid image data received from Gemini")
    except Exception as e:
        print(f"Gemini post generation error: {str(e)}")
        return generate_placeholder_post(brand_name, 0)


def generate_placeholder_post(brand_name: str, index: int) -> str:
    """Generate a placeholder post as base64 encoded image"""
    width, height = 800, 800
    colors = [
        (99, 102, 241),
        (59, 130, 246),
        (139, 92, 246),
        (236, 72, 153),
    ]

    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    bg_color = colors[index % len(colors)]
    draw.rectangle([0, 0, width, height], fill=bg_color)

    text = f"{brand_name}\nMarketing Post"
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    except Exception:
        font = ImageFont.load_default()

    draw.text((width // 2 - 100, height // 2 - 50), text, fill='white', font=font)

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()

    return f"data:image/png;base64,{img_str}"


def generate_image_prompts(
    brand_description: str,
    images_feedback: Optional[List[Dict]] = None,
    exploration_level: float = 1.0,
    direction_angles: Optional[List[str]] = None,
    clarification_context: Optional[Dict] = None,
) -> List[str]:
    base = f"Marketing post for: {brand_description}"
    clarification_guidance = ""
    if clarification_context:
        active_insights = clarification_context.get("activeInsights", [])
        recent_records = clarification_context.get("recentRecords", [])
        insight_lines = [
            insight.get("summary", "").strip()
            for insight in active_insights[:4]
            if insight.get("summary", "").strip()
        ]
        recent_lines = [
            record.get("summary", "").strip()
            for record in recent_records[:2]
            if record.get("summary", "").strip()
        ]
        guidance_parts = []
        if insight_lines:
            guidance_parts.append(
                f"Clarified preferences: {' | '.join(insight_lines)}"
            )
        if recent_lines:
            guidance_parts.append(
                f"Recent clarification: {' | '.join(recent_lines)}"
            )
        if guidance_parts:
            clarification_guidance = "\n" + "\n".join(guidance_parts)

    if direction_angles:
        feedback_summary = ""
        if images_feedback:
            liked: List[str] = []
            disliked: List[str] = []
            unsure: List[str] = []
            liked_summaries: List[str] = []
            disliked_summaries: List[str] = []
            unsure_summaries: List[str] = []
            open_questions: List[str] = []
            for feedback in images_feedback:
                reasons = [
                    value
                    for value in [
                        str(feedback.get('primary_reason', '')).strip(),
                        str(feedback.get('micro_summary', '')).strip(),
                    ]
                    if value
                ]
                image_summary = str(feedback.get('image_summary', '')).strip()
                if feedback.get('feedback_type') == 'like':
                    liked.extend(reasons)
                    if image_summary:
                        liked_summaries.append(image_summary)
                elif feedback.get('feedback_type') == 'dislike':
                    disliked.extend(reasons)
                    if image_summary:
                        disliked_summaries.append(image_summary)
                elif feedback.get('feedback_type') == 'unsure':
                    unsure.extend(reasons)
                    if image_summary:
                        unsure_summaries.append(image_summary)
                if feedback.get('step_status') == 'unresolved':
                    open_question = str(feedback.get('primary_reason') or feedback.get('custom_note') or '').strip()
                    if open_question:
                        open_questions.append(open_question)

            feedback_parts = []
            if liked:
                feedback_parts.append(f"Keep or amplify: {', '.join(liked[:4])}")
            if liked_summaries:
                feedback_parts.append(f"Liked image cues: {' | '.join(liked_summaries[:2])}")
            if disliked:
                feedback_parts.append(f"Avoid or reduce: {', '.join(disliked[:4])}")
            if disliked_summaries:
                feedback_parts.append(f"Disliked image cues: {' | '.join(disliked_summaries[:2])}")
            if unsure:
                feedback_parts.append(f"Resolve uncertainty around: {', '.join(unsure[:3])}")
            if unsure_summaries:
                feedback_parts.append(f"Unclear image cues: {' | '.join(unsure_summaries[:2])}")
            if open_questions:
                feedback_parts.append(f"Open tradeoffs to keep in play: {' | '.join(open_questions[:2])}")
            if feedback_parts:
                feedback_summary = "\nFeedback guidance: " + " | ".join(feedback_parts)

        return [
            f"{base}\nDirection angle {index + 1}: {angle}\nCreate one distinct Instagram-ready post concept around this angle.{feedback_summary}{clarification_guidance}"
            for index, angle in enumerate(direction_angles[:4])
        ]

    if not images_feedback:
        return [
            f"{base}\nVariation 1: Focus on product/service features{clarification_guidance}",
            f"{base}\nVariation 2: Focus on customer benefits{clarification_guidance}",
            f"{base}\nVariation 3: Focus on brand story{clarification_guidance}",
            f"{base}\nVariation 4: Focus on lifestyle/aspirational{clarification_guidance}"
        ]

    liked: List[str] = []
    disliked: List[str] = []

    for feedback in images_feedback:
        if feedback.get('feedback_type') == 'like':
            for value in [feedback.get('primary_reason'), feedback.get('micro_summary')]:
                if value:
                    liked.append(str(value))
        elif feedback.get('feedback_type') == 'dislike':
            for value in [feedback.get('primary_reason'), feedback.get('micro_summary')]:
                if value:
                    disliked.append(str(value))

    if exploration_level < 0.3:
        focus = ', '.join(liked[:3]) if liked else "refined style"
        return [
            f"{base}\nRefinement focusing on {focus}{clarification_guidance}",
            f"{base}\nVariation emphasizing {focus}{clarification_guidance}",
            f"{base}\nPolished version with {focus}{clarification_guidance}",
            f"{base}\nEnhanced approach featuring {focus}{clarification_guidance}"
        ]
    if exploration_level < 0.7:
        return [
            f"{base}\nOriginal approach{clarification_guidance}",
            f"{base}\nIncorporating {liked[0] if liked else 'new elements'}{clarification_guidance}",
            f"{base}\nFresh perspective{clarification_guidance}",
            f"{base}\nAvoiding {disliked[0] if disliked else 'previous issues'}{clarification_guidance}"
        ]

    avoid_text = f"avoiding {', '.join(disliked[:2])}" if disliked else "new creative direction"
    return [
        f"{base}\nCompletely new artistic approach, {avoid_text}{clarification_guidance}",
        f"{base}\nExperimental style, {avoid_text}{clarification_guidance}",
        f"{base}\nUnconventional creative direction, {avoid_text}{clarification_guidance}",
        f"{base}\nBold innovative concept, {avoid_text}{clarification_guidance}"
    ]


async def generate_image_async(
    prompt: str,
    brand_name: str,
    variance: int = 70,
    reference_image: Optional[str] = None,
    reference_mode: str = "balanced",
) -> str:
    return await generate_post_with_gemini(
        prompt,
        brand_name,
        variance,
        reference_image=reference_image,
        reference_mode=reference_mode
    )


def generate_image(prompt: str) -> str:
    brand_name = "Brand"
    if "Marketing post for:" in prompt:
        parts = prompt.split("Marketing post for:")
        if len(parts) > 1:
            brand_name = parts[1].split('\n')[0].strip()

    import nest_asyncio

    nest_asyncio.apply()
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(generate_image_async(prompt, brand_name))
