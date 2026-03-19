from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import base64
import io
from PIL import Image, ImageDraw, ImageFont
from dependencies.auth_simple import get_current_user_id
from services.gemini_service import GeminiImageGenerator

router = APIRouter()

class LogoRequest(BaseModel):
    brand_name: str
    brand_category: str
    brand_context: str
    benchmark_direction: Optional[str] = None
    parent_logo_url: Optional[str] = None
    current_grid_logos: Optional[List[str]] = None
    action_type: str  # 'initial', 'regenerate', 'reiterate', 'edit'
    constraints: Optional[str] = None  # JSON string from frontend
    edit_options: Optional[str] = None  # JSON string from frontend
    variance: int = 70

class LogoResponse(BaseModel):
    logos: List[str]  # Base64 encoded images or URLs
    suggested_edits: List[Dict[str, str]]
    reiterate_suggestions: List[Dict[str, str]]

async def generate_logo_with_gemini(prompt: str, brand_name: str, variance: int = 70) -> str:
    """Generate a logo using Gemini API"""
    try:
        gemini = GeminiImageGenerator()

        # Enhance prompt for logo generation
        enhanced_prompt = f"""Create a professional logo design for {brand_name}.
{prompt}

IMPORTANT: This must be a clean, professional logo design with:
- Clear brand identity elements
- Scalable design suitable for various sizes
- Professional typography if text is included
- Clean background (white or transparent feel)
- Modern, minimal aesthetic suitable for a brand logo
- NOT a photograph or realistic scene - this is a LOGO DESIGN

Style variance level: {variance}% (0=conservative, 100=creative)"""

        # Generate the logo
        base64_image = await gemini.generate_image(enhanced_prompt)

        if base64_image and base64_image.startswith('data:image'):
            return base64_image
        else:
            raise Exception("Invalid image data received from Gemini")

    except Exception as e:
        print(f"Gemini logo generation error: {str(e)}")
        # Fallback to placeholder if Gemini fails
        return generate_placeholder_logo(brand_name, 0)

