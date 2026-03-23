"""
Autocomplete Service with GPT Integration
Handles brand description autocomplete suggestions and analysis
"""

from typing import Dict, List, Optional, Any
import json
from datetime import datetime
from openai import OpenAI
import os
import re

# Model Configuration
MODEL_CONFIG = {
    "direction_analysis": {
        "model": "gpt-4o",
        "temperature": 0.3
    },
    "suggestion_completion": {
        "model": "gpt-4o",
        "temperature": 0.7
    }
}

# In-memory storage for sessions
brand_progress = {}
contexts = {}


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

VALID_TARGETS = set(BRAND_ELEMENTS.keys())
VALID_SUGGESTION_TYPES = {"continuation", "new_angle", "example", "sentence_end"}


def extract_current_sentence(text: str) -> str:
    stripped = text.rstrip()
    if not stripped:
        return ""

    parts = re.split(r'(?<=[.!?])\s+', stripped)
    return (parts[-1] if parts else stripped).strip()


def infer_fallback_analysis(current_text: str) -> Dict[str, Any]:
    covered = {}
    text_lower = current_text.lower()
    for element, config in BRAND_ELEMENTS.items():
        covered[element] = any(kw in text_lower for kw in config["keywords"])

    current_sentence = extract_current_sentence(current_text)
    sentence_word_count = len(current_sentence.split()) if current_sentence else 0
    has_terminal_punctuation = current_text.rstrip()[-1:] in [".", "!", "?"]
    missing_elements = [key for key, is_covered in covered.items() if not is_covered]
    next_element = missing_elements[0] if missing_elements else "none"

    if has_terminal_punctuation:
        sentence_state = "complete"
        recommended_action = "start_new_sentence"
    elif sentence_word_count >= 12:
        sentence_state = "developing"
        recommended_action = "finish_sentence"
    elif sentence_word_count >= 5:
        sentence_state = "developing"
        recommended_action = "continue_sentence"
    else:
        sentence_state = "fragment"
        recommended_action = "continue_sentence"

    if next_element != "none":
        status_message = f"Add a clearer detail about your {BRAND_ELEMENTS[next_element]['description'].lower()}."
    elif recommended_action == "finish_sentence":
        status_message = "Wrap up this sentence with a concrete detail before moving on."
    else:
        status_message = "Keep refining the narrative with more specific detail."

    covered_count = sum(1 for value in covered.values() if value)
    overall_status = "complete" if covered_count >= 6 else "progressing" if covered_count >= 3 else "incomplete"
    overall_assessment = "Complete" if overall_status == "complete" else "Progressing" if overall_status == "progressing" else "Starting"

    return {
        "covered": covered,
        "overall_status": overall_status,
        "overall_assessment": overall_assessment,
        "status_message": status_message,
        "current_sentence_state": sentence_state,
        "recommended_action": recommended_action,
        "next_element": next_element,
    }


def build_blank_state_suggestions(brand_name: str, brand_category: str) -> List[Dict[str, Any]]:
    category = brand_category.strip().lower() or "brand"
    display_name = brand_name.strip() or "This brand"
    return [
        {
            "text": f"{display_name} is a {category} brand that",
            "type": "continuation",
            "targets": ["companyType", "solution"],
            "reasoning": "Start by stating what the brand is and what it offers."
        },
        {
            "text": "We create products for",
            "type": "continuation",
            "targets": ["audience"],
            "reasoning": "Clarify who the brand is trying to serve."
        },
        {
            "text": "What makes us different is",
            "type": "continuation",
            "targets": ["differentiator"],
            "reasoning": "Name the distinctive quality people should remember."
        },
        {
            "text": "Our brand should feel",
            "type": "continuation",
            "targets": ["brandIdentity"],
            "reasoning": "Describe the tone or personality the brand should project."
        }
    ]

