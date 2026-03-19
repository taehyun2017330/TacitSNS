import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.AUTOCOMPLETE_PORT || 3002;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============ MODEL CONFIGURATION ============
const MODEL_CONFIG = {
  // Model for analyzing brand progress/direction
  directionAnalysis: {
    model: 'gpt-4o',
    temperature: 0.3
  },
  // Model for generating autocomplete suggestions
  suggestionCompletion: {
    model: 'gpt-4o-mini',
    temperature: 1.0
  }
};

const contexts = new Map();
const brandProgress = new Map();
const currentFocus = new Map();

const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';
function debugLog(...args) {
  if (DEBUG_LOGS) console.log(...args);
}

function messageContentToText(message) {
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && typeof part?.text === 'string') return part.text;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  return '';
}

function parseJsonLenient(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Empty response content');

  try {
    return JSON.parse(trimmed);
  } catch (_) {}

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) {}
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    return JSON.parse(candidate);
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = trimmed.slice(firstBracket, lastBracket + 1);
    return JSON.parse(candidate);
  }

  throw new Error('Unable to parse JSON from model output');
}

const BRAND_ELEMENTS = {
  companyType: {
    keywords: ['is a', 'company', 'brand', 'business', 'startup', 'operates as', 'platform', 'service'],
    description: 'Industry/type',
    starters: ['We operate as', 'Our platform is', '{brandName} is a', 'The company provides', 'We are']
  },
  audience: {
    keywords: ['helps', 'for', 'serves', 'customers', 'people', 'users', 'target', 'built for', 'designed for'],
    description: 'Target audience',
    starters: ['We serve', 'Built for', 'Designed to help', 'Our customers are', 'We work with']
  },
  problem: {
    keywords: ['solves', 'addresses', 'tackles', 'problem', 'challenge', 'need', 'frustration', 'pain point'],
    description: 'Problem solved',
    starters: ['The main problem we solve is', 'We address', 'The challenge is', 'We tackle']
  },
  solution: {
    keywords: ['by', 'through', 'using', 'with', 'creates', 'provides', 'offers', 'delivers', 'approach'],
    description: 'How/solution',
    starters: ['We solve this by', 'Our approach involves', 'We deliver through', 'Our solution is']
  },
  mission: {
    keywords: ['mission', 'goal', 'vision', 'purpose', 'why we exist', 'founded to', 'aim to', 'strive to'],
    description: 'Mission/vision',
    starters: ['Our mission is to', 'We aim to', 'Our goal is', 'We strive to']
  },
  differentiator: {
    keywords: ['unique', 'different', 'unlike', 'special', 'stands out', 'first', 'only', 'what sets us apart'],
    description: 'What makes it unique',
    starters: ['What sets us apart', 'Unlike others, we', 'Our key advantage is', 'What makes us special is']
  },
  brandIdentity: {
    keywords: ['personality', 'tone', 'voice', 'feel', 'vibe', 'sounds like', 'comes across as'],
    description: 'Brand personality/voice',
    starters: ['Our brand personality is', 'Our voice is', 'We communicate with', 'Our tone is']
  },
  values: {
    keywords: ['value', 'care about', 'important to us', 'principle', 'believe in', 'prioritize'],
    description: 'Core values',
    starters: ['We believe in', 'We prioritize', "We're committed to", 'We value']
  }
};

async function analyzeProgressWithGPT(brandName, brandCategory, currentText, model, temperature) {
  if (currentText.trim() === '') {
    const allElements = {};
    for (const key of Object.keys(BRAND_ELEMENTS)) allElements[key] = false;
    return {
      covered: allElements,
      overallStatus: 'incomplete',
      overallAssessment: 'Empty',
      statusMessage: 'Start by introducing what type of brand your company is'
    };
  }

  try {
    const analysisPrompt = `You are a helpful brand strategist analyzing a brand description for "${brandName}" (${brandCategory} category).

Current brand description:
"${currentText}"

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
{
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
}`;

    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: temperature,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const analysisText = messageContentToText(response.choices?.[0]?.message);
    const result = parseJsonLenient(analysisText);

    const { overallStatus, overallAssessment, statusMessage, ...covered } = result;
    return { covered, overallStatus, overallAssessment, statusMessage };
  } catch (error) {
    console.error('GPT analysis failed:', error);
    const covered = {};
    const textLower = currentText.toLowerCase();
    for (const [element, config] of Object.entries(BRAND_ELEMENTS)) {
      covered[element] = config.keywords.some(keyword => textLower.includes(keyword.toLowerCase()));
    }
    return {
      covered,
      overallStatus: 'incomplete',
      overallAssessment: 'Unknown',
      statusMessage: 'Continue building your brand description'
    };
  }
}

function getMissingElements(covered) {
  return Object.entries(BRAND_ELEMENTS)
    .filter(([key, _]) => !covered[key])
    .map(([key, config]) => ({ key, ...config }));
}

