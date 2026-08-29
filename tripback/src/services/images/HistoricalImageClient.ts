import { GoogleGenAI } from '@google/genai';

import { tripBackConfig } from '../../config';
import type { Coordinate, StoryCandidate } from '../../domain/types';

export type HistoricalImageResult = {
  imageDataUri: string;
  base64: string;
  mimeType: string;
  note?: string;
};

export async function createHistoricalView({
  imageBase64,
  mimeType,
  coordinate,
  place,
  year,
}: {
  imageBase64: string;
  mimeType: string;
  coordinate: Coordinate;
  place?: StoryCandidate;
  year: string;
}): Promise<HistoricalImageResult> {
  const placeContext = place
    ? `${place.title}. Source-backed context: ${place.summary}. Reference links: ${place.citations
        .map((citation) => citation.url)
        .join(', ')}`
    : 'No named landmark was found nearby; use the visible architecture and Sydney location only.';

  return requestHistoricalImage({
    imageBase64,
    mimeType,
    prompt: `Reconstruct the supplied modern photograph as a realistic view of this exact location in approximately ${year}.

Location: latitude ${coordinate.latitude.toFixed(5)}, longitude ${coordinate.longitude.toFixed(5)}, Sydney, Australia.
Nearby place context: ${placeContext}

Use available historical context and search grounding to determine what physically occupied these coordinates in ${year} before editing the scene.

Preservation priority:
1. Keep the original camera position, height, lens perspective, viewing direction, framing, horizon, and the screen-space positions of people.
2. Treat the modern photograph as a geometric and compositional scaffold only where it is historically compatible. Preserve the shape, scale, depth, openings, and placement of buildings, rooms, streets, and large objects that genuinely existed in ${year}.
3. Translate incompatible modern objects into believable period equivalents while retaining their approximate size and placement: for example, a whiteboard may become a chalkboard, electric fittings may become period lighting, and modern furniture or signs may become contemporary equivalents.
4. Historical reality overrides the modern scaffold when the land use or structure was fundamentally different. If this room or building did not exist and the site was farmland, bushland, water, another building, or an outdoor street in ${year}, replace the modern enclosure with that historically correct environment from the same camera coordinates and direction. Do not preserve modern walls merely because they appear in the source.

If people are visible, preserve each person's identity, face, body, pose, expression, and position; change only historically inappropriate clothing details when necessary. Reconstruct architecture, interiors, shopfronts, street surfaces, transport, signage, materials, lighting, vegetation, and activity for Sydney in ${year}. Do not simply apply a vintage filter or costumes to a modern scene. Do not add a border, caption, date stamp, split screen, or explanatory text inside the image. Avoid fantasy, nostalgia filters, and famous people. The result should look like a realistic photograph captured from the same viewpoint, while remaining an AI-generated historical interpretation.`,
    imageConfig: { imageSize: '1K' },
  });
}

export async function createHistoricalPanorama({
  imageBase64,
  mimeType,
  coordinate,
  place,
  year,
}: {
  imageBase64: string;
  mimeType: string;
  coordinate: Coordinate;
  place?: StoryCandidate;
  year: string;
}): Promise<HistoricalImageResult> {
  const placeContext = place
    ? `${place.title}. Source-backed context: ${place.summary}. Reference links: ${place.citations
        .map((citation) => citation.url)
        .join(', ')}`
    : 'No named landmark was found nearby; use the visible architecture and Sydney location only.';

  return requestHistoricalImage({
    imageBase64,
    mimeType,
    prompt: `Reconstruct the supplied modern photograph as an ultra-wide, realistic view of this exact location in approximately ${year}.

Location: latitude ${coordinate.latitude.toFixed(5)}, longitude ${coordinate.longitude.toFixed(5)}, Sydney, Australia.
Nearby place context: ${placeContext}

Use available historical context and search grounding to determine what physically occupied these coordinates in ${year} before editing the scene.

Preservation priority:
1. Keep the original camera position, height, lens perspective, viewing direction, central framing, horizon, and the screen-space positions of people.
2. Treat the modern image as a geometric and compositional scaffold only where historically compatible. Preserve the shape, scale, depth, openings, and placement of buildings, rooms, streets, and large objects that genuinely existed in ${year}.
3. Translate incompatible modern objects into believable period equivalents while retaining their approximate size and placement: for example, a whiteboard may become a chalkboard, electric fittings may become period lighting, and modern furniture or signs may become contemporary equivalents.
4. Historical reality overrides the modern scaffold when the site was fundamentally different. If the photographed room or building did not exist and these coordinates were farmland, bushland, water, another building, or an outdoor street in ${year}, replace the modern enclosure with that historically correct environment from the same camera coordinates and direction. Do not preserve modern walls merely because they appear in the source.

Keep the original viewpoint in the centre of a continuous 21:9 panorama and extend the historically correct environment, architecture, sky, and activity to the left and right so a walker can look around. If people are visible, preserve each person's identity, face, body, pose, expression, and position; change only historically inappropriate clothing details. Do not simply apply a vintage filter or costumes to a modern scene. Do not add a border, caption, date stamp, split screen, fisheye distortion, or 360 spherical wrap. Avoid fantasy, nostalgia filters, and famous people. This remains an AI-generated historical interpretation, not an archival photograph.`,
    imageConfig: { aspectRatio: '21:9', imageSize: '2K' },
  });
}

async function requestHistoricalImage({
  imageBase64,
  mimeType,
  prompt,
  imageConfig,
}: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  imageConfig: { aspectRatio?: string; imageSize?: string };
}): Promise<HistoricalImageResult> {
  if (!tripBackConfig.geminiApiKey) {
    throw new Error('The Gemini demo key is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: tripBackConfig.geminiApiKey });
  const response = await ai.models.generateContent({
    model: tripBackConfig.geminiImageModel,
    contents: [
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      {
        text: prompt,
      },
    ],
    config: {
      httpOptions: { timeout: 120_000 },
      tools: [{ googleSearch: {} }],
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig,
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const outputImage = [...parts]
    .reverse()
    .find((part) => !part.thought && part.inlineData?.data);
  if (!outputImage?.inlineData?.data) {
    throw new Error('Gemini did not return a historical image');
  }

  const note = parts
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join('\n')
    .trim();
  const outputMimeType = outputImage.inlineData.mimeType || 'image/png';
  return {
    imageDataUri: `data:${outputMimeType};base64,${outputImage.inlineData.data}`,
    base64: outputImage.inlineData.data,
    mimeType: outputMimeType,
    note: note || undefined,
  };
}
