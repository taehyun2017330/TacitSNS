import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Get API key at runtime
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('⚠️  GEMINI_API_KEY not found in environment variables');
  }
  return key;
}

/**
 * Generate post artifacts for SNS marketing
 * @param {Object} request - Post generation request
 * @returns {Promise<Object>} - Generated posts with trace data
 */
export async function generatePostArtifacts(request) {
  const {
    brandSummary,
    platform = 'instagram',
    aspectRatio = '4:5',
    campaignGoal,
    brandPersona,
    actionType,
    parentNodeId,
    parentImageUrl,
    parentImageKeywords,
    userFeedback, // { likes: [], dislikes: [], unsure: [], reasons: [] }
    direction,
    editOptions,
    novelty = 50,
    selectedCandidateId,
    captionIntent
  } = request;

  let prompt = '';
  let node = null;
  let edge = null;
  let captionNode = null;
  const suggestions = {};

  // Build prompt based on action type
  switch (actionType) {
    case 'initial_batch':
      prompt = buildInitialPostPrompt(brandSummary, platform, aspectRatio, campaignGoal, brandPersona, novelty);
      break;
    case 'explore_batch':
      prompt = buildExplorePostPrompt(brandSummary, parentImageKeywords, userFeedback, direction, novelty, brandPersona);
      break;
    case 'edit_image':
      prompt = buildEditPostPrompt(brandSummary, parentImageUrl, editOptions, novelty);
      break;
    case 'generate_captions':
      return generateCaptionBatch(request);
    case 'edit_caption':
      return editCaptionBatch(request);
    default:
      throw new Error(`Unknown actionType: ${actionType}`);
  }

  // Generate images
  const candidates = [];
  const numImages = actionType === 'edit_image' ? 1 : 4;

  try {
    if (actionType === 'explore_batch' && parentImageUrl) {
      // Explore from parent with different directions
      const moodDirections = getMoodDirections(userFeedback, brandPersona);
      const promises = moodDirections.slice(0, 4).map((moodDir, index) => {
        const variedPrompt = `${prompt}\n\n${moodDir}`;
        return callGeminiImageAPI(variedPrompt, brandSummary, parentImageUrl, novelty);
      });
      const results = await Promise.all(promises);

      // Analyze each image for keywords
      for (const imageUrl of results.filter(Boolean)) {
        const analysis = await analyzeImage(imageUrl, brandSummary, brandPersona);
        candidates.push({
          id: `img-${uuidv4()}`,
          image: imageUrl,
          keywords: analysis.keywords,
          vibe: analysis.vibe,
          attributes: analysis.attributes
        });
      }
    } else if (actionType === 'edit_image' && parentImageUrl) {
      // Single edited image
      const result = await callGeminiImageAPI(prompt, brandSummary, parentImageUrl, 10); // Low novelty for edits
      if (result) {
        const analysis = await analyzeImage(result, brandSummary, brandPersona);
        candidates.push({
          id: `img-${uuidv4()}`,
          image: result,
          keywords: analysis.keywords,
          vibe: analysis.vibe,
          attributes: analysis.attributes
        });
      }
    } else {
      // Initial batch - 4 different mood variations
      const moodDirections = getInitialMoodDirections();
      const promises = moodDirections.map((moodDir, index) => {
        const variedPrompt = `${prompt}\n\n${moodDir}`;
        return callGeminiImageAPI(variedPrompt, brandSummary, null, novelty);
      });
      const results = await Promise.all(promises);

      for (const imageUrl of results.filter(Boolean)) {
        const analysis = await analyzeImage(imageUrl, brandSummary, brandPersona);
        candidates.push({
          id: `img-${uuidv4()}`,
          image: imageUrl,
          keywords: analysis.keywords,
          vibe: analysis.vibe,
          attributes: analysis.attributes
        });
      }
    }

    // Fallback to placeholders if needed
    while (candidates.length < numImages) {
      const placeholderImage = generatePlaceholderPost(brandSummary, candidates.length);
      const analysis = {
        keywords: ['placeholder', 'sample', 'demo'],
        vibe: 'Sample placeholder image',
        attributes: { warmth: 0.5, commercialness: 0.5, minimalism: 0.5 }
      };
      candidates.push({
        id: `img-${uuidv4()}`,
        image: placeholderImage,
        keywords: analysis.keywords,
        vibe: analysis.vibe,
        attributes: analysis.attributes
      });
    }

  } catch (error) {
    console.error('Image generation error:', error.message);
    // Generate placeholders
    for (let i = 0; i < numImages; i++) {
      const placeholderImage = generatePlaceholderPost(brandSummary, i);
      candidates.push({
        id: `img-${uuidv4()}`,
        image: placeholderImage,
        keywords: ['placeholder'],
        vibe: 'Placeholder',
        attributes: {}
      });
    }
  }

  // Extract aggregate mood from all candidates
  const aggregateMood = extractAggregateMood(candidates);

  // Create node
  node = {
    nodeId: uuidv4(),
    type: 'image_batch',
    parentNodeId: parentNodeId || null,
    createdAt: Date.now(),
    candidates,
    aggregateMood
  };

  // Create edge with delta description
  if (parentNodeId) {
    const delta = await summarizeDelta(
      parentImageKeywords,
      aggregateMood,
      direction,
      novelty,
      userFeedback,
      brandPersona
    );

    edge = {
      edgeId: uuidv4(),
      actionType,
      direction: direction || 'exploration',
      novelty,
      delta: delta.delta,
      whyItFits: delta.whyItFits,
      signals: delta.signals
    };
  }

  // Generate suggestions
  suggestions.directions = generateDirectionSuggestions(userFeedback, aggregateMood);
  suggestions.editPresets = generateEditPresets(aggregateMood);

  return {
    node,
    edge,
    captionNode,
    suggestions
  };
}

