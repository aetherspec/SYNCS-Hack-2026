import type {
  Discovery,
  EngineStatus,
  GeneratedImage,
  RealityPortal,
  RealityPortalPin,
  WalkDetail,
  WalkSession,
} from '../domain/types';
import { sydneyDemoRoute } from '../simulation/sydneyRoute';
import { tripBackDatabase } from '../services/database/TripBackDatabase';
import {
  requestWalkLocationPermissions,
  startWalkLocationUpdates,
  stopWalkLocationUpdates,
} from '../services/location/LocationService';
import { requestNotificationPermission } from '../services/notifications/NotificationService';
import { subscribeToDiscoveries } from './events';
import { processLocation } from './processLocation';

type StatusListener = (status: EngineStatus) => void;

class TripBackEngine {
  private listeners = new Set<StatusListener>();
  private status: EngineStatus = { ready: false };

  constructor() {
    subscribeToDiscoveries((latestDiscovery) => {
      this.update({ latestDiscovery });
    });
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private update(patch: Partial<EngineStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) listener(this.status);
  }

  async initialize(): Promise<void> {
    try {
      await tripBackDatabase.initialize();
      const [storedActiveWalk, latestDiscovery] = await Promise.all([
        tripBackDatabase.getActiveWalk(),
        tripBackDatabase.latestDiscovery(),
      ]);
      // A development reload can interrupt a simulated route before its
      // finally block runs. Do not leave the demo permanently disabled.
      let activeWalk = storedActiveWalk;
      if (activeWalk?.isSimulated) {
        await tripBackDatabase.endActiveWalk();
        activeWalk = null;
      }
      this.update({ ready: true, activeWalk: activeWalk ?? undefined, latestDiscovery });
    } catch (error) {
      this.update({ ready: false, error: String(error) });
    }
  }

  async startWalk(): Promise<WalkSession> {
    this.update({ error: undefined });
    const locationAllowed = await requestWalkLocationPermissions();
    if (!locationAllowed) throw new Error('Location permission is required to start a walk');
    await requestNotificationPermission();
    const walk = await tripBackDatabase.startWalk(false);
    await startWalkLocationUpdates();
    this.update({ activeWalk: walk });
    return walk;
  }

  async stopWalk(): Promise<void> {
    await stopWalkLocationUpdates();
    await this.finalizeActiveWalk();
  }

  async runSimulation(): Promise<void> {
    this.update({ error: undefined });
    if (this.status.activeWalk) await this.stopWalk();
    await requestNotificationPermission();
    const walk = await tripBackDatabase.startWalk(true);
    this.update({ activeWalk: walk });

    try {
      for (const [index, coordinate] of sydneyDemoRoute.entries()) {
        await processLocation(coordinate, {
          accuracy: 5,
          capturedAt: new Date(Date.now() + index * 30_000).toISOString(),
          forceDiscovery: index === 0 || index === 5 || index === 10,
        });
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
    } finally {
      await this.finalizeActiveWalk();
    }
  }

  private async finalizeActiveWalk(): Promise<void> {
    const walk = await tripBackDatabase.getActiveWalk();
    if (!walk) {
      this.update({ activeWalk: undefined });
      return;
    }

    await tripBackDatabase.endActiveWalk();
    this.update({ activeWalk: undefined });
  }

  async listDiscoveries(): Promise<Discovery[]> {
    return tripBackDatabase.listDiscoveries();
  }

  async listWalks(): Promise<WalkSession[]> {
    return tripBackDatabase.listWalks();
  }

  async getWalkDetail(walkId: string): Promise<WalkDetail | null> {
    return tripBackDatabase.getWalkDetail(walkId);
  }

  async saveGeneratedImage(image: {
    walkId?: string;
    placeTitle?: string;
    year: string;
    coordinate: { latitude: number; longitude: number };
    modernBase64?: string;
    modernMimeType?: string;
    generatedBase64: string;
    generatedMimeType: string;
  }): Promise<GeneratedImage> {
    return tripBackDatabase.saveGeneratedImage(image);
  }

  async savePortal(portal: {
    walkId?: string;
    placeTitle?: string;
    year: string;
    coordinate: { latitude: number; longitude: number };
    originHeading: number;
    modernBase64?: string;
    modernMimeType?: string;
    generatedBase64: string;
    generatedMimeType: string;
  }): Promise<RealityPortal> {
    return tripBackDatabase.savePortal(portal);
  }

  async listPortalPins(): Promise<RealityPortalPin[]> {
    return tripBackDatabase.listPortalPins();
  }

  async getPortal(id: string): Promise<RealityPortal | null> {
    return tripBackDatabase.getPortal(id);
  }

  async clearHistory(): Promise<void> {
    if (this.status.activeWalk) {
      await stopWalkLocationUpdates();
      await tripBackDatabase.endActiveWalk();
    }
    await tripBackDatabase.clearAllHistory();
    this.update({ activeWalk: undefined, latestDiscovery: undefined });
  }
}

export const tripBackEngine = new TripBackEngine();