async def analyze_progress_with_gpt(
    brand_name: str,
    brand_category: str,
    current_text: str,
    brand_identity: str = "",
    model: str = None,
    temperature: float = None
) -> Dict:
    """Analyze brand description progress using GPT"""

    if not current_text.strip():
        return {
            "covered": {k: False for k in BRAND_ELEMENTS.keys()},
            "overall_status": "incomplete",
            "overall_assessment": "Empty",
            "status_message": "Start by stating what the brand is and who it serves.",
            "current_sentence_state": "fragment",
            "recommended_action": "continue_sentence",
            "next_element": "companyType"
        }

    model = model or MODEL_CONFIG["direction_analysis"]["model"]
    temperature = temperature or MODEL_CONFIG["direction_analysis"]["temperature"]

    try:
        prompt = f"""You are reviewing a draft brand narrative for a small business owner.

This narrative will later be used to generate business goals and post ideas for Instagram, so the writing should become specific, strategic, and easy to build on.

Brand: "{brand_name}" ({brand_category})
Draft brand identity: "{brand_identity or 'Not yet clear'}"

Current narrative draft:
"{current_text}"

Evaluate which brand elements are clearly covered with specific information:
- companyType: Industry/type
- audience: Target audience
- problem: Problem solved
- solution: How/solution
- mission: Mission/vision
- differentiator: What makes it unique
- brandIdentity: Brand personality/voice
- values: Core values

Also judge the current writing state semantically, not just by punctuation:
- Is the current sentence still incomplete?
- Should the writer keep extending it, wrap it up, or move to a new sentence?
- What is the single strongest missing element to add next?

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
  "statusMessage": "One concise sentence telling the writer what to add or improve next.",
  "currentSentenceState": "fragment|developing|complete",
  "recommendedAction": "continue_sentence|finish_sentence|start_new_sentence",
  "nextElement": "companyType|audience|problem|solution|mission|differentiator|brandIdentity|values|none"
}}"""

        response = get_openai_client().chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=400,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return {
            "covered": {k: v for k, v in result.items()
                       if k not in [
                           "overallStatus",
                           "overallAssessment",
                           "statusMessage",
                           "currentSentenceState",
                           "recommendedAction",
                           "nextElement",
                       ]},
            "overall_status": result.get("overallStatus", "incomplete"),
            "overall_assessment": result.get("overallAssessment", "Unknown"),
            "status_message": result.get("statusMessage", "Continue building your brand description"),
            "current_sentence_state": result.get("currentSentenceState", "developing"),
            "recommended_action": result.get("recommendedAction", "continue_sentence"),
            "next_element": result.get("nextElement", "none")
        }
    except Exception as e:
        print(f"GPT analysis error: {e}")
        return infer_fallback_analysis(current_text)

