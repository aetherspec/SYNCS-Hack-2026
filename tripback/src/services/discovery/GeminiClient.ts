import { GoogleGenAI } from '@google/genai';

import { tripBackConfig } from '../../config';
import type {
  Coordinate,
  Discovery,
  GeneratedStory,
  SourceCitation,
  StoryCandidate,
  WalkSession,
} from '../../domain/types';

const responseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['story', 'no_story'] },
    selectedCandidateId: { type: 'string' },
    title: { type: 'string' },
    hook: { type: 'string' },
    story: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['status'],
  additionalProperties: false,
};

type GeminiResult = {
  story: GeneratedStory;
  groundingCitations: SourceCitation[];
};

export async function generateGroundedStory(
  origin: Coordinate,
  candidates: StoryCandidate[],
): Promise<GeminiResult> {
  if (!tripBackConfig.geminiApiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env.local');
  }

  const ai = new GoogleGenAI({ apiKey: tripBackConfig.geminiApiKey });
  const compactCandidates = candidates.slice(0, 12).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    distanceMetres: Math.round(candidate.distanceMetres),
    summary: candidate.summary,
    sourceUrls: candidate.citations.map((citation) => citation.url),
  }));

  const response = await ai.models.generateContent({
    model: tripBackConfig.geminiModel,
    contents: `The walker is at latitude ${origin.latitude}, longitude ${origin.longitude} in Sydney, Australia.

Nearby source candidates:
${JSON.stringify(compactCandidates)}

Choose at most one genuinely interesting historical story within 300 metres. Use only facts supported by the supplied candidates or Google Search. Prefer surprising events and human stories over generic descriptions. Never invent dates, quotations, events, or significance. If evidence is weak, return no_story.

Write a hook of at most 28 words for a lock-screen notification. Then write a story of 180 to 260 words that a walker can read later: what the place is, why it matters, and one grounded human episode. selectedCandidateId must exactly match one supplied candidate id.`,
    config: {
      httpOptions: { timeout: 20_000 },
      systemInstruction:
        'You are TripBack, a careful Sydney local-history editor. Accuracy and source support are more important than producing a story.',
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseJsonSchema: responseSchema,
      temperature: 0.2,
      maxOutputTokens: 1_600,
    },
  });

  if (!response.text) throw new Error('Gemini returned no story response');
  const story = JSON.parse(response.text) as GeneratedStory;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const groundingCitations: SourceCitation[] = groundingChunks.flatMap((chunk) => {
    if (!chunk.web?.uri) return [];
    return [
      {
        title: chunk.web.title || 'Google Search source',
        url: chunk.web.uri,
        provider: 'Google Search' as const,
      },
    ];
  });

  return { story, groundingCitations };
}

const walkSummarySchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['title', 'summary'],
  additionalProperties: false,
};

export async function generateWalkSummary(
  walk: WalkSession,
  discoveries: Discovery[],
): Promise<{ title: string; summary: string }> {
  if (!tripBackConfig.geminiApiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env.local');
  }

  const ai = new GoogleGenAI({ apiKey: tripBackConfig.geminiApiKey });
  const spots = discoveries.slice(0, 12).map((discovery) => ({
    title: discovery.title,
    hook: discovery.hook,
    story: discovery.story.slice(0, 900),
  }));
  const distance = Math.round(walk.distanceMetres);

  const response = await ai.models.generateContent({
    model: tripBackConfig.geminiModel,
    contents: `Summarise this Sydney walk for TripBack history.

Distance about ${distance} metres. Started ${walk.startedAt}.
Places discovered, in order:
${JSON.stringify(spots)}

Write a title of at most 8 words and a 90 to 150 word summary of the walk as a journey through these spots. Use only facts supported by the supplied stories. Do not invent places, dates, or events. If only one place was found, still write a walk summary centred on that spot.`,
    config: {
      httpOptions: { timeout: 15_000 },
      systemInstruction:
        'You are TripBack, a careful Sydney local-history editor writing a walk recap.',
      responseMimeType: 'application/json',
      responseJsonSchema: walkSummarySchema,
      temperature: 0.3,
      maxOutputTokens: 800,
    },
  });

  if (!response.text) throw new Error('Gemini returned no walk summary');
  const generated = JSON.parse(response.text) as { title?: string; summary?: string };
  if (!generated.title?.trim() || !generated.summary?.trim()) {
    throw new Error('Gemini walk summary was incomplete');
  }
  return { title: generated.title.trim(), summary: generated.summary.trim() };
}
