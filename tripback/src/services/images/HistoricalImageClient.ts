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
    prompt: `Edit the supplied modern photograph into a historically plausible view from approximately ${year}.

Location: latitude ${coordinate.latitude.toFixed(5)}, longitude ${coordinate.longitude.toFixed(5)}, Sydney, Australia.
Nearby place context: ${placeContext}

Keep the camera position, lens perspective, framing, terrain, and major spatial layout from the original photo. If people are visible, preserve each person's identity, face, body, pose, expression, and position; change only historically inappropriate clothing details when necessary. Reconstruct the surrounding buildings, shopfronts, street surface, transport, signage, lighting, and lively street activity using plausible details for Sydney in ${year}. Do not add a border, caption, date stamp, split screen, or explanatory text inside the image. Avoid fantasy, nostalgia filters, and famous people. The result should look like a realistic photograph captured from the same viewpoint, while remaining an explicitly AI-generated historical interpretation.`,
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
    prompt: `Edit the supplied modern photograph into an ultra-wide cinematic historical streetscape from approximately ${year}.

Location: latitude ${coordinate.latitude.toFixed(5)}, longitude ${coordinate.longitude.toFixed(5)}, Sydney, Australia.
Nearby place context: ${placeContext}

Keep the original camera height and viewpoint in the centre of a continuous 21:9 panorama. Extend plausible neighbouring shopfronts, street, sky, and activity to the left and right so a walker can look around. If people are visible in the source photo, preserve each person's identity, face, body, pose, expression, and position. Do not add a border, caption, date stamp, split screen, fisheye distortion, or 360 spherical wrap. Avoid fantasy and famous people. This remains an AI-generated historical interpretation, not an archival photograph.`,
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
