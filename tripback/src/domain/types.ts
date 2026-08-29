export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type SourceCitation = {
  title: string;
  url: string;
  provider: 'Wikipedia' | 'Heritage NSW' | 'Google Search';
};

export type StoryCandidate = {
  id: string;
  title: string;
  summary: string;
  coordinate: Coordinate;
  distanceMetres: number;
  imageUrl?: string;
  citations: SourceCitation[];
};

export type GeneratedStory = {
  status: 'story' | 'no_story';
  selectedCandidateId?: string;
  title?: string;
  hook?: string;
  story?: string;
  confidence?: number;
};

export type Discovery = {
  id: string;
  walkId?: string;
  candidateId: string;
  title: string;
  hook: string;
  story: string;
  coordinate: Coordinate;
  imageUrl?: string;
  imageDataUri?: string;
  imageBase64?: string;
  imageMimeType?: string;
  confidence: number;
  citations: SourceCitation[];
  discoveredAt: string;
};

export type WalkSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  distanceMetres: number;
  isSimulated: boolean;
  title?: string;
  summary?: string;
  discoveryCount?: number;
  generatedImageCount?: number;
};

export type GeneratedImage = {
  id: string;
  walkId?: string;
  placeTitle?: string;
  year: string;
  coordinate: Coordinate;
  modernImageDataUri?: string;
  generatedImageDataUri: string;
  createdAt: string;
};

export type RealityPortalPin = {
  id: string;
  walkId?: string;
  placeTitle?: string;
  year: string;
  coordinate: Coordinate;
  originHeading: number;
  createdAt: string;
  videoUri?: string;
};

export type RealityPortal = RealityPortalPin & {
  modernImageDataUri?: string;
  generatedImageDataUri: string;
  generatedBase64?: string;
  generatedMimeType?: string;
};

export type WalkDetail = {
  walk: WalkSession;
  route: RoutePoint[];
  discoveries: Discovery[];
  generatedImages: GeneratedImage[];
  portals: RealityPortal[];
};

export type RoutePoint = Coordinate & {
  id?: number;
  walkId: string;
  capturedAt: string;
  accuracy?: number;
};

export type EngineStatus = {
  ready: boolean;
  activeWalk?: WalkSession;
  latestDiscovery?: Discovery;
  error?: string;
};