/**
 * Build initial post generation prompt
 */
function buildInitialPostPrompt(brandSummary, platform, aspectRatio, campaignGoal, brandPersona, novelty) {
  let prompt = `Create 1 social media marketing image for this brand.\n\n`;

  prompt += `Platform: ${platform}, aspect ratio ${aspectRatio}.\n`;

  if (campaignGoal) {
    prompt += `Campaign Goal: ${campaignGoal}\n`;
  }

  prompt += `\nBrand Context:\n${brandSummary}\n\n`;

  if (brandPersona && brandPersona.length > 0) {
    prompt += `Brand Persona (tacit vibe we want):\n`;
    prompt += brandPersona.join(', ') + '\n\n';
  }

  prompt += `Content Constraints:
- No visible text in the image (unless specified)
- Keep it authentic and believable, not stock-photo-like
- Leave subtle negative space for possible caption overlay
- Avoid overly commercial lighting and heavy sales aesthetics
- Focus on emotion and storytelling over direct product shots
- Natural, candid feel preferred over posed/staged

Visual Style:
- Platform-optimized: ${aspectRatio} aspect ratio
- High quality but not overly polished
- Authentic moments over perfect compositions
- ${getNoveltyGuidance(novelty)}

Generate a single distinct image that feels genuine and aligns with the brand persona.`;

  return prompt;
}

/**
 * Build explore post prompt based on feedback
 */
function buildExplorePostPrompt(brandSummary, parentKeywords, userFeedback, direction, novelty, brandPersona) {
  let prompt = `Generate a new social media image variation.\n\n`;

  prompt += `Brand Context:\n${brandSummary}\n\n`;

  if (parentKeywords && parentKeywords.length > 0) {
    prompt += `Parent Image Characteristics:\n`;
    prompt += parentKeywords.join(', ') + '\n\n';
  }

  // Process user feedback
  if (userFeedback) {
    if (userFeedback.likes && userFeedback.likes.length > 0) {
      prompt += `Keep These Elements (User Liked):\n`;
      prompt += userFeedback.likes.join(', ') + '\n\n';
    }

    if (userFeedback.dislikes && userFeedback.dislikes.length > 0) {
      prompt += `Change These Elements (User Disliked):\n`;
      prompt += userFeedback.dislikes.join(', ') + '\n\n';
    }

    if (userFeedback.unsure && userFeedback.unsure.length > 0) {
      prompt += `Refine These Elements (User Unsure):\n`;
      prompt += userFeedback.unsure.join(', ') + '\n\n';
    }
  }

  if (direction) {
    prompt += `Specific Direction: ${direction}\n\n`;
  }

  prompt += `Exploration Control:\n`;
  prompt += `Novelty ${novelty}% - ${getNoveltyGuidance(novelty)}\n\n`;

  prompt += `Generate a refined image that responds to the feedback while maintaining brand authenticity.`;

  return prompt;
}

