"""
Autocomplete Router
Handles brand description autocomplete with GPT integration
Based on working implementation from TacitSNS-1/brand-autocomplete
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import os
from datetime import datetime
from openai import OpenAI

router = APIRouter()

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

# In-memory storage
contexts = {}
brand_progress = {}
current_focus = {}

# Request Models
class SuggestionRequest(BaseModel):
    brandName: Optional[str] = "your brand"
    brandCategory: Optional[str] = "business"
    currentText: str
    sessionId: Optional[str] = None
    modelConfig: Optional[Dict] = {}
    brandContext: Optional[Dict] = {}

class AnnotateRequest(BaseModel):
    brandName: Optional[str] = None
    brandCategory: Optional[str] = None
    sentenceText: Optional[str] = None
    modelConfig: Optional[Dict] = {}

# Brand Elements Definition
BRAND_ELEMENTS = {
    "companyType": {
        "keywords": ["is a", "company", "brand", "business", "startup", "operates as", "platform", "service"],
        "description": "Industry/type",
        "starters": ["We operate as", "Our platform is", "{brandName} is a", "The company provides", "We are"]
    },
    "audience": {
        "keywords": ["helps", "for", "serves", "customers", "people", "users", "target", "built for"],
        "description": "Target audience",
        "starters": ["We serve", "Built for", "Designed to help", "Our customers are", "We work with"]
    },
    "problem": {
        "keywords": ["solves", "addresses", "tackles", "problem", "challenge", "need", "frustration", "pain point"],
        "description": "Problem solved",
        "starters": ["The main problem we solve is", "We address", "The challenge is", "We tackle"]
    },
    "solution": {
        "keywords": ["by", "through", "using", "with", "creates", "provides", "offers", "delivers", "approach"],
        "description": "How/solution",
        "starters": ["We solve this by", "Our approach involves", "We deliver through", "Our solution is"]
    },
    "mission": {
        "keywords": ["mission", "goal", "vision", "purpose", "why we exist", "founded to", "aim to"],
        "description": "Mission/vision",
        "starters": ["Our mission is to", "We aim to", "Our goal is", "We strive to"]
    },
    "differentiator": {
        "keywords": ["unique", "different", "unlike", "special", "stands out", "first", "only", "what sets us apart"],
        "description": "What makes it unique",
        "starters": ["What sets us apart", "Unlike others, we", "Our key advantage is", "What makes us special is"]
    },
    "brandIdentity": {
        "keywords": ["personality", "tone", "voice", "feel", "vibe", "sounds like", "comes across as"],
        "description": "Brand personality/voice",
        "starters": ["Our brand personality is", "Our voice is", "We communicate with", "Our tone is"]
    },
    "values": {
        "keywords": ["value", "care about", "important to us", "principle", "believe in", "prioritize"],
        "description": "Core values",
        "starters": ["We believe in", "We prioritize", "We're committed to", "We value", "We stand for"]
    }
}

async def analyze_progress_with_gpt(brand_name: str, brand_category: str, current_text: str, model=None, temperature=None):
    """Analyze brand description progress using GPT"""
    if not current_text.strip():
        return {
            "covered": {k: False for k in BRAND_ELEMENTS.keys()},
            "overallStatus": "incomplete",
            "overallAssessment": "Empty",
            "statusMessage": "Start by introducing what type of brand your company is"
        }

    model = model or MODEL_CONFIG["direction_analysis"]["model"]
    temperature = temperature or MODEL_CONFIG["direction_analysis"]["temperature"]

    try:
        prompt = f"""You are a helpful brand strategist analyzing a brand description for "{brand_name}" ({brand_category} category).

Current brand description:
"{current_text}"

Brand Elements to Evaluate:
- companyType: Industry/type
- audience: Target audience
- problem: Problem solved
- solution: How/solution
- mission: Mission/vision
- differentiator: What makes it unique
- brandIdentity: Brand personality/voice
- values: Core values

