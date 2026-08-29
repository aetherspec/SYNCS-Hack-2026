import * as SQLite from 'expo-sqlite';

import { distanceMetres } from '../../domain/geo';
import type {
  Discovery,
  GeneratedImage,
  RealityPortal,
  RealityPortalPin,
  RoutePoint,
  WalkDetail,
  WalkSession,
} from '../../domain/types';
import { imageDataUri } from '../images/persistRemoteImage';

type WalkRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  is_simulated: number;
  title: string | null;
  summary: string | null;
  discovery_count?: number;
  generated_count?: number;
};

type RoutePointRow = {
  id: number;
  walk_id: string;
  latitude: number;
  longitude: number;
  captured_at: string;
  accuracy: number | null;
};

type DiscoveryRow = {
  id: string;
  walk_id: string | null;
  candidate_id: string;
  title: string;
  hook: string;
  story: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  image_data: string | null;
  image_mime: string | null;
  confidence: number;
  citations_json: string;
  discovered_at: string;
};

type GeneratedImageRow = {
  id: string;
  walk_id: string | null;
  place_title: string | null;
  year: string;
  latitude: number;
  longitude: number;
  modern_image_data: string | null;
  modern_image_mime: string | null;
  generated_image_data: string;
  generated_image_mime: string;
  created_at: string;
};

type PortalRow = {
  id: string;
  walk_id: string | null;
  place_title: string | null;
  year: string;
  latitude: number;
  longitude: number;
  origin_heading: number;
  modern_image_data: string | null;
  modern_image_mime: string | null;
  generated_image_data: string;
  generated_image_mime: string;
  video_uri: string | null;
  created_at: string;
};

type StateRow = {
  key: string;
  value: string;
};

const mapWalk = (row: WalkRow): WalkSession => ({
  id: row.id,
  startedAt: row.started_at,
  endedAt: row.ended_at ?? undefined,
  distanceMetres: row.distance_m,
  isSimulated: row.is_simulated === 1,
  title: row.title ?? undefined,
  summary: row.summary ?? undefined,
  discoveryCount: row.discovery_count,
  generatedImageCount: row.generated_count,
});

const mapPoint = (row: RoutePointRow): RoutePoint => ({
  id: row.id,
  walkId: row.walk_id,
  latitude: row.latitude,
  longitude: row.longitude,
  capturedAt: row.captured_at,
  accuracy: row.accuracy ?? undefined,
});

const mapGeneratedImage = (row: GeneratedImageRow): GeneratedImage => ({
  id: row.id,
  walkId: row.walk_id ?? undefined,
  placeTitle: row.place_title ?? undefined,
  year: row.year,
  coordinate: { latitude: row.latitude, longitude: row.longitude },
  modernImageDataUri: imageDataUri(row.modern_image_data, row.modern_image_mime),
  generatedImageDataUri: imageDataUri(row.generated_image_data, row.generated_image_mime)!,
  createdAt: row.created_at,
});

const mapPortalPin = (row: PortalRow): RealityPortalPin => ({
  id: row.id,
  walkId: row.walk_id ?? undefined,
  placeTitle: row.place_title ?? undefined,
  year: row.year,
  coordinate: { latitude: row.latitude, longitude: row.longitude },
  originHeading: row.origin_heading,
  createdAt: row.created_at,
  videoUri: row.video_uri ?? undefined,
});

const mapPortal = (row: PortalRow): RealityPortal => ({
  ...mapPortalPin(row),
  modernImageDataUri: imageDataUri(row.modern_image_data, row.modern_image_mime),
  generatedImageDataUri: imageDataUri(row.generated_image_data, row.generated_image_mime)!,
  generatedBase64: row.generated_image_data,
  generatedMimeType: row.generated_image_mime,
});

const mapDiscovery = (row: DiscoveryRow): Discovery => ({
  id: row.id,
  walkId: row.walk_id ?? undefined,
  candidateId: row.candidate_id,
  title: row.title,
  hook: row.hook,
  story: row.story,
  coordinate: { latitude: row.latitude, longitude: row.longitude },
  imageUrl: row.image_url ?? undefined,
  imageDataUri: imageDataUri(row.image_data, row.image_mime) ?? row.image_url ?? undefined,
  confidence: row.confidence,
  citations: JSON.parse(row.citations_json) as Discovery['citations'],
  discoveredAt: row.discovered_at,
});

class TripBackDatabase {
  private databasePromise?: Promise<SQLite.SQLiteDatabase>;