/**
 * Build edit prompt for targeted changes
 */
function buildEditPostPrompt(brandSummary, parentImageUrl, editOptions, strictness = 10) {
  let prompt = `CRITICAL: Edit the existing image shown above.\n\n`;

  prompt += `PRIMARY INSTRUCTION: PRESERVE THE EXISTING IMAGE EXACTLY.\n`;
  prompt += `Only apply the specific changes listed below. Everything else must remain identical.\n\n`;

  prompt += `KEEP EXACTLY AS IS:
- The overall composition and framing
- The lighting direction and quality (unless specified)
- The color grading (unless specified)
- The background elements (unless specified)
- All elements not mentioned in the edit requests\n\n`;

  prompt += `ONLY APPLY THESE SPECIFIC CHANGES:\n`;

  if (editOptions?.suggestedEdits && editOptions.suggestedEdits.length > 0) {
    editOptions.suggestedEdits.forEach(edit => {
      prompt += `- ${edit}\n`;
    });
  }

  if (editOptions?.customEdit) {
    prompt += `- ${editOptions.customEdit}\n`;
  }

  prompt += `\nThis is a targeted edit, not a regeneration. Strictness: ${strictness}%`;

  return prompt;
}

/**
 * Generate caption batch for selected image(s)
 */
async function generateCaptionBatch(request) {
  const {
    selectedCandidateId,
    imageKeywords,
    brandSummary,
    brandPersona,
    captionIntent,
    toneTargets = ['professional', 'casual'],
    includeHashtags = true,
    includeEmojis = false,
    length = 'medium'
  } = request;

  const captions = [];

  // Different caption styles
  const captionStyles = [
    { style: 'storytelling', tone: 'warm' },
    { style: 'question', tone: 'engaging' },
    { style: 'benefit-focused', tone: 'persuasive' },
    { style: 'minimalist', tone: 'clean' }
  ];

  for (const { style, tone } of captionStyles) {
    const captionPrompt = buildCaptionPrompt(
      imageKeywords,
      brandSummary,
      brandPersona,
      style,
      tone,
      captionIntent,
      includeHashtags,
      includeEmojis,
      length
    );

    try {
      const caption = await generateSingleCaption(captionPrompt);
      captions.push({
        id: `cap-${uuidv4()}`,
        text: caption.text,
        style,
        tone,
        toneTags: caption.toneTags,
        deltaFromParent: null
      });
    } catch (error) {
      console.error('Caption generation error:', error);
      // Fallback caption
      captions.push({
        id: `cap-${uuidv4()}`,
        text: generateFallbackCaption(brandSummary, style),
        style,
        tone,
        toneTags: [tone],
        deltaFromParent: null
      });
    }
  }

  const node = {
    nodeId: uuidv4(),
    type: 'caption_batch',
    parentNodeId: selectedCandidateId,
    createdAt: Date.now(),
    candidates: captions,
    aggregateMood: toneTargets
  };

  const edge = selectedCandidateId ? {
    edgeId: uuidv4(),
    actionType: 'generate_captions',
    direction: 'caption_creation',
    novelty: 50,
    delta: `Generated ${captions.length} caption variations`,
    whyItFits: `Matched brand voice and image keywords`,
    signals: imageKeywords
  } : null;

  return {
    node,
    edge,
    captionNode: node,
    suggestions: {
      toneShifts: ['more casual', 'more urgent', 'more emotional', 'more factual'],
      lengthOptions: ['shorter', 'longer', 'add CTA', 'remove hashtags']
    }
  };
}