For each element, mark true only if the text includes a concrete, specific mention.
Assess overall completeness and provide guidance.

Respond with ONLY a JSON object:
{{
  "companyType": true/false,
  "audience": true/false,
  "problem": true/false,
  "solution": true/false,
  "mission": true/false,
  "differentiator": true/false,
  "brandIdentity": true/false,
  "values": true/false,
  "overallStatus": "complete" | "progressing" | "incomplete",
  "overallAssessment": "ONE WORD describing what brand needs most",
  "statusMessage": "Concise actionable guidance on what elements need more detail"
}}"""

        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=400,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        print(f"GPT analysis failed: {e}")
        # Fallback to keyword analysis
        covered = {}
        text_lower = current_text.lower()
        for element, config in BRAND_ELEMENTS.items():
            covered[element] = any(kw in text_lower for kw in config["keywords"])

        return {
            **covered,
            "overallStatus": "incomplete",
            "overallAssessment": "Unknown",
            "statusMessage": "Continue building your brand description"
        }

def get_missing_elements(covered):
    """Get list of missing brand elements"""
    return [{"key": key, **BRAND_ELEMENTS[key]}
            for key, value in covered.items() if not value]

@router.post("/api/suggestions")
async def get_suggestions(request: SuggestionRequest):
    """Generate autocomplete suggestions for brand description"""

    text = request.currentText
    session_id = request.sessionId or "default"
    brand_name = request.brandName or request.brandContext.get("brandName", "your brand")
    brand_category = request.brandCategory or request.brandContext.get("brandCategory", "business")

    # Model config
    direction_model = request.modelConfig.get("directionModel", MODEL_CONFIG["direction_analysis"]["model"]) if request.modelConfig else MODEL_CONFIG["direction_analysis"]["model"]
    direction_temp = request.modelConfig.get("directionTemp", MODEL_CONFIG["direction_analysis"]["temperature"]) if request.modelConfig else MODEL_CONFIG["direction_analysis"]["temperature"]
    suggestion_model = request.modelConfig.get("suggestionModel", MODEL_CONFIG["suggestion_completion"]["model"]) if request.modelConfig else MODEL_CONFIG["suggestion_completion"]["model"]
    suggestion_temp = request.modelConfig.get("suggestionTemp", MODEL_CONFIG["suggestion_completion"]["temperature"]) if request.modelConfig else MODEL_CONFIG["suggestion_completion"]["temperature"]

    # Analyze text
    last_char = text.rstrip()[-1:] if text.rstrip() else ""
    sentence_ended = last_char in ['.', '!', '?']
    last_sentence = text.split('.')[-1].strip() if text else ""
    words_in_sentence = len(last_sentence.split()) if last_sentence else 0

    # Analyze progress
    should_analyze = not text.strip() or sentence_ended

    if should_analyze:
        analysis = await analyze_progress_with_gpt(brand_name, brand_category, text, direction_model, direction_temp)
        covered = {k: v for k, v in analysis.items()
                  if k not in ["overallStatus", "overallAssessment", "statusMessage"]}
        overall_status = analysis.get("overallStatus", "incomplete")
        overall_assessment = analysis.get("overallAssessment", "Starting")
        status_message = analysis.get("statusMessage", "Continue building your brand description")
        missing = get_missing_elements(covered)
        progress = sum(1 for v in covered.values() if v)
        total = len(BRAND_ELEMENTS)
        brand_progress[session_id] = {
            "covered": covered, "missing": missing, "progress": progress,
            "total": total, "overallStatus": overall_status,
            "overallAssessment": overall_assessment, "statusMessage": status_message
        }
    else:
        cached = brand_progress.get(session_id, {})
        covered = cached.get("covered", {})
        missing = cached.get("missing", get_missing_elements(covered))
        progress = cached.get("progress", 0)
        total = cached.get("total", 8)
        overall_status = cached.get("overallStatus", "incomplete")
        overall_assessment = cached.get("overallAssessment", "Starting")
        status_message = cached.get("statusMessage", "Continue building your brand description")

    # Generate suggestions
    suggestions = []
    thinking = ""
    elapsed = 0

    try:
        if not text.strip():
            # Blank state suggestions
            suggestions = [
                {"text": f"{brand_name} is a", "type": "continuation", "targets": ["companyType"],
                 "reasoning": "Introduce your company type"},
                {"text": "We help", "type": "continuation", "targets": ["audience"],
                 "reasoning": "Define your audience"},
                {"text": "Our mission is to", "type": "continuation", "targets": ["mission"],
                 "reasoning": "State your mission"},
                {"text": f"{brand_name} was founded to", "type": "continuation", "targets": ["problem"],
                 "reasoning": "Explain your purpose"}
            ]
            thinking = "Starting suggestions for blank state"

        else:
            # Use GPT for contextual suggestions
            start_time = datetime.now()

            # Determine stage
            stage = "SENTENCE_STARTER" if sentence_ended else "SENTENCE_CONTINUER"
            if words_in_sentence >= 20:
                stage = "SENTENCE_ENDER"
            elif words_in_sentence <= 3:
                stage = "SENTENCE_FOLLOWER"

            focused_element = current_focus.get(session_id)
            if not focused_element and missing:
                focused_element = missing[0]
                current_focus[session_id] = focused_element

            if sentence_ended:
                current_focus.pop(session_id, None)

            system_prompt = f"""Generate 4 contextual autocomplete suggestions for this brand description.

