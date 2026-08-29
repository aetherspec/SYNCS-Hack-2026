import { tripBackConfig } from '../../config';
import { distanceMetres } from '../../domain/geo';
import type { Coordinate, StoryCandidate } from '../../domain/types';

type WikipediaPage = {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  thumbnail?: { source?: string };
};

type WikipediaResponse = {
  query?: { pages?: WikipediaPage[] };
};

type WikimediaImagePage = {
  imageinfo?: Array<{ thumburl?: string; url?: string }>;
};

type WikimediaImageResponse = {
  query?: { pages?: WikimediaImagePage[] };
};

const endpoint = 'https://en.wikipedia.org/w/api.php';
const commonsEndpoint = 'https://commons.wikimedia.org/w/api.php';
const imageCache = new Map<string, string | undefined>();
const placePhotoCache = new Map<string, string | undefined>();

export async function fetchWikimediaImageForPlace(
  title: string,
): Promise<string | undefined> {
  const cacheKey = title.toLocaleLowerCase();
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: title,
    gsrnamespace: '6',
    gsrlimit: '1',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '900',
    format: 'json',
    formatversion: '2',
  });

  try {
    const response = await fetch(`${commonsEndpoint}?${params.toString()}`);
    if (!response.ok) return undefined;
    const payload = (await response.json()) as WikimediaImageResponse;
    const image = payload.query?.pages?.[0]?.imageinfo?.[0];
    const imageUrl = image?.thumburl ?? image?.url;
    imageCache.set(cacheKey, imageUrl);
    return imageUrl;
  } catch {
    imageCache.set(cacheKey, undefined);
    return undefined;
  }
}

/** Wikipedia page thumbnail, then Wikimedia Commons, for a place name. */
export async function fetchPlacePhoto(title: string): Promise<string | undefined> {
  const cacheKey = title.trim().toLocaleLowerCase();
  if (!cacheKey) return undefined;
  if (placePhotoCache.has(cacheKey)) return placePhotoCache.get(cacheKey);

  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: title,
      gsrlimit: '1',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '900',
      format: 'json',
      formatversion: '2',
    });
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (response.ok) {
      const payload = (await response.json()) as WikipediaResponse;
      const imageUrl = payload.query?.pages?.[0]?.thumbnail?.source;
      if (imageUrl) {
        placePhotoCache.set(cacheKey, imageUrl);
        return imageUrl;
      }
    }
  } catch {
    // Fall through to Commons.
  }

  const commons = await fetchWikimediaImageForPlace(title);
  placePhotoCache.set(cacheKey, commons);
  return commons;
}

export async function fetchWikipediaCandidates(
  origin: Coordinate,
  radiusMetres: number = tripBackConfig.searchRadiusMetres,
  limit: number = 12,
): Promise<StoryCandidate[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'geosearch',
    ggscoord: `${origin.latitude}|${origin.longitude}`,
    ggsradius: String(Math.min(10_000, Math.max(10, Math.round(radiusMetres)))),
    ggslimit: String(Math.min(50, Math.max(1, limit))),
    prop: 'coordinates|extracts|pageimages|info',
    exintro: '1',
    explaintext: '1',
    exsentences: '8',
    piprop: 'thumbnail',
    pithumbsize: '900',
    inprop: 'url',
    format: 'json',
    formatversion: '2',
  });

  const response = await fetch(`${endpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Wikipedia request failed (${response.status})`);
  }

  const payload = (await response.json()) as WikipediaResponse;
  return (payload.query?.pages ?? []).flatMap((page) => {
    const location = page.coordinates?.[0];
    if (!location || !page.extract || !page.fullurl) return [];

    const coordinate = {
      latitude: location.lat,
      longitude: location.lon,
    };

    return [
      {
        id: `wikipedia:${page.pageid}`,
        title: page.title,
        summary: page.extract.slice(0, 2_000),
        coordinate,
        distanceMetres: distanceMetres(origin, coordinate),
        imageUrl: page.thumbnail?.source,
        citations: [
          {
            title: page.title,
            url: page.fullurl,
            provider: 'Wikipedia' as const,
          },
        ],
      },
    ];
  });
}