app.post('/api/suggestions', async (req, res) => {
  try {
    const {
      brandName,
      brandCategory,
      currentText,
      sessionId,
      modelConfig
    } = req.body;

    const directionModel = modelConfig?.directionModel || MODEL_CONFIG.directionAnalysis.model;
    const directionTemp = modelConfig?.directionTemp ?? MODEL_CONFIG.directionAnalysis.temperature;
    const suggestionModel = modelConfig?.suggestionModel || MODEL_CONFIG.suggestionCompletion.model;
    const suggestionTemp = modelConfig?.suggestionTemp ?? MODEL_CONFIG.suggestionCompletion.temperature;

    debugLog('\n🔍 New suggestion request');
    debugLog('   Brand:', brandName);
    debugLog('   Category:', brandCategory);
    debugLog('   Text length:', currentText.length);

    const lastChar = currentText.trimEnd().slice(-1);
    const sentenceEnded = ['.', '!', '?'].includes(lastChar);
    const lastSentence = currentText.split(/[.!?]/).pop() || '';
    const wordsInSentence = lastSentence.trim().split(/\s+/).filter(Boolean).length;

    // Analyze brand progress
    let covered, missing, progress, total, overallStatus, overallAssessment, statusMessage;

    if (sentenceEnded || currentText.trim() === '') {
      debugLog('   🤖 Running AI analysis...');
      const analysis = await analyzeProgressWithGPT(brandName, brandCategory, currentText, directionModel, directionTemp);
      covered = analysis.covered;
      overallStatus = analysis.overallStatus;
      overallAssessment = analysis.overallAssessment;
      statusMessage = analysis.statusMessage;
      missing = getMissingElements(covered);
      progress = Object.values(covered).filter(Boolean).length;
      total = Object.keys(BRAND_ELEMENTS).length;
      brandProgress.set(sessionId, { covered, missing, progress, total, overallStatus, overallAssessment, statusMessage });
    } else {
      const sessionProgress = brandProgress.get(sessionId) || {};
      covered = sessionProgress.covered || {};
      missing = sessionProgress.missing || getMissingElements(covered);
      progress = sessionProgress.progress || 0;
      total = sessionProgress.total || 8;
      overallStatus = sessionProgress.overallStatus || 'incomplete';
      overallAssessment = sessionProgress.overallAssessment || 'Starting';
      statusMessage = sessionProgress.statusMessage || 'Continue building your brand description';
    }

    debugLog(`   📊 Progress: ${progress}/${total} elements covered`);

    // Generate suggestions using GPT
    let suggestions = [];
    let thinking = '';
    let elapsed = 0;

    if (currentText.trim() === '') {
      // Start with simple suggestions for blank state
      suggestions = [
        { text: `${brandName} is a`, type: 'continuation', targets: ['companyType'], reasoning: 'Introduce your company type' },
        { text: `We help`, type: 'continuation', targets: ['audience'], reasoning: 'Define your audience' },
        { text: `Our mission is to`, type: 'continuation', targets: ['mission'], reasoning: 'State your mission' },
        { text: `${brandName} was founded to solve`, type: 'continuation', targets: ['problem'], reasoning: 'Identify the problem' }
      ];
      thinking = 'Starting suggestions for blank state';
    } else {
      debugLog(`   📤 Sending request to ${suggestionModel}...`);
      const startTime = Date.now();

      const systemPrompt = `You are helping write a brand description for "${brandName}" (${brandCategory}).

Current text: "${currentText}"
Words in current sentence: ${wordsInSentence}
Sentence ended: ${sentenceEnded}

Missing elements: ${missing.map(m => m.description).join(', ')}

Generate 4 contextual suggestions to continue the text. Each suggestion should be 2-5 words.
${sentenceEnded ? 'Start new sentences.' : 'Continue the current sentence.'}

Return JSON:
{
  "thinking": "Brief reasoning",
  "suggestions": [
    {"text": "suggestion text", "type": "continuation", "targets": ["element"], "reasoning": "why this helps"}
  ]
}`;

      try {
        const response = await openai.chat.completions.create({
          model: suggestionModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Continue: "${currentText}"` }
          ],
          temperature: suggestionTemp,
          max_tokens: 300,
          response_format: { type: "json_object" }
        });

        elapsed = Date.now() - startTime;
        const content = messageContentToText(response.choices?.[0]?.message);
        const parsed = parseJsonLenient(content);

        thinking = parsed.thinking || '';
        suggestions = parsed.suggestions || [];

        debugLog(`   ✅ GPT responded in ${elapsed}ms`);
        debugLog(`   💡 Generated ${suggestions.length} suggestions`);
      } catch (error) {
        console.error('GPT error:', error);
        suggestions = [{ text: `${brandName} focuses on`, type: 'continuation' }];
      }
    }

    res.json({
      status: 'success',
      suggestions,
      brandStatus: {
        satisfied: overallStatus === 'complete',
        overallAssessment,
        statusMessage,
        sentenceEnded
      },
      progress: {
        covered: progress,
        total: total,
        percentage: Math.round((progress / total) * 100),
        allElements: Object.entries(BRAND_ELEMENTS).map(([key, config]) => ({
          key,
          description: config.description,
          covered: covered[key] || false
        })),
        recommendation: missing.length > 0 ? {
          hint: `Try adding more about your ${missing[0].description.toLowerCase()}`
        } : null
      },
      debug: {
        thinking,
        elapsed
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      suggestions: []
    });
  }
});

app.post('/api/annotate', async (req, res) => {
  try {
    const { brandName, brandCategory, sentenceText, modelConfig } = req.body || {};

    const directionModel = modelConfig?.directionModel || MODEL_CONFIG.directionAnalysis.model;
    const directionTemp = modelConfig?.directionTemp ?? MODEL_CONFIG.directionAnalysis.temperature;

    // Simple annotation logic
    const segments = [{ text: sentenceText, targets: [] }];
    const sentenceTargets = [];

    res.json({ segments, sentenceTargets });
  } catch (error) {
    console.error('❌ /api/annotate error:', error);
    res.status(500).json({
      error: 'Failed to annotate sentence',
      segments: [{ text: req.body?.sentenceText || '', targets: [] }],
      sentenceTargets: []
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'autocomplete-server' });
});

app.listen(port, () => {
  console.log(`🚀 Autocomplete server running on port ${port}`);
  console.log(`📍 Endpoints available at http://localhost:${port}/api/suggestions`);
});