/**
 * Build caption generation prompt
 */
function buildCaptionPrompt(imageKeywords, brandSummary, brandPersona, style, tone, intent, includeHashtags, includeEmojis, length) {
  let prompt = `Generate a social media caption.\n\n`;

  prompt += `Brand: ${brandSummary}\n`;
  prompt += `Image Keywords: ${imageKeywords.join(', ')}\n`;
  prompt += `Brand Voice: ${brandPersona.join(', ')}\n\n`;

  prompt += `Caption Requirements:\n`;
  prompt += `- Style: ${style}\n`;
  prompt += `- Tone: ${tone}\n`;
  prompt += `- Length: ${length} (${getLengthDescription(length)})\n`;
  prompt += `- ${includeHashtags ? 'Include 3-5 relevant hashtags' : 'No hashtags'}\n`;
  prompt += `- ${includeEmojis ? 'Include 1-2 subtle emojis' : 'No emojis'}\n`;

  if (intent) {
    prompt += `- Intent: ${intent}\n`;
  }

  prompt += `\nGenerate a caption that feels authentic and matches the brand voice.`;

  return prompt;
}

/**
 * Analyze image to extract keywords and vibe
 */
async function analyzeImage(imageBase64, brandSummary, brandPersona) {
  try {
    const GEMINI_API_KEY = getGeminiApiKey();
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const prompt = `Analyze this social media image and return JSON only.

Brand Context: ${brandSummary}
Brand Persona: ${brandPersona.join(', ')}

Return a JSON object with:
- "keywords": array of 5-10 descriptive keywords
- "vibe": one sentence describing the overall feeling
- "attributes": object with scores (0-1) for: warmth, commercialness, minimalism, authenticity, energy

JSON only, no other text:`;

    const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Data
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            responseSchema: {
              type: "object",
              properties: {
                keywords: { type: "array", items: { type: "string" } },
                vibe: { type: "string" },
                attributes: {
                  type: "object",
                  properties: {
                    warmth: { type: "number" },
                    commercialness: { type: "number" },
                    minimalism: { type: "number" },
                    authenticity: { type: "number" },
                    energy: { type: "number" }
                  }
                }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (content) {
      try {
        return JSON.parse(content);
      } catch {
        // Fallback if JSON parsing fails
        return {
          keywords: ['visual', 'content', 'social', 'media', 'post'],
          vibe: 'Standard social media content',
          attributes: {
            warmth: 0.5,
            commercialness: 0.5,
            minimalism: 0.5,
            authenticity: 0.5,
            energy: 0.5
          }
        };
      }
    }
  } catch (error) {
    console.error('Image analysis error:', error);
    return {
      keywords: ['image', 'post', 'content'],
      vibe: 'Unable to analyze',
      attributes: {}
    };
  }
}

/**
 * Summarize what changed between generations
 */
async function summarizeDelta(parentKeywords, newKeywords, direction, novelty, userFeedback, brandPersona) {
  try {
    // Build a description of the change
    let delta = '';
    let whyItFits = '';
    const signals = [];

    // Analyze feedback signals
    if (userFeedback) {
      if (userFeedback.likes?.length > 0) {
        signals.push(...userFeedback.likes.map(l => `liked: ${l}`));
      }
      if (userFeedback.dislikes?.length > 0) {
        signals.push(...userFeedback.dislikes.map(d => `rejected: ${d}`));
      }
      if (userFeedback.unsure?.length > 0) {
        signals.push(...userFeedback.unsure.map(u => `unsure: ${u}`));
      }
    }

    // Generate delta description
    if (direction) {
      delta = `Explored "${direction}" direction`;
    } else if (novelty > 70) {
      delta = 'Significant departure from previous style';
    } else if (novelty > 30) {
      delta = 'Moderate refinements to composition and mood';
    } else {
      delta = 'Subtle adjustments while maintaining core elements';
    }

    // Add specific changes if we have keywords
    if (parentKeywords && newKeywords) {
      const removed = parentKeywords.filter(k => !newKeywords.includes(k));
      const added = newKeywords.filter(k => !parentKeywords.includes(k));

      if (removed.length > 0 || added.length > 0) {
        delta += '; ';
        if (removed.length > 0) delta += `removed ${removed.slice(0, 2).join(', ')}`;
        if (removed.length > 0 && added.length > 0) delta += ', ';
        if (added.length > 0) delta += `added ${added.slice(0, 2).join(', ')}`;
      }
    }

    // Generate why it fits
    if (brandPersona && brandPersona.length > 0) {
      whyItFits = `Aligns with brand persona: ${brandPersona.slice(0, 3).join(', ')}`;
    } else {
      whyItFits = 'Maintains brand consistency while exploring new directions';
    }

    if (signals.length > 0) {
      whyItFits += ` and responds to user feedback`;
    }

    return {
      delta,
      whyItFits,
      signals: signals.slice(0, 3)
    };
  } catch (error) {
    console.error('Delta summarization error:', error);
    return {
      delta: 'Variation generated',
      whyItFits: 'Aligns with brand direction',
      signals: []
    };
  }
}

/**
 * Call Gemini Image Generation API
 */
async function callGeminiImageAPI(prompt, brandSummary, previousImageUrl = null, novelty = 50) {
  try {
    const GEMINI_API_KEY = getGeminiApiKey();
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const imagePrompt = `Social media marketing image: ${prompt}

Style: Professional photography, authentic, non-stock-photo quality.
Avoid: Obvious AI artifacts, unrealistic elements, text overlays.`;

    const parts = [];

    // Include previous image if provided
    if (previousImageUrl && previousImageUrl.startsWith('data:image/')) {
      const base64Match = previousImageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64Match[1]
          }
        });
        parts.push({
          text: `Reference the image above. Novelty: ${novelty}%. ${imagePrompt}`
        });
      } else {
        parts.push({ text: imagePrompt });
      }
    } else {
      parts.push({ text: imagePrompt });
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.7 + (novelty / 200) // Scale temperature with novelty
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract image from response
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('No image in response');
  } catch (error) {
    console.error('Gemini image generation error:', error);
    throw error;
  }
}

