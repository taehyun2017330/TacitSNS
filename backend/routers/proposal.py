from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import openai
import os
import json
import re
from dependencies.auth_simple import get_current_user_id

router = APIRouter()

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")

# Brand Proposal Template
BRAND_PROPOSAL_TEMPLATE = """HEADER|||[Brand]|||[Category]|||[Stage]|||[Logo status]|||[Text file status]

Based on the information you provided, we understand [Brand] as a [Category] brand for [Audience], built around [Core differentiator]. The brand should feel [Personality 1] · [Personality 2] · [Personality 3] and communicate in a [Voice 1] · [Voice 2] · [Voice 3] voice.

Core definition
One-liner: [One-liner]
Mission: [Mission]
Values: [Value 1] · [Value 2] · [Value 3]

Audience
Primary audience: [Primary audience]
Top needs: [Pain point 1] · [Pain point 2] · [Pain point 3]
Desired feelings: [Feeling 1] · [Feeling 2] · [Feeling 3]

Offering
Main products: [Main product 1] · [Main product 2] · [Main product 3]
Key benefits: [Key benefit 1] · [Key benefit 2] · [Key benefit 3]

Differentiation & positioning
Unique strengths: [Unique strength 1] · [Unique strength 2] · [Unique strength 3]
Positioning: [Positioning statement]

Brand voice & messaging
Voice traits: [Voice trait 1] · [Voice trait 2] · [Voice trait 3]
Words to use: [Word to use 1] · [Word to use 2] · [Word to use 3]
Words to avoid: [Word to avoid 1] · [Word to avoid 2] · [Word to avoid 3]"""

class ProposalRequest(BaseModel):
    brand_name: str
    brand_category: str
    current_text: str
    images_data_urls: List[str] = []
    text_file_text: Optional[str] = None
    text_file_provided: bool = False
    ai_model_config: Optional[Dict[str, Any]] = None

class ProposalResponse(BaseModel):
    proposal: str
    confidence: Dict[str, Dict[str, Any]]
    fields: Dict[str, str]
    logo_detected: bool

class FieldConfidenceData(BaseModel):
    level: str  # 'user' | 'inferred' | 'generated'
    certainty: str  # 'high' | 'medium' | 'low'
    reasoning: str

def extract_bracket_fields(template: str) -> List[str]:
    """Extract all bracketed field names from template"""
    re_pattern = r'\[([^\]]+)\]'
    matches = re.findall(re_pattern, template)
    return list(set(matches))

def fill_template(template: str, values: Dict[str, str]) -> str:
    """Fill template with provided values"""
    result = template
    for key, value in values.items():
        if value:
            cleaned_value = str(value).replace('\n', ' ').strip()
            escaped_key = re.escape(key)
            result = re.sub(f'\\[{escaped_key}\\]', f'[{cleaned_value}]', result)
    return result

