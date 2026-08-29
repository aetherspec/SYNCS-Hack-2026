import { tripBackConfig } from '../../config';
import type { Coordinate, Discovery, StoryCandidate } from '../../domain/types';
import { persistRemoteImage, imageDataUri } from '../images/persistRemoteImage';
import { fetchHeritageCandidates } from './HeritageClient';
import { generateGroundedStory } from './GeminiClient';
import {
  fetchWikimediaImageForPlace,
  fetchWikipediaCandidates,
} from './WikipediaClient';

function deduplicateCandidates(candidates: StoryCandidate[]): StoryCandidate[] {
  const byId = new Map<string, StoryCandidate>();
  for (const candidate of candidates) byId.set(candidate.id, candidate);
  return [...byId.values()].sort((a, b) => candidateScore(a) - candidateScore(b));
}

function candidateScore(candidate: StoryCandidate): number {
  const hasWikipediaSource = candidate.citations.some(
    (citation) => citation.provider === 'Wikipedia',
  );
  const readableContextBonus = candidate.summary.length >= 300 ? 35 : 0;
  const imageBonus = candidate.imageUrl ? 25 : 0;
  const wikipediaBonus = hasWikipediaSource ? 50 : 0;
  return candidate.distanceMetres - readableContextBonus - imageBonus - wikipediaBonus;
}

function uniqueCitations(citations: Discovery['citations']): Discovery['citations'] {
  return [...new Map(citations.map((citation) => [citation.url, citation])).values()];
}

export async function listNearbyPlaces(
  origin: Coordinate,
): Promise<StoryCandidate[]> {
  const settled = await Promise.allSettled([
    fetchWikipediaCandidates(origin),
    fetchHeritageCandidates(origin),
  ]);
  const candidates = deduplicateCandidates(
    settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
  );

  const nearest = candidates.slice(0, 12);
  const enriched = await Promise.all(
    nearest.map(async (candidate, index) => {
      if (candidate.imageUrl || index >= 8) return candidate;
      const imageUrl = await fetchWikimediaImageForPlace(candidate.title);
      return imageUrl ? { ...candidate, imageUrl } : candidate;
    }),
  );
  return enriched;
}

export async function discoverStory(
  origin: Coordinate,
  hasSeenCandidate: (candidateId: string) => Promise<boolean>,
  walkId?: string,
): Promise<Discovery | null> {
  const candidates = await listNearbyPlaces(origin);
  const unseen: StoryCandidate[] = [];
  for (const candidate of candidates) {
    if (!(await hasSeenCandidate(candidate.id))) unseen.push(candidate);
  }

  const eligible = unseen.filter(
    (candidate) => candidate.distanceMetres <= tripBackConfig.notificationRadiusMetres,
  );
  if (eligible.length === 0) return null;

  const { story, groundingCitations } = await generateGroundedStory(origin, eligible);
  if (story.status !== 'story' || !story.selectedCandidateId) return null;

  const selected = eligible.find(
    (candidate) => candidate.id === story.selectedCandidateId,
  );
  if (!selected || !story.title || !story.hook || !story.story) return null;

  const storedImage = await persistRemoteImage(selected.imageUrl);
  return {
    id: `${selected.id}:${Date.now()}`,
    walkId,
    candidateId: selected.id,
    title: story.title,
    hook: story.hook,
    story: story.story,
    coordinate: selected.coordinate,
    imageUrl: selected.imageUrl,
    imageBase64: storedImage.base64,
    imageMimeType: storedImage.mimeType,
    imageDataUri: imageDataUri(storedImage.base64, storedImage.mimeType) ?? selected.imageUrl,
    confidence: story.confidence ?? 0.5,
    citations: uniqueCitations([...selected.citations, ...groundingCitations]),
    discoveredAt: new Date().toISOString(),
  };
}