  private async database(): Promise<SQLite.SQLiteDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = SQLite.openDatabaseAsync('tripback.db');
    }
    return this.databasePromise;
  }

  async initialize(): Promise<void> {
    const database = await this.database();
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS walk_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        distance_m REAL NOT NULL DEFAULT 0,
        is_simulated INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS route_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        walk_id TEXT NOT NULL REFERENCES walk_sessions(id) ON DELETE CASCADE,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        captured_at TEXT NOT NULL,
        accuracy REAL
      );
      CREATE INDEX IF NOT EXISTS idx_route_points_walk_time
        ON route_points(walk_id, captured_at);
      CREATE TABLE IF NOT EXISTS discoveries (
        id TEXT PRIMARY KEY NOT NULL,
        candidate_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        hook TEXT NOT NULL,
        story TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        image_url TEXT,
        confidence REAL NOT NULL,
        citations_json TEXT NOT NULL,
        discovered_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    await this.ensureColumn(database, 'walk_sessions', 'title', 'TEXT');
    await this.ensureColumn(database, 'walk_sessions', 'summary', 'TEXT');
    await this.ensureColumn(database, 'discoveries', 'walk_id', 'TEXT');
    await this.ensureColumn(database, 'discoveries', 'image_data', 'TEXT');
    await this.ensureColumn(database, 'discoveries', 'image_mime', 'TEXT');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS generated_images (
        id TEXT PRIMARY KEY NOT NULL,
        walk_id TEXT REFERENCES walk_sessions(id) ON DELETE CASCADE,
        place_title TEXT,
        year TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        modern_image_data TEXT,
        modern_image_mime TEXT,
        generated_image_data TEXT NOT NULL,
        generated_image_mime TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_discoveries_walk ON discoveries(walk_id);
      CREATE INDEX IF NOT EXISTS idx_generated_images_walk ON generated_images(walk_id);
      CREATE TABLE IF NOT EXISTS reality_portals (
        id TEXT PRIMARY KEY NOT NULL,
        walk_id TEXT REFERENCES walk_sessions(id) ON DELETE CASCADE,
        place_title TEXT,
        year TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        origin_heading REAL NOT NULL DEFAULT 0,
        modern_image_data TEXT,
        modern_image_mime TEXT,
        generated_image_data TEXT NOT NULL,
        generated_image_mime TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reality_portals_walk ON reality_portals(walk_id);
    `);
    await this.ensureColumn(database, 'reality_portals', 'video_uri', 'TEXT');
  }

  private async ensureColumn(
    database: SQLite.SQLiteDatabase,
    table: string,
    column: string,
    definition: string,
  ): Promise<void> {
    const columns = await database.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${table})`,
    );
    if (columns.some((item) => item.name === column)) return;
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  async startWalk(isSimulated = false): Promise<WalkSession> {
    await this.initialize();
    const database = await this.database();
    const walk: WalkSession = {
      id: `walk:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      startedAt: new Date().toISOString(),
      distanceMetres: 0,
      isSimulated,
    };
    await database.runAsync(
      'INSERT INTO walk_sessions (id, started_at, distance_m, is_simulated) VALUES (?, ?, 0, ?)',
      walk.id,
      walk.startedAt,
      isSimulated ? 1 : 0,
    );
    await this.setState('active_walk_id', walk.id);
    await this.clearSearchState();
    return walk;
  }

  async endActiveWalk(extras?: {
    title?: string;
    summary?: string;
  }): Promise<WalkSession | null> {
    const active = await this.getActiveWalk();
    if (!active) return null;
    const database = await this.database();
    const endedAt = new Date().toISOString();
    await database.runAsync(
      `UPDATE walk_sessions
       SET ended_at = ?, title = COALESCE(?, title), summary = COALESCE(?, summary)
       WHERE id = ?`,
      endedAt,
      extras?.title ?? null,
      extras?.summary ?? null,
      active.id,
    );
    await this.deleteState('active_walk_id');
    return {
      ...active,
      endedAt,
      title: extras?.title ?? active.title,
      summary: extras?.summary ?? active.summary,
    };
  }

  async getActiveWalk(): Promise<WalkSession | null> {
    await this.initialize();
    const id = await this.getState('active_walk_id');
    if (!id) return null;
    const database = await this.database();
    const row = await database.getFirstAsync<WalkRow>(
      'SELECT * FROM walk_sessions WHERE id = ? AND ended_at IS NULL',
      id,
    );
    return row ? mapWalk(row) : null;
  }

  async listWalks(): Promise<WalkSession[]> {
    await this.initialize();
    const database = await this.database();
    const rows = await database.getAllAsync<WalkRow>(
      `SELECT walk_sessions.*,
              (SELECT COUNT(*) FROM discoveries WHERE walk_id = walk_sessions.id) AS discovery_count,
              (SELECT COUNT(*) FROM generated_images WHERE walk_id = walk_sessions.id) AS generated_count
       FROM walk_sessions
       ORDER BY started_at DESC`,
    );
    return rows.map(mapWalk);
  }

  async getWalk(walkId: string): Promise<WalkSession | null> {
    await this.initialize();
    const database = await this.database();
    const row = await database.getFirstAsync<WalkRow>(
      `SELECT walk_sessions.*,
              (SELECT COUNT(*) FROM discoveries WHERE walk_id = walk_sessions.id) AS discovery_count,
              (SELECT COUNT(*) FROM generated_images WHERE walk_id = walk_sessions.id) AS generated_count
       FROM walk_sessions
       WHERE id = ?`,
      walkId,
    );
    return row ? mapWalk(row) : null;
  }

  async getWalkDetail(walkId: string): Promise<WalkDetail | null> {
    const walk = await this.getWalk(walkId);
    if (!walk) return null;
    const [route, discoveries, generatedImages, portals] = await Promise.all([
      this.listRoutePoints(walkId),
      this.listDiscoveriesForWalk(walkId),
      this.listGeneratedImagesForWalk(walkId),
      this.listPortalsForWalk(walkId),
    ]);
    return { walk, route, discoveries, generatedImages, portals };
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
    await this.initialize();
    const database = await this.database();
    const row: GeneratedImageRow = {
      id: `image:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      walk_id: image.walkId ?? null,
      place_title: image.placeTitle ?? null,
      year: image.year,
      latitude: image.coordinate.latitude,
      longitude: image.coordinate.longitude,
      modern_image_data: image.modernBase64 ?? null,
      modern_image_mime: image.modernMimeType ?? null,
      generated_image_data: image.generatedBase64,
      generated_image_mime: image.generatedMimeType,
      created_at: new Date().toISOString(),
    };
    await database.runAsync(
      `INSERT INTO generated_images
        (id, walk_id, place_title, year, latitude, longitude,
         modern_image_data, modern_image_mime, generated_image_data, generated_image_mime, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.walk_id,
      row.place_title,
      row.year,
      row.latitude,
      row.longitude,
      row.modern_image_data,
      row.modern_image_mime,
      row.generated_image_data,
      row.generated_image_mime,
      row.created_at,
    );
    return mapGeneratedImage(row);
  }

  async listGeneratedImagesForWalk(walkId: string): Promise<GeneratedImage[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<GeneratedImageRow>(
      'SELECT * FROM generated_images WHERE walk_id = ? ORDER BY created_at ASC',
      walkId,
    );
    return rows.map(mapGeneratedImage);
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
    await this.initialize();
    const database = await this.database();
    const row: PortalRow = {
      id: `portal:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      walk_id: portal.walkId ?? null,
      place_title: portal.placeTitle ?? null,
      year: portal.year,
      latitude: portal.coordinate.latitude,
      longitude: portal.coordinate.longitude,
      origin_heading: portal.originHeading,
      modern_image_data: portal.modernBase64 ?? null,
      modern_image_mime: portal.modernMimeType ?? null,
      generated_image_data: portal.generatedBase64,
      generated_image_mime: portal.generatedMimeType,
      video_uri: null,
      created_at: new Date().toISOString(),
    };
    await database.runAsync(
      `INSERT INTO reality_portals
        (id, walk_id, place_title, year, latitude, longitude, origin_heading,
         modern_image_data, modern_image_mime, generated_image_data, generated_image_mime, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.walk_id,
      row.place_title,
      row.year,
      row.latitude,
      row.longitude,
      row.origin_heading,
      row.modern_image_data,
      row.modern_image_mime,
      row.generated_image_data,
      row.generated_image_mime,
      row.created_at,
    );
    return mapPortal(row);
  }

  async listPortalPins(): Promise<RealityPortalPin[]> {
    await this.initialize();
    const database = await this.database();
    const rows = await database.getAllAsync<PortalRow>(
      `SELECT id, walk_id, place_title, year, latitude, longitude, origin_heading,
              NULL AS modern_image_data, NULL AS modern_image_mime,
              '' AS generated_image_data, '' AS generated_image_mime, video_uri, created_at
       FROM reality_portals
       ORDER BY created_at DESC`,
    );
    return rows.map(mapPortalPin);
  }

  async getPortal(id: string): Promise<RealityPortal | null> {
    await this.initialize();
    const database = await this.database();
    const row = await database.getFirstAsync<PortalRow>(
      'SELECT * FROM reality_portals WHERE id = ?',
      id,
    );
    return row ? mapPortal(row) : null;
  }

  async savePortalVideo(id: string, videoUri: string): Promise<void> {
    await this.initialize();
    const database = await this.database();
    await database.runAsync('UPDATE reality_portals SET video_uri = ? WHERE id = ?', videoUri, id);
  }

  async listPortalsForWalk(walkId: string): Promise<RealityPortal[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<PortalRow>(
      'SELECT * FROM reality_portals WHERE walk_id = ? ORDER BY created_at ASC',
      walkId,
    );
    return rows.map(mapPortal);
  }

  async getLastRoutePoint(walkId: string): Promise<RoutePoint | null> {
    const database = await this.database();
    const row = await database.getFirstAsync<RoutePointRow>(
      'SELECT * FROM route_points WHERE walk_id = ? ORDER BY captured_at DESC LIMIT 1',
      walkId,
    );
    return row ? mapPoint(row) : null;
  }

  async addRoutePoint(point: RoutePoint): Promise<number> {
    const database = await this.database();
    const previous = await this.getLastRoutePoint(point.walkId);
    const addedDistance = previous ? distanceMetres(previous, point) : 0;
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        `INSERT INTO route_points
          (walk_id, latitude, longitude, captured_at, accuracy)
         VALUES (?, ?, ?, ?, ?)`,
        point.walkId,
        point.latitude,
        point.longitude,
        point.capturedAt,
        point.accuracy ?? null,
      );
      if (addedDistance > 0) {
        await database.runAsync(
          'UPDATE walk_sessions SET distance_m = distance_m + ? WHERE id = ?',
          addedDistance,
          point.walkId,
        );
      }
    });
    return addedDistance;
  }

  async listRoutePoints(walkId: string): Promise<RoutePoint[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<RoutePointRow>(
      'SELECT * FROM route_points WHERE walk_id = ? ORDER BY captured_at ASC',
      walkId,
    );
    return rows.map(mapPoint);
  }

  async hasSeenCandidate(candidateId: string): Promise<boolean> {
    const database = await this.database();
    const row = await database.getFirstAsync<{ found: number }>(
      'SELECT 1 AS found FROM discoveries WHERE candidate_id = ? LIMIT 1',
      candidateId,
    );
    return row?.found === 1;
  }

  async saveDiscovery(discovery: Discovery): Promise<void> {
    const database = await this.database();
    await database.runAsync(
      `INSERT OR IGNORE INTO discoveries
        (id, walk_id, candidate_id, title, hook, story, latitude, longitude,
         image_url, image_data, image_mime, confidence, citations_json, discovered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      discovery.id,
      discovery.walkId ?? null,
      discovery.candidateId,
      discovery.title,
      discovery.hook,
      discovery.story,
      discovery.coordinate.latitude,
      discovery.coordinate.longitude,
      discovery.imageUrl ?? null,
      discovery.imageBase64 ?? null,
      discovery.imageMimeType ?? null,
      discovery.confidence,
      JSON.stringify(discovery.citations),
      discovery.discoveredAt,
    );
  }

  async listDiscoveriesForWalk(walkId: string): Promise<Discovery[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<DiscoveryRow>(
      'SELECT * FROM discoveries WHERE walk_id = ? ORDER BY discovered_at ASC',
      walkId,
    );
    return rows.map(mapDiscovery);
  }

  async listDiscoveries(): Promise<Discovery[]> {
    await this.initialize();
    const database = await this.database();
    const rows = await database.getAllAsync<DiscoveryRow>(
      'SELECT * FROM discoveries ORDER BY discovered_at DESC',
    );
    return rows.map(mapDiscovery);
  }

  async latestDiscovery(): Promise<Discovery | undefined> {
    const database = await this.database();
    const row = await database.getFirstAsync<DiscoveryRow>(
      'SELECT * FROM discoveries ORDER BY discovered_at DESC LIMIT 1',
    );
    return row ? mapDiscovery(row) : undefined;
  }

  async getState(key: string): Promise<string | null> {
    const database = await this.database();
    const row = await database.getFirstAsync<StateRow>(
      'SELECT value FROM app_state WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  }

  async setState(key: string, value: string): Promise<void> {
    const database = await this.database();
    await database.runAsync(
      `INSERT INTO app_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value,
    );
  }

  async deleteState(key: string): Promise<void> {
    const database = await this.database();
    await database.runAsync('DELETE FROM app_state WHERE key = ?', key);
  }

  async clearSearchState(): Promise<void> {
    const database = await this.database();
    await database.runAsync(
      `DELETE FROM app_state
       WHERE key IN ('last_search_coordinate', 'last_search_at', 'last_notification_at')`,
    );
  }

  async clearAllHistory(): Promise<void> {
    const database = await this.database();
    await database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM route_points');
      await database.runAsync('DELETE FROM generated_images');
      await database.runAsync('DELETE FROM reality_portals');
      await database.runAsync('DELETE FROM discoveries');
      await database.runAsync('DELETE FROM walk_sessions');
      await database.runAsync('DELETE FROM app_state');
    });
  }
}

export const tripBackDatabase = new TripBackDatabase();
