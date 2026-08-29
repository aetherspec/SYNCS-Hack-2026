import { GoogleGenAI } from '@google/genai';
import * as FileSystem from 'expo-file-system/legacy';

import { tripBackConfig } from '../../config';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 42;

export async function createHistoricalVideo({
  imageBase64,
  mimeType,
  placeTitle,
  year,
}: {
  imageBase64: string;
  mimeType: string;
  placeTitle: string;
  year: string;
}): Promise<string> {
  if (!tripBackConfig.geminiApiKey) throw new Error('The Gemini demo key is not configured');

  const ai = new GoogleGenAI({ apiKey: tripBackConfig.geminiApiKey });
  let operation = await ai.models.generateVideos({
    model: tripBackConfig.geminiVideoModel,
    image: { imageBytes: imageBase64, mimeType },
    prompt: `Bring this historical reconstruction of ${placeTitle} in ${year} gently to life for eight seconds.

The supplied image is the exact first frame and source of truth. Keep the same viewpoint, camera height, lens, framing, architecture, street layout, room geometry, faces, identities, clothing, objects, signs, materials, weather, lighting, and historical period. The camera is locked off like the walker is standing still. Add only natural, restrained motion that makes sense for what is visibly present: people breathing, blinking, conversing or walking naturally; period traffic or animals moving through existing paths; smoke, fabric, foliage, water, dust, and light moving subtly. Do not morph buildings or faces, introduce new major objects, move through walls, modernise the scene, change the season, or reveal an invented reverse angle.

Create realistic period ambience and environmental sound without narration, dialogue that states facts, music, titles, captions, logos, or date stamps. The result should feel like a brief window into this exact place in ${year}, not a dramatic trailer.`,
    config: {
      httpOptions: { timeout: 30_000 },
      numberOfVideos: 1,
      durationSeconds: 8,
      aspectRatio: '16:9',
      resolution: '720p',
      personGeneration: 'allow_adult',
      negativePrompt:
        'camera movement, zoom, dolly, aerial view, time lapse, morphing, warped architecture, changing faces, modern objects, subtitles, captions, logos, narration, music',
    },
  });

  for (let poll = 0; !operation.done && poll < MAX_POLLS; poll += 1) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (!operation.done) throw new Error('The video is still taking too long. Please try again.');
  if (operation.error) throw new Error(readOperationError(operation.error));

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video?.uri) {
    const reason = operation.response?.raiMediaFilteredReasons?.[0];
    throw new Error(reason || 'Gemini did not return a video');
  }

  if (!FileSystem.documentDirectory) throw new Error('Video storage is unavailable');
  const directory = `${FileSystem.documentDirectory}tripback-videos/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const filename = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp4`;
  const downloaded = await FileSystem.downloadAsync(video.uri, `${directory}${filename}`, {
    headers: { 'x-goog-api-key': tripBackConfig.geminiApiKey },
  });
  if (downloaded.status < 200 || downloaded.status >= 300) {
    throw new Error(`Video download failed (${downloaded.status})`);
  }
  return downloaded.uri;
}

function readOperationError(error: Record<string, unknown>): string {
  const message = error.message;
  return typeof message === 'string' && message.trim()
    ? message
    : 'Gemini could not create this video';
}
