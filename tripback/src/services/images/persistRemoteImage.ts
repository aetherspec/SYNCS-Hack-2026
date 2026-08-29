const maxImageBytes = 2_500_000;

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function imageDataUri(
  base64?: string | null,
  mimeType?: string | null,
): string | undefined {
  if (!base64) return undefined;
  return `data:${mimeType || 'image/jpeg'};base64,${base64}`;
}

export function splitDataUri(
  dataUri?: string,
): { mimeType: string; base64: string } | undefined {
  if (!dataUri) return undefined;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match?.[1] || !match[2]) return undefined;
  return { mimeType: match[1], base64: match[2] };
}

export async function persistRemoteImage(url?: string): Promise<{
  base64?: string;
  mimeType?: string;
}> {
  if (!url) return {};

  try {
    const response = await fetch(url);
    if (!response.ok) return {};
    const mimeType =
      response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    if (!mimeType.startsWith('image/')) return {};

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxImageBytes) return {};
    return { base64: uint8ToBase64(bytes), mimeType };
  } catch {
    return {};
  }
}