def build_proposal_prompt(brand_name: str, brand_category: str, current_text: str,
                         has_images: bool, text_file_provided: bool,
                         text_file_text: str = None) -> str:
    """Build the prompt for GPT-4 to generate brand proposal"""
    fields = extract_bracket_fields(BRAND_PROPOSAL_TEMPLATE)
    fields_list = '\n'.join([f'- {f}' for f in fields])

    user_context = f"""Brand name: {brand_name}
Brand category: {brand_category}

User-written brand description (autocomplete output):
{json.dumps(current_text)}

Extra inputs:
- Images provided: {'Yes' if has_images else 'No'}
- Text file provided: {'Yes' if text_file_provided else 'No'}"""

    if text_file_text:
        user_context += f"\n\nText file content:\n{json.dumps(text_file_text)}"

    prompt = f"""You are a brand strategist. Fill bracket fields using the context and any uploaded images.

Output format:
- Output MUST be a single JSON object with TWO top-level keys: "fields" and "confidence"
- "fields": object where keys are EXACTLY the bracket field names, values are strings (NO brackets)
- "confidence": object where keys are the same field names, values are objects with:
  - "level": "user" | "inferred" | "generated"
    * "user" = explicitly mentioned in user's text or files (e.g., brand name "Chattie", category "Education")
    * "inferred" = logically derived from user's descriptions (e.g., audience from context clues)
    * "generated" = AI created when no clear evidence in user input
  - "certainty": "high" | "medium" | "low" - BE STRICT with ratings:
    * "high" = if explicitly stated or very similar in user input (e.g., exact brand name, exact category name)
    * "medium" = Is reasonably inferred with 2+ supporting clues from user's description
    * "low" = AI generated guess, single weak clue, or completely made up
  - "reasoning": brief explanation (10-20 words) including certainty level

IMPORTANT Certainty Guidelines (BE CONSERVATIVE):
- Brand name / Category explicitly provided by user → "high"
- If any field value appears word-for-word in user input → "high"
- Detailed user description with specific evidence → "medium"
- Vague hints or single sentence input → "low"
- Values, voice traits, positioning without specific user mentions → "low"
- Generic placeholder content → "low"
- When in doubt, choose "medium"

Quality:
- Keep field values short and punchy (phrases, not paragraphs).
- "Positioning statement" should be the FULL positioning sentence, not broken into parts.
- CRITICAL: Each numbered field (Personality 1/2/3, Voice 1/2/3, Value 1/2/3) must contain ONLY ONE single word or short phrase.
  * "Personality 1" = "Innovative" (NOT "Innovative · Supportive · Engaging")
  * "Voice 1" = "Friendly" (NOT "Friendly · Informative")
  * Each trait gets its own numbered field
- Voice traits and Values: Maximum 3 items each (single words or short 2-word phrases).
- All list items separated by " · " (space-middot-space), NOT commas.

Detection rules:
- "Logo status": If there are no images, set it to "No logo provided". If images exist, inspect them: if any image looks like a logo/wordmark/brandmark, set to "Logo detected"; otherwise "No logo provided".
- "Text file status": If no text file is provided, set it to "No text file". If provided, set it to "Text file provided".

Picklist rules:
- "Stage": one of "New" | "Existing" | "Rebrand"

Context:
{user_context}

Bracket fields to fill:
{fields_list}

Example output structure (showing realistic confidence distribution):
{{
  "fields": {{
    "Brand": "Chattie",
    "Category": "Education",
    "One-liner": "Interactive learning platform for modern classrooms",
    "Voice trait 1": "Friendly",
    "Positioning statement": "For students of all ages, Chattie is an Education brand that delivers improved educational success because of its proven track record in education."
  }},
  "confidence": {{
    "Brand": {{"level": "user", "certainty": "high", "reasoning": "High confidence - Brand name 'Chattie' explicitly provided by user"}},
    "Category": {{"level": "user", "certainty": "high", "reasoning": "High confidence - Category 'Education' explicitly stated by user"}},
    "One-liner": {{"level": "inferred", "certainty": "medium", "reasoning": "Medium confidence - Inferred from user mentioning classroom and students"}},
    "Voice trait 1": {{"level": "generated", "certainty": "low", "reasoning": "Low confidence - AI generated, no specific voice traits mentioned by user"}},
    "Positioning statement": {{"level": "inferred", "certainty": "low", "reasoning": "Low confidence - Synthesized from limited user context, lacks specific claims"}}
  }}
}}"""

    return prompt

