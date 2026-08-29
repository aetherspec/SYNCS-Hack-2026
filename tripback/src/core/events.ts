import type { Discovery } from '../domain/types';

type DiscoveryListener = (discovery: Discovery) => void;
const listeners = new Set<DiscoveryListener>();

export function emitDiscovery(discovery: Discovery): void {
  for (const listener of listeners) listener(discovery);
}

export function subscribeToDiscoveries(listener: DiscoveryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