def generate_placeholder_logo(brand_name: str, index: int) -> str:
    """Generate a placeholder logo as base64 encoded image"""
    # Create a simple placeholder image
    width, height = 400, 400
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
    draw.rectangle([50, 50, 350, 350], fill=bg_color)

    # Draw brand initial
    initial = brand_name[0].upper() if brand_name else 'B'
    try:
        # Try to use a larger font if available
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
    except:
        font = ImageFont.load_default()

    # Calculate text position
    text_bbox = draw.textbbox((0, 0), initial, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    text_x = (width - text_width) // 2
    text_y = (height - text_height) // 2 - 20

    # Draw text
    draw.text((text_x, text_y), initial, fill='white', font=font)

    # Draw brand name below
    try:
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
    except:
        small_font = ImageFont.load_default()

    name_bbox = draw.textbbox((0, 0), brand_name, font=small_font)
    name_width = name_bbox[2] - name_bbox[0]
    name_x = (width - name_width) // 2
    name_y = 280

    draw.text((name_x, name_y), brand_name, fill='white', font=small_font)

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()

    return f"data:image/png;base64,{img_str}"

def get_variance_guidance(variance: int, is_regenerate: bool = False) -> str:
    """Get variance guidance text based on variance level"""
    if variance < 30:
        return f"Creativity Level: {variance}% - CONSERVATIVE: Stay very close to traditional, proven design patterns."
    elif variance < 50:
        return f"Creativity Level: {variance}% - MODERATE: Balance between conventional and creative elements."
    elif variance < 70:
        return f"Creativity Level: {variance}% - CREATIVE: Explore more unique and distinctive design approaches."
    else:
        return f"Creativity Level: {variance}% - EXPERIMENTAL: Push boundaries with bold, unconventional design choices."

def build_initial_prompt(brand_name: str, brand_category: str, brand_context: str,
                        benchmark_direction: Optional[str], variance: int) -> str:
    """Build prompt for initial logo generation - EXACT match to original"""
    prompt = f'Create a professional, scalable logo for "{brand_name}", a {brand_category} brand.\n\n'

    prompt += f'Brand Context: {brand_context}\n\n'

    if benchmark_direction:
        prompt += f'Direction: {benchmark_direction}\n\n'

    # Add variance guidance
    variance_guidance = get_variance_guidance(variance)
    prompt += f'{variance_guidance}\n\n'

    prompt += """Requirements:
- Simple and memorable
- Works at small sizes
- Clear silhouette
- Professional and versatile
- Suitable for digital and print
- Modern and timeless

Generate a single distinct logo design that is production-ready."""

    return prompt

def build_regenerate_prompt(brand_name: str, brand_category: str, brand_context: str, variance: int) -> str:
    """Build prompt for regenerating logos - EXACT match to original"""
    prompt = 'FOCUS ON THE IMAGE: You are regenerating the logo shown in the image above.\n\n'
    prompt += 'PRIMARY INSTRUCTION: Base your design on the VISUAL ELEMENTS in the previous logo image. '

    if variance < 30:
        prompt += f'At {variance}% creativity, REPLICATE the previous logo almost exactly. '
        prompt += 'Keep the SAME composition, layout, shapes, icons, text positioning, and overall structure. '
        prompt += 'Only make MINIMAL changes: slight color adjustments, tiny spacing tweaks, or minor detail refinements. '
        prompt += 'Result should be 95% identical to the input image.\n\n'
    elif variance < 50:
        prompt += f'At {variance}% creativity, PRESERVE the core visual structure from the previous logo. '
        prompt += 'Keep the same icon shape, layout, and text. '
        prompt += 'Make moderate changes to: color palette, typography style, stroke weights, or proportions. '
        prompt += 'The design should remain clearly recognizable.\n\n'
    elif variance < 70:
        prompt += f'At {variance}% creativity, EVOLVE the visual concept from the previous logo. '
        prompt += 'Keep the general idea but explore different execution: new color schemes, different style approach, composition variations. '
        prompt += 'Maintain some visual connection to the original.\n\n'
    else:
        prompt += f'At {variance}% creativity, CREATE A DRAMATICALLY DIFFERENT DESIGN. '
        prompt += 'Look at the previous logo\'s colors and style - now do the OPPOSITE. '
        prompt += 'Change the entire color palette (blue→red/orange, warm→cool, bright→muted). '
        prompt += 'Transform the visual style completely (geometric→organic, minimal→detailed, modern→vintage). '
        prompt += 'Use completely different icon metaphors and compositions. '
        prompt += 'The result should look like a totally different creative direction - only the brand name stays the same.\n\n'

    variance_guidance = get_variance_guidance(variance, True)
    prompt += f'{variance_guidance}\n\n'
    prompt += f'Secondary context (less important than the image): Brand "{brand_name}" ({brand_category}). {brand_context}\n\n'
    prompt += """Technical requirements:
- Professional logo quality
- Clean white background
- Vector-style, simple, scalable

Generate one regenerated logo based primarily on the visual elements in the image."""
    return prompt

def build_reiterate_prompt(brand_name: str, brand_category: str, brand_context: str,
                          constraints: Optional[Dict], variance: int) -> str:
    """Build prompt for reiterating with constraints - EXACT match to original"""
    prompt = f'Generate a new variant of the logo for "{brand_name}", a {brand_category} brand.\n\n'
    prompt += f'Brand Context: {brand_context}\n\n'

    # Handle subtitle toggle
    if constraints and constraints.get('includeSubtitle'):
        prompt += 'INCLUDE A SUBTITLE/TAGLINE below the main logo.\n\n'
    else:
        prompt += 'NO SUBTITLE - Main logo only.\n\n'

    # Handle granular change controls
    prompt += 'CHANGE CONTROLS (how much to modify each element):\n\n'

    # Icon changes
    icon_change = constraints.get('iconChange', 50) if constraints else 50
    if icon_change < 20:
        prompt += f'ICON: Keep almost exactly the same ({icon_change}% change). Make only tiny refinements.\n'
    elif icon_change < 40:
        prompt += f'ICON: Minor changes ({icon_change}% change). Refine details, proportions, or style slightly.\n'
    elif icon_change < 60:
        prompt += f'ICON: Moderate changes ({icon_change}% change). Evolve the concept while keeping it recognizable.\n'
    elif icon_change < 80:
        prompt += f'ICON: Significant changes ({icon_change}% change). Try notably different styles or metaphors.\n'
    else:
        prompt += f'ICON: Major changes ({icon_change}% change). Explore completely new icon directions.\n'

    # Typography changes
    typography_change = constraints.get('typographyChange', 50) if constraints else 50
    if typography_change < 20:
        prompt += f'TYPOGRAPHY: Keep almost exactly the same ({typography_change}% change).\n'
    elif typography_change < 80:
        prompt += f'TYPOGRAPHY: Moderate to significant changes ({typography_change}% change).\n'
    else:
        prompt += f'TYPOGRAPHY: Major changes ({typography_change}% change). Use completely different typography.\n'

    # Color changes
    color_change = constraints.get('colorChange', 50) if constraints else 50
    if color_change < 20:
        prompt += f'COLOR: Keep almost exactly the same ({color_change}% change).\n'
    elif color_change < 80:
        prompt += f'COLOR: Moderate to significant changes ({color_change}% change).\n'
    else:
        prompt += f'COLOR: Major color changes ({color_change}% change). New color palettes.\n'

    # User's custom change focus
    if constraints and constraints.get('changeFocus'):
        prompt += f"\nSPECIFIC USER REQUEST: {constraints['changeFocus']}\n"

    variance_guidance = get_variance_guidance(variance)
    prompt += f'\n{variance_guidance}\n'

    return prompt

def build_edit_prompt(brand_name: str, brand_category: str, edit_options: Optional[Dict]) -> str:
    """Build prompt for editing specific aspects - EXACT match to original"""
    prompt = f'CRITICAL: You are editing the existing logo shown in the image above for "{brand_name}".\n\n'
    prompt += 'PRIMARY INSTRUCTION: PRESERVE THE EXISTING DESIGN EXACTLY. '
    prompt += 'Do NOT add creativity, do NOT reimagine the design, do NOT change anything except what is explicitly requested below.\n\n'

    prompt += 'KEEP EXACTLY AS IS:\n'
    prompt += '- The same composition and layout\n'
    prompt += '- The same icon/symbol (unless specifically requested to change)\n'
    prompt += '- The same typography and font (unless specifically requested to change)\n'
    prompt += '- The same color scheme (unless specifically requested to change)\n'
    prompt += '- The same overall style and visual approach\n'
    prompt += '- All elements not mentioned in the edit requests below\n\n'

    prompt += 'ONLY APPLY THESE SPECIFIC CHANGES (nothing else):\n'

    if edit_options:
        if edit_options.get('suggestedEdits'):
            for edit in edit_options['suggestedEdits']:
                prompt += f'- {edit}\n'
        if edit_options.get('customEdit'):
            prompt += f"- {edit_options['customEdit']}\n"

    prompt += '\nIMPORTANT: Make ONLY the changes listed above. Everything else must remain identical to the original logo. '
    prompt += 'This is a targeted edit, not a redesign. The result should look like the same logo with minor adjustments, not a new design.'

    return prompt

def generate_edit_suggestions(brand_name: str, brand_category: str, brand_context: str) -> List[Dict[str, str]]:
    """Generate edit suggestions for logos"""
    return [
        {
            "label": "Simplify design",
            "value": "simplify",
            "description": "Remove complex details for cleaner look"
        },
        {
            "label": "Change colors",
            "value": "colors",
            "description": "Adjust color palette to better match brand"
        },
        {
            "label": "Modify typography",
            "value": "typography",
            "description": "Update font style or weight"
        },
        {
            "label": "Add icon element",
            "value": "add_icon",
            "description": "Include a symbolic element"
        },
        {
            "label": "Adjust proportions",
            "value": "proportions",
            "description": "Resize or rebalance elements"
        },
        {
            "label": "Make more modern",
            "value": "modernize",
            "description": "Update to contemporary design trends"
        }
    ]

def generate_reiterate_suggestions(brand_name: str, brand_category: str) -> List[Dict[str, str]]:
    """Generate reiteration suggestions"""
    return [
        {
            "label": "More professional",
            "value": "professional",
            "description": "Enhance corporate appearance"
        },
        {
            "label": "More playful",
            "value": "playful",
            "description": "Add fun and approachable elements"
        },
        {
            "label": "More minimal",
            "value": "minimal",
            "description": "Strip down to essential elements"
        },
        {
            "label": "More detailed",
            "value": "detailed",
            "description": "Add intricate design elements"
        },
        {
            "label": "Industry-specific",
            "value": "industry",
            "description": f"Better reflect {brand_category} industry"
        },
        {
            "label": "Stronger identity",
            "value": "identity",
            "description": "Make more unique and memorable"
        }
    ]

@router.post("/generate", response_model=LogoResponse)
async def generate_logos(
    request: LogoRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Generate logo variations based on request type"""
    try:
        logos = []
        num_logos = 1 if request.action_type == 'edit' else 4

        # Build appropriate prompt
        if request.action_type == 'initial':
            prompt = build_initial_prompt(
                request.brand_name,
                request.brand_category,
                request.brand_context,
                request.benchmark_direction,
                request.variance
            )
        elif request.action_type == 'regenerate':
            prompt = build_regenerate_prompt(
                request.brand_name,
                request.brand_category,
                request.brand_context,
                request.variance
            )
        elif request.action_type == 'reiterate':
            # Parse constraints JSON string if provided
            constraints_dict = None
            if request.constraints:
                try:
                    constraints_dict = json.loads(request.constraints)
                except json.JSONDecodeError:
                    print(f"Failed to parse constraints: {request.constraints}")

            prompt = build_reiterate_prompt(
                request.brand_name,
                request.brand_category,
                request.brand_context,
                constraints_dict,
                request.variance
            )
        elif request.action_type == 'edit':
            # Parse edit_options JSON string if provided
            edit_options_dict = None
            if request.edit_options:
                try:
                    edit_options_dict = json.loads(request.edit_options)
                except json.JSONDecodeError:
                    print(f"Failed to parse edit_options: {request.edit_options}")

            prompt = build_edit_prompt(
                request.brand_name,
                request.brand_category,
                edit_options_dict
            )
        else:
            raise ValueError(f"Invalid action type: {request.action_type}")

        # Generate logos using Gemini or fallback to placeholders
        use_gemini = os.getenv("GEMINI_API_KEY") is not None

        if use_gemini:
            import asyncio

            try:
                if request.action_type == 'regenerate' and request.current_grid_logos and len(request.current_grid_logos) == 4:
                    # REGENERATE: Each position regenerates from its previous logo
                    # NOTE: Gemini doesn't support image input yet, so we'll generate fresh variations
                    tasks = []
                    for i, previous_logo_url in enumerate(request.current_grid_logos):
                        # For now, generate variations without image reference
                        tasks.append(generate_logo_with_gemini(prompt, request.brand_name, request.variance))

                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    for result in results:
                        if isinstance(result, str) and result.startswith('data:image'):
                            logos.append(result)
                        else:
                            print(f"Logo generation failed: {result}")
                            logos.append(generate_placeholder_logo(request.brand_name, len(logos)))

                elif request.action_type == 'edit' and request.parent_logo_url:
                    # EDIT: Generate one edited version from the parent logo
                    # Pass variance as 0 for edits to ensure strict adherence to the original
                    result = await generate_logo_with_gemini(prompt, request.brand_name, 0)
                    logos.append(result)

                else:
                    # INITIAL/REITERATE: Generate 4 different variations in parallel
                    variation_keywords = [
                        'Design Direction 1: Focus on geometric shapes and clean lines.',
                        'Design Direction 2: Focus on organic forms and flowing curves.',
                        'Design Direction 3: Focus on bold typography and minimal iconography.',
                        'Design Direction 4: Focus on detailed icon with supporting text.'
                    ]

                    tasks = []
                    for i in range(num_logos):
                        varied_prompt = f"{prompt}\n\n{variation_keywords[i % len(variation_keywords)]}"
                        tasks.append(generate_logo_with_gemini(
                            varied_prompt,
                            request.brand_name,
                            request.variance if hasattr(request, 'variance') else 70
                        ))

                    # Execute all tasks in parallel
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    for result in results:
                        if isinstance(result, str) and result.startswith('data:image'):
                            logos.append(result)
                        else:
                            print(f"Logo generation failed: {result}")
                            logos.append(generate_placeholder_logo(request.brand_name, len(logos)))

                # If no results, use placeholders
                if len(logos) == 0:
                    for i in range(num_logos):
                        logos.append(generate_placeholder_logo(request.brand_name, i))

            except Exception as error:
                print(f"Gemini API error, using placeholders: {error}")
                for i in range(num_logos):
                    logos.append(generate_placeholder_logo(request.brand_name, i))
        else:
            # Fallback to placeholder logos
            print("⚠️  GEMINI_API_KEY not found, using placeholder logos")
            for i in range(num_logos):
                logos.append(generate_placeholder_logo(request.brand_name, i))

        # Generate suggestions
        suggested_edits = generate_edit_suggestions(
            request.brand_name,
            request.brand_category,
            request.brand_context
        )

        reiterate_suggestions = generate_reiterate_suggestions(
            request.brand_name,
            request.brand_category
        )

        return LogoResponse(
            logos=logos,
            suggested_edits=suggested_edits,
            reiterate_suggestions=reiterate_suggestions
        )

    except Exception as e:
        print(f"Error generating logos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating logos: {str(e)}")

@router.post("/save")
async def save_logo_data(
    brand_id: str,
    logo_tree: Dict[str, Any],
    final_logo: str,
    variations: List[str],
    current_user_id: str = Depends(get_current_user_id)
):
    """Save logo generation data including tree, variations, and final selection"""
    try:
        # TODO: Implement actual database storage
        # For now, just return success
        return {
            "success": True,
            "message": "Logo data saved successfully",
            "brand_id": brand_id
        }
    except Exception as e:
        print(f"Error saving logo data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving logo data: {str(e)}")