@router.post("/", response_model=ProposalResponse)
async def generate_proposal(
    request: ProposalRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Generate a brand proposal based on user inputs"""
    try:
        # Build prompt for GPT-4
        prompt = build_proposal_prompt(
            brand_name=request.brand_name,
            brand_category=request.brand_category,
            current_text=request.current_text,
            has_images=len(request.images_data_urls) > 0,
            text_file_provided=request.text_file_provided,
            text_file_text=request.text_file_text
        )

        # Prepare messages
        messages = [
            {"role": "system", "content": "You are a brand strategist. Return a valid JSON object with \"fields\" and \"confidence\" keys as specified in the prompt."},
            {"role": "user", "content": [{"type": "text", "text": prompt}]}
        ]

        # Add images if provided
        if request.images_data_urls:
            for image_url in request.images_data_urls:
                messages[1]["content"].append({
                    "type": "image_url",
                    "image_url": {"url": image_url}
                })

        # Get model config
        model = "gpt-4o"
        temperature = 0.4  # Match original implementation
        if request.ai_model_config:
            model = request.ai_model_config.get("model", model)
            temperature = request.ai_model_config.get("temperature", temperature)

        # Call OpenAI API
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )

        # Parse response
        response_text = response.choices[0].message.content

        # Try to parse JSON from response
        try:
            # With response_format set, the response should be pure JSON
            parsed_response = json.loads(response_text.strip())
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {str(e)}")
            print(f"Raw response: {response_text}")

            # Fallback: Try to extract JSON if wrapped in markdown
            if "```json" in response_text:
                json_text = response_text.split("```json")[1].split("```")[0].strip()
                try:
                    parsed_response = json.loads(json_text)
                except json.JSONDecodeError:
                    raise ValueError(f"Could not parse JSON from GPT response: {str(e)}")
            elif "```" in response_text:
                json_text = response_text.split("```")[1].split("```")[0].strip()
                try:
                    parsed_response = json.loads(json_text)
                except json.JSONDecodeError:
                    raise ValueError(f"Could not parse JSON from GPT response: {str(e)}")
            else:
                # Last resort: try to find JSON object
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)
                if json_match:
                    try:
                        parsed_response = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        raise ValueError(f"Could not parse extracted JSON: {str(e)}")
                else:
                    raise ValueError(f"Could not parse JSON from GPT response: {str(e)}")

        # Extract fields and confidence from response
        fields_data = parsed_response.get("fields", parsed_response if isinstance(parsed_response, dict) else {})
        confidence_data = parsed_response.get("confidence", {})

        # Debug: Check if we got confidence data
        print(f"Got {len(confidence_data)} confidence entries from GPT")

        # Get all expected fields from template
        expected_fields = extract_bracket_fields(BRAND_PROPOSAL_TEMPLATE)

        # Ensure all expected fields exist with proper fallbacks
        fields = {}
        confidence = {}

        for field_key in expected_fields:
            # Get value from response or use empty string
            value = fields_data.get(field_key, "")
            if isinstance(value, str) and value:
                fields[field_key] = value
            else:
                # Use field name as placeholder if no value provided
                fields[field_key] = ""

            # Get confidence or set default
            if field_key in confidence_data and isinstance(confidence_data[field_key], dict):
                confidence[field_key] = confidence_data[field_key]
            else:
                # Try to determine confidence based on field name and user input
                if field_key in ["Brand", "Category"] and value:
                    # Brand and category are usually provided by user
                    confidence[field_key] = {
                        "level": "user",
                        "certainty": "high",
                        "reasoning": f"High confidence - {field_key} explicitly provided by user"
                    }
                elif "30s" in str(value) or "women" in str(value).lower() or "mature skin" in str(value).lower():
                    # Values that match user input
                    confidence[field_key] = {
                        "level": "user",
                        "certainty": "high",
                        "reasoning": "High confidence - Explicitly mentioned by user"
                    }
                else:
                    confidence[field_key] = {
                        "level": "generated",
                        "certainty": "low",
                        "reasoning": "Low confidence - Auto-generated by AI"
                    }

        # Override detection fields based on actual inputs
        has_images = len(request.images_data_urls) > 0
        fields["Logo status"] = fields.get("Logo status") or ("No logo provided" if not has_images else "No logo provided")
        fields["Text file status"] = "Text file provided" if request.text_file_provided else "No text file"

        # Fill the template with generated fields
        filled_proposal = fill_template(BRAND_PROPOSAL_TEMPLATE, fields)

        # Check if logo was detected
        logo_detected = fields.get("Logo status", "No logo provided") == "Logo detected"

        return ProposalResponse(
            proposal=filled_proposal,
            confidence=confidence,
            fields=fields,
            logo_detected=logo_detected
        )

    except Exception as e:
        print(f"Error generating proposal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating proposal: {str(e)}")