Brand: {brand_name} ({brand_category})
Current text: "{text}"
Words in sentence: {words_in_sentence}
Sentence ended: {sentence_ended}
Stage: {stage}
Missing elements: {', '.join([m['key'] for m in missing[:3]]) if missing else 'None'}

Generate short (2-5 word) suggestions that naturally continue the text.
{('Start new sentences.' if sentence_ended else 'Continue the current sentence.')}

Return JSON:
{{
  "thinking": "Brief reasoning about the suggestions",
  "suggestions": [
    {{"text": "suggestion text", "type": "continuation", "targets": ["element"], "reasoning": "why this helps"}}
  ]
}}"""

            response = openai_client.chat.completions.create(
                model=suggestion_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Current text: '{text}'"}
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
            {"text": "and innovative solutions", "type": "continuation", "targets": [],
             "reasoning": "Generic continuation"},
            {"text": "to help you succeed", "type": "continuation", "targets": [],
             "reasoning": "Success focus"}
        ]
        thinking = "Fallback suggestions due to error"
        elapsed = 50

    # Update context
    context = contexts.get(session_id, [])
    context.append({"role": "user", "content": f"Current text: '{text}'"})
    context.append({"role": "assistant", "content": json.dumps(suggestions)})

    if len(context) > 6:
        context = context[-6:]
    contexts[session_id] = context

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
            "covered": progress,
            "total": total,
            "percentage": int((progress / total) * 100),
            "allElements": [
                {"key": key, "description": config["description"],
                 "covered": covered.get(key, False)}
                for key, config in BRAND_ELEMENTS.items()
            ],
            "recommendation": {
                "hint": f"Try adding more about your {missing[0]['description'].lower()}" if missing else "Great job!"
            } if missing else None
        },
        "debug": {
            "thinking": thinking,
            "elapsed": elapsed
        }
    }

@router.post("/api/annotate")
async def annotate_text(request: AnnotateRequest):
    """Annotate text with brand element segments"""

    text = request.sentenceText or ""

    if not text:
        return {
            "segments": [{"text": "", "targets": []}],
            "sentenceTargets": []
        }

    # For now, simple annotation
    # Could be enhanced with GPT for better identification
    return {
        "segments": [{"text": text, "targets": []}],
        "sentenceTargets": []
    }