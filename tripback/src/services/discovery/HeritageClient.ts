import { tripBackConfig } from '../../config';
import { distanceMetres } from '../../domain/geo';
import type { Coordinate, StoryCandidate } from '../../domain/types';

type HeritageFeature = {
  attributes: {
    HOITEMID?: number;
    ITEMNAME?: string;
    ADDRESS?: string;
    LGA?: string;
    LISTINGNO?: string;
    Long_?: number;
    Lat?: number;
  };
};

type HeritageResponse = {
  features?: HeritageFeature[];
  error?: { message?: string };
};

const endpoint =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/HMS/Heritage/MapServer/5/query';

export async function fetchHeritageCandidates(
  origin: Coordinate,
  radiusMetres: number = tripBackConfig.searchRadiusMetres,
): Promise<StoryCandidate[]> {
  const params = new URLSearchParams({
    f: 'json',
    geometry: `${origin.longitude},${origin.latitude}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    distance: String(Math.min(10_000, Math.max(10, Math.round(radiusMetres)))),
    units: 'esriSRUnit_Meter',
    outFields: 'HOITEMID,ITEMNAME,ADDRESS,LGA,LISTINGNO,Long_,Lat',
    returnGeometry: 'false',
  });

  const response = await fetch(`${endpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Heritage NSW request failed (${response.status})`);
  }

  const payload = (await response.json()) as HeritageResponse;
  if (payload.error) {
    throw new Error(payload.error.message || 'Heritage NSW returned an error');
  }

  return (payload.features ?? []).flatMap(({ attributes }) => {
    if (
      !attributes.HOITEMID ||
      !attributes.ITEMNAME ||
      attributes.Lat == null ||
      attributes.Long_ == null
    ) {
      return [];
    }

    const coordinate = {
      latitude: attributes.Lat,
      longitude: attributes.Long_,
    };
    const details = [
      'This place is listed on the NSW State Heritage Register.',
      attributes.ADDRESS,
      attributes.LISTINGNO ? `Listing ${attributes.LISTINGNO}.` : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    return [
      {
        id: `heritage-nsw:${attributes.HOITEMID}`,
        title: attributes.ITEMNAME,
        summary: details,
        coordinate,
        distanceMetres: distanceMetres(origin, coordinate),
        citations: [
          {
            title: attributes.ITEMNAME,
            url: `https://www.environment.nsw.gov.au/heritageapp/ViewHeritageItemDetails.aspx?ID=${attributes.HOITEMID}`,
            provider: 'Heritage NSW' as const,
          },
        ],
      },
    ];
  });
}
