import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';

type MediaKind = 'photo' | 'video';

const extensionForMime = (mimeType: string, kind: MediaKind) => {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('heic') || mimeType.includes('heif')) return 'heic';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('quicktime')) return 'mov';
  return kind === 'video' ? 'mp4' : 'jpg';
};

export async function saveToCameraRoll(uri: string, kind: MediaKind): Promise<void> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error('Allow TripBack to add items to Photos in iPhone Settings, then try again.');
  }

  if (!FileSystem.cacheDirectory) throw new Error('Temporary storage is unavailable.');

  let localUri = uri;
  let temporary = false;
  const dataMatch = uri.match(/^data:([^;]+);base64,(.+)$/s);

  if (dataMatch?.[1] && dataMatch[2]) {
    const ext = extensionForMime(dataMatch[1], kind);
    localUri = `${FileSystem.cacheDirectory}tripback-export-${Date.now()}.${ext}`;
    await FileSystem.writeAsStringAsync(localUri, dataMatch[2], {
      encoding: FileSystem.EncodingType.Base64,
    });
    temporary = true;
  } else if (/^https?:\/\//i.test(uri)) {
    const withoutQuery = uri.split('?')[0] ?? '';
    const matchedExtension = withoutQuery.match(/\.([a-z0-9]{2,5})$/i)?.[1];
    const ext = matchedExtension ?? (kind === 'video' ? 'mp4' : 'jpg');
    localUri = `${FileSystem.cacheDirectory}tripback-export-${Date.now()}.${ext}`;
    await FileSystem.downloadAsync(uri, localUri);
    temporary = true;
  }

  try {
    await MediaLibrary.saveToLibraryAsync(localUri);
  } finally {
    if (temporary) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
    }
  }
}

