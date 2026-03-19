"""
Autocomplete Service with GPT Integration
Handles brand description autocomplete suggestions and analysis
"""

from typing import Dict, List, Optional, Any
import json
from datetime import datetime
from openai import OpenAI
import os

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Model Configuration
MODEL_CONFIG = {
    "direction_analysis": {
        "model": "gpt-4o",
        "temperature": 0.3
    },
    "suggestion_completion": {
        "model": "gpt-4o-mini",
        "temperature": 1.0
    }
}

# In-memory storage for sessions
brand_progress = {}
contexts = {}

# Brand elements definition
BRAND_ELEMENTS = {
    "companyType": {
        "keywords": ["company", "platform", "service", "business"],
        "description": "Industry/type",
        "starters": ["We operate as", "Our platform is", "{brandName} is a"]
    },
    "audience": {
        "keywords": ["customers", "users", "people", "clients"],
        "description": "Target audience",
        "starters": ["We serve", "Built for", "Our customers are"]
    },
    "problem": {
        "keywords": ["problem", "challenge", "issue", "pain"],
        "description": "Problem solved",
        "starters": ["The main problem we solve is", "We address", "We tackle"]
    },
    "solution": {
        "keywords": ["solution", "solve", "help", "provide"],
        "description": "How/solution",
        "starters": ["We solve this by", "Our approach involves", "We provide"]
    },
    "mission": {
        "keywords": ["mission", "goal", "vision", "purpose"],
        "description": "Mission/vision",
        "starters": ["Our mission is to", "We aim to", "Our goal is"]
    },
    "differentiator": {
        "keywords": ["unique", "different", "special"],
        "description": "What makes it unique",
        "starters": ["What sets us apart", "Unlike others, we", "Our key advantage is"]
    },
    "brandIdentity": {
        "keywords": ["brand", "identity", "personality"],
        "description": "Brand personality/voice",
        "starters": ["Our brand personality is", "Our voice is", "Our tone is"]
    },
    "values": {
        "keywords": ["value", "believe", "principle"],
        "description": "Core values",
        "starters": ["We believe in", "We prioritize", "We value"]
    }
}

async def analyze_progress_with_gpt(
    brand_name: str,
    brand_category: str,
    current_text: str,
    model: str = None,
    temperature: float = None
) -> Dict:
    """Analyze brand description progress using GPT"""

    if not current_text.strip():
        return {
            "covered": {k: False for k in BRAND_ELEMENTS.keys()},
            "overall_status": "incomplete",
            "overall_assessment": "Empty",
            "status_message": "Start by introducing what type of brand your company is"
        }

    model = model or MODEL_CONFIG["direction_analysis"]["model"]
    temperature = temperature or MODEL_CONFIG["direction_analysis"]["temperature"]

    try:
        prompt = f"""Analyze this brand description for "{brand_name}" ({brand_category}):

"{current_text}"

Evaluate which brand elements are covered:
- companyType: Industry/type
- audience: Target audience
- problem: Problem solved
- solution: How/solution
- mission: Mission/vision
- differentiator: What makes it unique
- brandIdentity: Brand personality/voice
- values: Core values

Mark each element true ONLY if explicitly mentioned with specificity.

Return JSON:
{{
  "companyType": true/false,
  "audience": true/false,
  "problem": true/false,
  "solution": true/false,
  "mission": true/false,
  "differentiator": true/false,
  "brandIdentity": true/false,
  "values": true/false,
  "overallStatus": "complete|progressing|incomplete",
  "overallAssessment": "ONE_WORD",
  "statusMessage": "Actionable guidance"
}}"""

        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=400,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return {
            "covered": {k: v for k, v in result.items()
                       if k not in ["overallStatus", "overallAssessment", "statusMessage"]},
            "overall_status": result.get("overallStatus", "incomplete"),
            "overall_assessment": result.get("overallAssessment", "Unknown"),
            "status_message": result.get("statusMessage", "Continue building your brand description")
        }
    except Exception as e:
        print(f"GPT analysis error: {e}")
        # Fallback to keyword analysis
        covered = {}
        text_lower = current_text.lower()
        for element, config in BRAND_ELEMENTS.items():
            covered[element] = any(kw in text_lower for kw in config["keywords"])
        return {
            "covered": covered,
            "overall_status": "incomplete",
            "overall_assessment": "Unknown",
            "status_message": "Continue building your brand description"
        }

