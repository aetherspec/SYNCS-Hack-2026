import { GoogleGenAI } from '@google/genai';

import { tripBackConfig } from '../../config';
import type { EraEvent } from '../../domain/eras';
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

const heritageSummarySchema = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    summary: { type: 'string' },
    events: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          year: { type: 'string', pattern: '^(17|18|19|20)\\d{2}$' },
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['year', 'title', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['description', 'summary', 'events'],
  additionalProperties: false,
};

export type HeritageSummary = {
  description: string;
  summary: string;
  events: EraEvent[];
};

const heritageSummaryRequests = new Map<string, Promise<HeritageSummary>>();

/**
 * Researches a Heritage NSW-only map result so its detail page is useful even
 * when there is no corresponding Wikipedia article. Requests are cached for
 * the lifetime of the app to avoid spending quota after GPS updates/rerenders.
 */
export function generateHeritageSummary(
  title: string,
  heritageItemId: string,
  origin?: Coordinate,
): Promise<HeritageSummary> {
  const cacheKey = `${heritageItemId}:${title}`;
  const existing = heritageSummaryRequests.get(cacheKey);
  if (existing) return existing;

  const request = generateHeritageSummaryUncached(title, heritageItemId, origin).catch(error => {
    heritageSummaryRequests.delete(cacheKey);
    throw error;
  });
  heritageSummaryRequests.set(cacheKey, request);
  return request;
}

async function generateHeritageSummaryUncached(
  title: string,
  heritageItemId: string,
  origin?: Coordinate,
): Promise<HeritageSummary> {
  if (!tripBackConfig.geminiApiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env.local');
  }

  const ai = new GoogleGenAI({ apiKey: tripBackConfig.geminiApiKey });
  const locationHint = origin
    ? `The user opened it near latitude ${origin.latitude}, longitude ${origin.longitude}.`
    : 'The place is in New South Wales, Australia.';
  const heritageUrl =
    `https://www.environment.nsw.gov.au/heritageapp/` +
    `ViewHeritageItemDetails.aspx?ID=${encodeURIComponent(heritageItemId)}`;

  const response = await ai.models.generateContent({
    model: tripBackConfig.geminiModel,
    contents: `Research this exact historical place using Google Search:

Place name: ${title}
Heritage NSW item ID: ${heritageItemId}
Official Heritage NSW record: ${heritageUrl}
${locationHint}

Write a lively but factual 90 to 150 word overview explaining what the place was, who used it, and why it matters. Provide a short place-type description and up to three genuinely significant dated events suitable for reconstruction choices. Each event detail must explain what happened in that year. Prefer construction, opening, rebuilding, major use changes, or a documented human event. Do not use the date it was placed on a heritage register unless that listing is itself historically significant. Combine a construction range into one event rather than returning adjacent duplicate years. Never invent or guess a date. If no exact dated event can be verified, return an empty events array.`,
    config: {
      httpOptions: { timeout: 20_000 },
      systemInstruction:
        'You are TripBack, a careful NSW local-history editor. Use the exact place and official record supplied. Accuracy is more important than filling every field.',
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseJsonSchema: heritageSummarySchema,
      temperature: 0.15,
      maxOutputTokens: 1_200,
    },
  });

  if (!response.text) throw new Error('Gemini returned no heritage summary');
  const generated = JSON.parse(response.text) as Partial<HeritageSummary>;
  const summary = generated.summary?.trim();
  if (!summary) throw new Error('Gemini heritage summary was incomplete');

  const currentYear = new Date().getFullYear();
  const events = Array.isArray(generated.events)
    ? generated.events
        .filter(
          event =>
            /^(17|18|19|20)\d{2}$/.test(event?.year ?? '') &&
            Number(event.year) <= currentYear &&
            event.title?.trim() &&
            event.detail?.trim(),
        )
        .map(event => ({
          year: event.year,
          title: event.title.trim(),
          detail: event.detail.trim(),
        }))
        .filter((event, index, all) => all.findIndex(item => item.year === event.year) === index)
        .slice(0, 3)
    : [];

  return {
    description: generated.description?.trim() || 'NSW heritage place',
    summary,
    events,
  };
}

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
