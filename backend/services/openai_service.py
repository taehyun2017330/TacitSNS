import os
import json
from openai import AsyncOpenAI

class OpenAIThemeGenerator:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    async def generate_theme_parameters(self, brand_data: dict, count: int = 5) -> list[dict]:
        """
        Generate multiple theme parameter sets based on brand data using OpenAI.
        Returns a list of dicts, each with: name, mood, colors, imagery, tone, caption_length, use_emojis, use_hashtags
        """

        # Build prompt based on brand data
        prompt = f"""You are a social media marketing expert. Based on the following brand information, generate {count} DIFFERENT Instagram theme options with specific parameters.

Brand Information:
- Name: {brand_data.get('name', 'Unknown')}
- Category: {brand_data.get('category', 'Unknown')}
- Description: {brand_data.get('description', '')}
- Target Audience: {brand_data.get('target_audience', '')}
- Major Strengths: {', '.join(brand_data.get('major_strengths', []))}
- Main Products: {', '.join(brand_data.get('main_products', []))}
- Brand Voice: {brand_data.get('brand_voice', '')}

Generate {count} DIVERSE theme options for this brand. Each theme should have a distinct personality and visual direction.
Return ONLY a valid JSON object with a "themes" array:

{{
  "themes": [
    {{
      "name": "Creative theme name (e.g., 'Summer Vibes 2024', 'Product Launch Q1')",
      "mood": "Choose ONE from: Professional, Playful, Elegant, Bold, Minimal, Warm, Modern",
      "colors": ["color1 hex", "color2 hex", "color3 hex", "color4 hex"],
      "imagery": "Choose ONE from: Product-focused, Lifestyle, Flat lay, In-use, Behind-the-scenes",
      "tone": "Choose ONE from: Professional, Casual, Inspirational, Educational, Conversational",
      "caption_length": "Choose ONE from: short, medium, long",
      "use_emojis": true or false,
      "use_hashtags": true or false
    }},
    ... ({count} themes total)
  ]
}}

IMPORTANT: Make each theme DISTINCTLY different - vary the mood, colors, imagery style, and tone across all {count} themes.
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional social media marketing expert who generates diverse, cohesive Instagram themes. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.9,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )

            # Parse the response
            result_text = response.choices[0].message.content
            result = json.loads(result_text)
            themes = result.get('themes', [])

            # Validate each theme
            validated_themes = []
            required_fields = ['name', 'mood', 'colors', 'imagery', 'tone', 'caption_length', 'use_emojis', 'use_hashtags']

            for theme in themes:
                # Ensure all required fields exist
                valid = all(field in theme for field in required_fields)

                # Ensure colors is an array of 4 hex values
                if not isinstance(theme.get('colors'), list) or len(theme.get('colors', [])) != 4:
                    theme['colors'] = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981']

                if valid:
                    validated_themes.append(theme)

            # If we didn't get enough themes, generate defaults
            while len(validated_themes) < count:
                validated_themes.append({
                    "name": f"{brand_data.get('name', 'Brand')} Theme {len(validated_themes) + 1}",
                    "mood": ["Professional", "Playful", "Elegant", "Bold", "Minimal"][len(validated_themes) % 5],
                    "colors": [
                        ["#4F46E5", "#EC4899", "#F59E0B", "#10B981"],
                        ["#DC2626", "#F59E0B", "#10B981", "#3B82F6"],
                        ["#6B7280", "#D1D5DB", "#F3F4F6", "#111827"],
                        ["#EC4899", "#8B5CF6", "#F59E0B", "#10B981"],
                        ["#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6"]
                    ][len(validated_themes) % 5],
                    "imagery": ["Product-focused", "Lifestyle", "Flat lay", "In-use", "Behind-the-scenes"][len(validated_themes) % 5],
                    "tone": ["Professional", "Casual", "Inspirational", "Educational", "Conversational"][len(validated_themes) % 5],
                    "caption_length": "medium",
                    "use_emojis": len(validated_themes) % 2 == 0,
                    "use_hashtags": True
                })

            return validated_themes[:count]

        except Exception as e:
            print(f"Error generating theme parameters: {e}")
            # Return default theme parameters if AI generation fails
            return [
                {
                    "name": f"{brand_data.get('name', 'Brand')} Theme {i + 1}",
                    "mood": ["Professional", "Playful", "Elegant", "Bold", "Minimal"][i % 5],
                    "colors": [
                        ["#4F46E5", "#EC4899", "#F59E0B", "#10B981"],
                        ["#DC2626", "#F59E0B", "#10B981", "#3B82F6"],
                        ["#6B7280", "#D1D5DB", "#F3F4F6", "#111827"],
                        ["#EC4899", "#8B5CF6", "#F59E0B", "#10B981"],
                        ["#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6"]
                    ][i % 5],
                    "imagery": ["Product-focused", "Lifestyle", "Flat lay", "In-use", "Behind-the-scenes"][i % 5],
                    "tone": ["Professional", "Casual", "Inspirational", "Educational", "Conversational"][i % 5],
                    "caption_length": "medium",
                    "use_emojis": i % 2 == 0,
                    "use_hashtags": True
                }
                for i in range(count)
            ]