async def generate_suggestions(
    brand_name: str,
    brand_category: str,
    current_text: str,
    session_id: str = "default",
    model_config: Optional[Dict] = None
) -> Dict:
    """Generate autocomplete suggestions using GPT"""

    # Use model config from request or defaults
    suggestion_model = (model_config or {}).get("suggestionModel",
                       MODEL_CONFIG["suggestion_completion"]["model"])
    suggestion_temp = (model_config or {}).get("suggestionTemp",
                      MODEL_CONFIG["suggestion_completion"]["temperature"])

    # Analyze sentence status
    last_char = current_text.rstrip()[-1:] if current_text.rstrip() else ""
    sentence_ended = last_char in ['.', '!', '?']
    last_sentence = current_text.split('.')[-1].strip() if current_text else ""
    words_in_sentence = len(last_sentence.split()) if last_sentence else 0

    # Get or analyze progress
    if session_id not in brand_progress or sentence_ended or not current_text.strip():
        analysis = await analyze_progress_with_gpt(brand_name, brand_category, current_text)
        brand_progress[session_id] = analysis
    else:
        analysis = brand_progress.get(session_id, {})

    covered = analysis.get("covered", {})
    overall_status = analysis.get("overall_status", "incomplete")
    overall_assessment = analysis.get("overall_assessment", "Starting")
    status_message = analysis.get("status_message", "Continue building")

    # Calculate missing elements
    missing_elements = [k for k, v in covered.items() if not v]
    progress_count = sum(1 for v in covered.values() if v)
    total = len(covered) if covered else 8

    # Generate suggestions
    suggestions = []
    thinking = ""
    elapsed = 0

    try:
        if not current_text.strip():
            # Blank state - simple starters
            suggestions = [
                {"text": f"{brand_name} is a", "type": "continuation",
                 "targets": ["companyType"], "reasoning": "Introduce your company type"},
                {"text": "We help", "type": "continuation",
                 "targets": ["audience"], "reasoning": "Define your audience"},
                {"text": "Our mission is to", "type": "continuation",
                 "targets": ["mission"], "reasoning": "State your mission"},
                {"text": f"{brand_name} was founded to", "type": "continuation",
                 "targets": ["problem"], "reasoning": "Explain your purpose"}
            ]
            thinking = "Starting suggestions for blank state"
        else:
            # Use GPT for contextual suggestions
            start_time = datetime.now()

            system_prompt = f"""Generate 4 contextual autocomplete suggestions for this brand description.

Brand: {brand_name} ({brand_category})
Current text: "{current_text}"
Words in sentence: {words_in_sentence}
Sentence ended: {sentence_ended}
Missing elements: {', '.join(missing_elements[:3]) if missing_elements else 'None'}

Generate short (2-5 word) suggestions that naturally continue the text.
{('Start new sentences.' if sentence_ended else 'Continue the current sentence.')}

Return JSON:
{{
  "thinking": "Brief reasoning",
  "suggestions": [
    {{"text": "suggestion", "type": "continuation", "targets": ["element"], "reasoning": "why"}}
  ]
}}"""

            response = openai_client.chat.completions.create(
                model=suggestion_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Continue: '{current_text}'"}
                ],
                temperature=suggestion_temp,
                max_tokens=300,
                response_format={"type": "json_object"}
            )

            elapsed = int((datetime.now() - start_time).total_seconds() * 1000)
            result = json.loads(response.choices[0].message.content)
            thinking = result.get("thinking", "")
            suggestions = result.get("suggestions", [])

    except Exception as e:
        print(f"GPT suggestion error: {e}")
        # Fallback suggestions
        suggestions = [
            {"text": "and innovative solutions", "type": "continuation",
             "targets": [], "reasoning": "Generic continuation"},
            {"text": "to help you succeed", "type": "continuation",
             "targets": [], "reasoning": "Success focus"},
            {"text": "with cutting-edge technology", "type": "continuation",
             "targets": [], "reasoning": "Tech focus"},
            {"text": "for better results", "type": "continuation",
             "targets": [], "reasoning": "Results focus"}
        ]
        thinking = "Fallback suggestions due to error"
        elapsed = 50

    # Format response
    return {
        "status": "success",
        "suggestions": suggestions[:4],
        "brandStatus": {
            "satisfied": overall_status == "complete",
            "overallAssessment": overall_assessment,
            "statusMessage": status_message,
            "sentenceEnded": sentence_ended
        },
        "progress": {
            "covered": progress_count,
            "total": total,
            "percentage": int((progress_count / total * 100) if total else 0),
            "allElements": [
                {"key": k, "description": BRAND_ELEMENTS[k]["description"],
                 "covered": covered.get(k, False)}
                for k in BRAND_ELEMENTS.keys()
            ],
            "recommendation": {
                "hint": f"Try adding more about your {missing_elements[0].replace('_', ' ')}"
                        if missing_elements else "Great job!"
            } if missing_elements else None
        },
        "debug": {
            "thinking": thinking,
            "elapsed": elapsed
        }
    }

async def annotate_text(text: str) -> Dict:
    """Simple text annotation for brand elements"""
    if not text:
        return {
            "segments": [{"text": "", "targets": []}],
            "sentenceTargets": []
        }

    # For now, return simple annotation
    # Could be enhanced with GPT for better identification
    return {
        "segments": [{"text": text, "targets": []}],
        "sentenceTargets": []
    }