/**
 * Generate a single caption using Gemini
 */
async function generateSingleCaption(prompt) {
  try {
    const GEMINI_API_KEY = getGeminiApiKey();
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt + '\n\nReturn JSON with "text" and "toneTags" fields only.' }]
          }],
          generationConfig: {
            temperature: 0.8,
            responseSchema: {
              type: "object",
              properties: {
                text: { type: "string" },
                toneTags: { type: "array", items: { type: "string" } }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (content) {
      try {
        return JSON.parse(content);
      } catch {
        return {
          text: content,
          toneTags: ['generated']
        };
      }
    }

    throw new Error('No caption generated');
  } catch (error) {
    console.error('Caption generation error:', error);
    throw error;
  }
}

// Helper functions

function getNoveltyGuidance(novelty) {
  if (novelty >= 80) {
    return 'Highly experimental and distinctive';
  } else if (novelty >= 60) {
    return 'Notable creative variation';
  } else if (novelty >= 40) {
    return 'Balanced refinement with some exploration';
  } else if (novelty >= 20) {
    return 'Conservative adjustments to proven elements';
  } else {
    return 'Minimal changes, stay very close to reference';
  }
}

function getMoodDirections(userFeedback, brandPersona) {
  const directions = [];

  // Base directions
  const baseDirections = [
    "Direction 1: warmer natural light, candid, human, less polished",
    "Direction 2: clean minimal composition, more negative space, calmer palette",
    "Direction 3: energetic, playful, bold color accents, but still authentic",
    "Direction 4: premium + calm, muted tones, soft contrast, not salesy"
  ];

  // Adjust based on feedback
  if (userFeedback?.dislikes?.includes('too commercial')) {
    directions.push("More authentic, documentary-style, unposed moments");
  }
  if (userFeedback?.likes?.includes('warm')) {
    directions.push("Golden hour lighting, cozy atmosphere, inviting tones");
  }
  if (userFeedback?.unsure?.includes('composition')) {
    directions.push("Experiment with rule of thirds, leading lines, depth");
  }

  // Fill with base directions
  while (directions.length < 4) {
    directions.push(baseDirections[directions.length]);
  }

  return directions;
}

function getInitialMoodDirections() {
  return [
    "Direction 1: warm, inviting, human-centered, natural lighting",
    "Direction 2: minimal, clean, sophisticated, plenty of white space",
    "Direction 3: vibrant, energetic, dynamic, eye-catching",
    "Direction 4: muted, calm, premium, understated elegance"
  ];
}

function extractAggregateMood(candidates) {
  const allKeywords = [];
  candidates.forEach(c => {
    if (c.keywords) {
      allKeywords.push(...c.keywords);
    }
  });

  // Count frequency
  const frequency = {};
  allKeywords.forEach(k => {
    frequency[k] = (frequency[k] || 0) + 1;
  });

  // Return top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword]) => keyword);
}

function generateDirectionSuggestions(userFeedback, currentMood) {
  const suggestions = [];

  // Opposite of dislikes
  if (userFeedback?.dislikes?.includes('too commercial')) {
    suggestions.push('more candid');
  }
  if (userFeedback?.dislikes?.includes('cold')) {
    suggestions.push('warmer tones');
  }

  // Variations of current mood
  if (currentMood.includes('minimal')) {
    suggestions.push('add subtle details', 'increase warmth');
  }
  if (currentMood.includes('warm')) {
    suggestions.push('cooler palette', 'more dramatic lighting');
  }

  // Always include these
  suggestions.push('less commercial', 'more authentic', 'cleaner composition', 'bolder contrast');

  return [...new Set(suggestions)].slice(0, 6);
}

function generateEditPresets(currentMood) {
  const presets = [];

  if (currentMood.includes('warm')) {
    presets.push('reduce warmth keep golden tones');
  }
  if (currentMood.includes('minimal')) {
    presets.push('add subtle texture');
  }

  // Standard edits
  presets.push(
    'increase negative space',
    'reduce saturation keep vibrancy',
    'soften contrast',
    'add subtle vignette',
    'crop tighter',
    'blur background slightly'
  );

  return presets.slice(0, 6);
}

function getLengthDescription(length) {
  switch (length) {
    case 'short': return '1-2 lines, under 50 characters';
    case 'medium': return '3-4 lines, 100-150 characters';
    case 'long': return '5+ lines, 200+ characters';
    default: return '3-4 lines';
  }
}

function generateFallbackCaption(brandSummary, style) {
  const templates = {
    storytelling: `Every moment tells a story. This is ours. ${brandSummary.slice(0, 50)}...`,
    question: `What inspires you today? We're curious about your journey.`,
    'benefit-focused': `Experience the difference. Quality that speaks for itself.`,
    minimalist: `Simple. Authentic. Us.`
  };

  return templates[style] || 'Discover more with us.';
}

function generatePlaceholderPost(brandSummary, index) {
  // Create colored placeholder images
  const colors = ['FF6B6B', '4ECDC4', 'FFE66D', '95E1D3'];
  const color = colors[index % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
    <rect width="800" height="1000" fill="#${color}"/>
    <text x="400" y="500" font-family="Arial, sans-serif" font-size="60" font-weight="bold"
          text-anchor="middle" fill="white">Sample Post ${index + 1}</text>
    <text x="400" y="560" font-family="Arial, sans-serif" font-size="30"
          text-anchor="middle" fill="white" opacity="0.8">${brandSummary.slice(0, 20)}...</text>
  </svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Export functions
export default {
  generatePostArtifacts
};

export {
  analyzeImage,
  summarizeDelta,
  generateCaptionBatch
};