async def generate_suggestions(
    brand_name: str,
    brand_category: str,
    current_text: str,
    brand_identity: str = "",
    session_id: str = "default",
    model_config: Optional[Dict] = None
) -> Dict:
    """Generate autocomplete suggestions using GPT"""

    # Use model config from request or defaults
    suggestion_model = (model_config or {}).get("suggestionModel",
                       MODEL_CONFIG["suggestion_completion"]["model"])
    suggestion_temp = (model_config or {}).get("suggestionTemp",
                      MODEL_CONFIG["suggestion_completion"]["temperature"])

    last_char = current_text.rstrip()[-1:] if current_text.rstrip() else ""
    has_terminal_punctuation = last_char in ['.', '!', '?']
    current_sentence = extract_current_sentence(current_text)

    # Re-run analysis whenever the draft changes so the narrative guidance stays current.
    previous_context = contexts.get(session_id, {})
    if previous_context.get("analysisText") != current_text:
        analysis = await analyze_progress_with_gpt(
            brand_name,
            brand_category,
            current_text,
            brand_identity=brand_identity
        )
        brand_progress[session_id] = analysis
        contexts[session_id] = {"analysisText": current_text}
    else:
        analysis = brand_progress.get(session_id, {})

    covered = analysis.get("covered", {})
    overall_status = analysis.get("overall_status", "incomplete")
    overall_assessment = analysis.get("overall_assessment", "Starting")
    status_message = analysis.get("status_message", "Continue building")
    current_sentence_state = analysis.get("current_sentence_state", "developing")
    recommended_action = analysis.get("recommended_action", "continue_sentence")
    next_element = analysis.get("next_element", "none")
    sentence_ended = has_terminal_punctuation or recommended_action == "start_new_sentence"

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
            suggestions = build_blank_state_suggestions(brand_name, brand_category)
            thinking = "Starting suggestions for blank state"
        else:
            start_time = datetime.now()

            system_prompt = f"""You are helping a small business owner write a strong brand narrative that will later drive business-goal and post-goal suggestions for Instagram.

Brand: {brand_name} ({brand_category})
Draft brand identity: {brand_identity or 'Not yet clear'}
Current narrative draft: "{current_text}"
Current sentence/clause: "{current_sentence}"
Narrative assessment: {overall_assessment}
Current sentence state: {current_sentence_state}
Recommended action: {recommended_action}
Next strongest missing element: {next_element}
Other missing elements: {', '.join(missing_elements[:3]) if missing_elements else 'None'}

Generate 4 smart autocomplete suggestions that help the user write a clearer narrative.

Rules:
- Each suggestion should be a short natural continuation or sentence starter, usually 3-10 words.
- If the recommended action is continue_sentence, mostly extend the current sentence.
- If the recommended action is finish_sentence, offer phrase endings that help the user land the sentence well.
- If the recommended action is start_new_sentence, offer strong next-sentence starters.
- Push the writing toward specificity: what the brand is, who it serves, what it solves, what makes it different, and how it should come across.
- Avoid generic filler like "with innovation" or "for success".
- Make the suggestions sound like real brand-narrative prose, not bullet points or marketing slogans.

Return JSON:
{{
  "thinking": "Brief reasoning about the next narrative move",
  "suggestions": [
    {{"text": "suggestion", "type": "continuation|new_angle|sentence_end", "targets": ["element"], "reasoning": "why this helps the narrative"}}
  ]
}}"""

            response = get_openai_client().chat.completions.create(
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
            raw_suggestions = result.get("suggestions", [])
            suggestions = []
            default_type = "new_angle" if recommended_action == "start_new_sentence" else "sentence_end" if recommended_action == "finish_sentence" else "continuation"

            for item in raw_suggestions:
                text = str((item or {}).get("text", "")).strip()
                if not text:
                    continue

                suggestion_type = str((item or {}).get("type", default_type)).strip()
                if suggestion_type not in VALID_SUGGESTION_TYPES:
                    suggestion_type = default_type

                targets = [
                    target for target in ((item or {}).get("targets") or [])
                    if isinstance(target, str) and target in VALID_TARGETS
                ]
                reasoning = str((item or {}).get("reasoning", "")).strip()

                suggestions.append({
                    "text": text,
                    "type": suggestion_type,
                    "targets": targets[:2],
                    "reasoning": reasoning
                })

    except Exception as e:
        print(f"GPT suggestion error: {e}")
        starters = BRAND_ELEMENTS.get(next_element, BRAND_ELEMENTS["companyType"]).get("starters", [])
        fallback_target = [next_element] if next_element in VALID_TARGETS else []
        default_type = "new_angle" if recommended_action == "start_new_sentence" else "sentence_end" if recommended_action == "finish_sentence" else "continuation"
        suggestions = [
            {"text": starters[0] if starters else "that serves", "type": default_type,
             "targets": fallback_target, "reasoning": "Keep building the next missing part of the narrative."},
            {"text": starters[1] if len(starters) > 1 else "for people who", "type": default_type,
             "targets": fallback_target, "reasoning": "Add a more specific detail."},
            {"text": starters[2].replace("{brandName}", brand_name) if len(starters) > 2 else "and stands out by", "type": default_type,
             "targets": fallback_target, "reasoning": "Clarify what makes the brand distinctive."},
            {"text": "with a brand personality that feels", "type": "new_angle",
             "targets": ["brandIdentity"], "reasoning": "Describe how the brand should come across."}
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
