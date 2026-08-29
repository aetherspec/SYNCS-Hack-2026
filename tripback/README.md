# TripBack — project handoff

TripBack is a native iOS-focused React Native/Expo hackathon app that makes an ordinary Sydney walk feel like travelling through local history.

While the app is open, it follows the user's live position on Apple Maps, finds nearby historical places, and shows source-backed stories and images. During an active walk it can continue sampling location in the background and notify the user when a worthwhile story is nearby. Its **Time Camera** lets the user photograph the modern scene or take a selfie, choose a nearby place and year, and ask Gemini to reconstruct a plausible historical version from the same viewpoint.

This directory is the active application:

```text
tripback/
```

The sibling `../ios-TripBack/` Swift starter predates this implementation and must not be overwritten or deleted unless the team explicitly decides to retire it.

## What is implemented

### Explore

- Apple Maps through `react-native-maps` using the native iOS map provider.
- Foreground position updates every approximately 5 metres while the app is open.
- Automatic map recentering until the user manually pans; the recenter control resumes following.
- Nearby-place refresh after approximately 50 metres of movement.
- Markers and horizontally scrolling cards for places within a 500 metre search radius.
- Images from Wikipedia, with Wikimedia Commons lookup for candidates that lack a thumbnail.
- Clear fallback artwork when no reliable remote image is found.
- Controls for starting/ending a real walk and replaying the Sydney demo route.

### Historical discovery engine

- Wikipedia geosearch and NSW State Heritage Register spatial queries.
- Candidate distance filtering, scoring, source retention, and repeat suppression.
- Gemini story selection and rewriting with structured JSON and Google Search grounding.
- Local notifications for selected discoveries within 200 metres.
- SQLite persistence for walks, route points, discoveries, citations, images, and throttling state.
- Circular Quay–The Rocks simulation using the same processing path as live GPS.

### Time Camera

- Native camera capture through `expo-image-picker`.
- Modern-photo preview before anything is sent to Gemini.
- Selection between the closest nearby historical places.
- Suggested historical year extracted from place context, with manual editing.
- Gemini image editing using the live coordinate, selected place summary, retained sources, and Google Search grounding.
- Prompting that asks Gemini to preserve the original camera position, composition, people, faces, poses, and expressions while rebuilding the surrounding scene.
- Results clearly labelled **AI historical interpretation**, not archival photography.
- Captured and generated images are held only in the current UI session and are not written to TripBack history.

### History

- Previously discovered places stored locally on the phone.
- Place images, discovery dates, hooks, and retained-source counts.
- Real-walk count and accumulated distance. Simulated sessions are excluded from walk statistics, although stories found during the demo remain visible.

## Technology

- Expo SDK 57
- React Native 0.86 / React 19
- TypeScript
- Apple Maps via `react-native-maps`
- Expo Location, Task Manager, Notifications, Image Picker, and SQLite
- `@google/genai`
- Vitest

There is no backend, account system, or cloud database. The Gemini key is intentionally bundled in the client for this private hackathon demo.

## Setup on another Mac

Requirements:

- macOS with Xcode and an iOS Simulator runtime installed
- Xcode command-line tools selected
- Node.js and npm
- CocoaPods

From the repository root:

```sh
cd tripback
npm ci
npm run typecheck
npm test
```

If Xcode is not active:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

Install native dependencies if required:

```sh
cd ios
pod install
cd ..
```

Launch a native development build:

```sh
npm run ios
```

To target a named simulator:

```sh
npm run ios -- --device "iPhone 17 Pro"
```

To install a self-contained Release build on a connected iPhone:

```sh
npm run ios:standalone
```

Select the physical iPhone when prompted. This build bundles the JavaScript and
`EXPO_PUBLIC_…` configuration into the app, so it does not need Metro, the Mac,
or the USB cable after installation. It still needs internet access for Apple
Maps, Wikipedia, Heritage NSW, Wikimedia, and Gemini. The initial installation
and future signing renewal still require the Mac and a valid Apple signing team.

If a phone shows `No script URL provided` / `unsanitizedScriptURLString = null`,
a Debug build was installed without a reachable Metro server. Reinstall with
`npm run ios:standalone`, then unplug. Device Debug builds also embed JavaScript
now, but Release is the disconnected demo build.

Do not use generic Expo Go for background-location or camera verification. These features require the native development build.

`package-lock.json` is the canonical dependency lockfile. The remaining pnpm files are legacy scaffold files and should not be used unless the team deliberately migrates package managers.

## Environment variables

Create `.env.local` beside `package.json`:

```dotenv
EXPO_PUBLIC_GEMINI_API_KEY=replace-with-the-demo-key
EXPO_PUBLIC_GEMINI_MODEL=gemini-3.5-flash-lite
EXPO_PUBLIC_GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
```

`.env.local` and `.env` are ignored by Git. Do not commit the real credential.

The models have different jobs:

- `EXPO_PUBLIC_GEMINI_MODEL` generates short, grounded story JSON. Flash Lite is used because it is significantly faster for the walking demo.
- `EXPO_PUBLIC_GEMINI_IMAGE_MODEL` edits the camera photo and returns the historical reconstruction.

Because this is a client-side demo, anyone with the distributed app bundle can recover the key. Restrict its API permissions and quota, do not publish this build broadly, and rotate or delete the key after the event. A production version should proxy Gemini through a backend.

## Running the Sydney simulator demo

The app includes a Circular Quay–The Rocks route. Press **Demo** on Explore to process it through the real source, Gemini, SQLite, and notification pipeline.

To move the iOS Simulator's live GPS position manually:

```sh
xcrun simctl location booted set -33.856784,151.215297
xcrun simctl location booted set -33.866111,151.209593
```

Those coordinates move the simulator from the Opera House area toward central Sydney. The map should recenter and nearby markers, cards, distances, and images should refresh.

The simulator does not provide a normal physical camera. Use a real iPhone for the end-to-end Time Camera capture flow.

## Runtime flows

### Foreground map and nearby places

```text
Expo foreground location watcher
  → update the blue user-location dot
  → recenter the map while follow mode is active
  → after about 50 m, query Wikipedia + Heritage NSW
  → enrich missing thumbnails through Wikimedia Commons
  → update markers and nearby cards
```

### Walk discovery

```text
Expo foreground/background location update
  → processLocation()
  → sample a route point into SQLite
  → throttle by movement, time, and notification cooldown
  → query Wikipedia + Heritage NSW concurrently
  → filter to unseen candidates within 200 m
  → ask Gemini to choose and rewrite one grounded story
  → validate the selected candidate and required JSON fields
  → save the discovery and citations
  → issue a local notification
  → publish the discovery to the UI
```

The walk engine searches after approximately 150 metres or 90 seconds, uses a 500 metre candidate-search radius, only notifies for a selected place within 200 metres, and applies a two-minute notification cooldown. Tuning values live in `src/config.ts`.

### Time Camera

```text
Live coordinate + selected nearby place + chosen year
  → capture and preview a modern photo
  → user explicitly requests reconstruction
  → send base64 image, context, source links, and prompt to Gemini
  → Gemini image edit with Google Search grounding
  → receive a base64 image
  → display it as an AI historical interpretation
  → discard it when the modal/session is closed
```

Gemini image generation currently has a two-minute request timeout. A verified request returned in approximately 15 seconds, but latency will vary.

## Local storage

SQLite uses WAL mode and foreign keys.

- `walk_sessions`: start/end time, accumulated distance, and simulation flag.
- `route_points`: sampled coordinate, timestamp, accuracy, and walk relationship.
- `discoveries`: source candidate ID, generated story snapshot, coordinate, image URL, confidence, citations, and discovery time.
- `app_state`: active walk and search/notification throttling state.

Discoveries have a unique candidate ID, preventing the same source item from being saved repeatedly. Exact route points remain local. Coordinates sent for discovery are rounded to four decimal places. Camera and generated images are not stored in SQLite.

## Important files

```text
App.tsx
  Explore map, nearby cards, walk controls, Time Camera modal, tabs, and History UI.

src/config.ts
  Gemini models and location/search/cooldown constants.

src/domain/types.ts
  Shared contracts for coordinates, places, stories, discoveries, and walks.

src/core/TripBackEngine.ts
  UI-facing facade for initialization, subscriptions, walks, simulation,
  discovery history, walk history, and clearing local data.

src/core/processLocation.ts
  Route sampling, throttling, discovery, persistence, and notification loop.

src/services/discovery/
  Wikipedia, Wikimedia Commons, Heritage NSW, Gemini story generation,
  candidate scoring, and nearby-place loading.

src/services/images/HistoricalImageClient.ts
  Grounded Gemini image-edit request and historical reconstruction prompt.

src/services/database/TripBackDatabase.ts
  SQLite schema and repository methods.

src/services/location/
  Background task, permissions, and active-walk location updates.

src/services/notifications/NotificationService.ts
  Notification permission and immediate local notifications.

src/simulation/sydneyRoute.ts
  Circular Quay–The Rocks demo coordinates.

app.json
  Native iOS permission descriptions and Expo plugin configuration.

ios/
  Expo-generated native iOS project and CocoaPods workspace.
```

The Expo configuration is the source of truth for native permissions. Native regeneration can replace files under `ios/`; inspect existing changes before running prebuild, and never use `expo prebuild --clean` casually.

## Engine API used by the UI

```ts
import { tripBackEngine } from './src/core/TripBackEngine';
```

- `initialize()` creates or restores SQLite state.
- `subscribe(listener)` streams `EngineStatus`, including the active walk and latest discovery.
- `startWalk()` requests required permissions and starts live tracking.
- `stopWalk()` stops background updates and closes the active session.
- `runSimulation()` processes the Sydney demo route.
- `listDiscoveries()` returns saved place discoveries.
- `listWalks()` returns saved walk sessions.
- `clearHistory()` stops an active walk and removes all local history.

Nearby-place loading is exposed separately through `listNearbyPlaces()` in `DiscoveryService.ts`. Historical photo editing is exposed through `createHistoricalView()` in `HistoricalImageClient.ts`.

## Verification completed

Verified on 29 August 2026:

- Strict TypeScript compilation passes.
- All four geographic unit tests pass.
- CocoaPods installation succeeds.
- Native Xcode build succeeds and launches on an iPhone 17 Pro simulator.
- Generated `Info.plist` contains foreground/background location, camera, and photo-library permission descriptions.
- Simulator movement from Circular Quay to Martin Place recentres the map and refreshes nearby content.
- Live Wikipedia and Heritage NSW requests return nearby Sydney candidates.
- Live Gemini structured-story generation succeeds.
- Live Gemini image editing with an image input, image output, and Google Search grounding succeeds.
- The grounded image test returned in approximately 15 seconds.
- Explore, Nearby, History, and the Time Camera setup interface render correctly in the simulator.

Run the checks again after handoff:

```sh
npm run typecheck
npm test
```

## Known limitations

- Physical camera capture, background location, and locked-screen notifications still need end-to-end testing on a real iPhone.
- Gemini is asked to preserve identity in selfies, but subtle face or body changes can still occur. Identity preservation is best-effort.
- Historical reconstructions are grounded suggestions, not verified depictions. The UI must continue labelling them as AI interpretations.
- Generated Time Camera images are not saved or shareable yet.
- The Time Camera currently launches the camera; choosing an existing library photo is not exposed in the UI yet.
- Cross-source duplicates can occur when Wikipedia and Heritage NSW describe the same place with different IDs.
- Image licensing/attribution is retained indirectly through source records but is not yet displayed on every nearby card.
- Notification taps do not yet open a dedicated story-detail screen.
- A force-quit stops background execution until the user opens the app again.
- The app may operate foreground-only when iOS declines background-location permission.
- There is no backend protection for the Gemini key.

## Recommended next work

1. Run the full app on a physical iPhone and verify camera capture, image generation, foreground walking, background walking, and locked-screen notifications.
2. Add a before/after comparison and save/share controls for Time Camera results.
3. Add a story-detail route and open it from map markers, nearby cards, history cards, and notification taps.
4. Add visible image attribution and source links.
5. Merge cross-source candidates referring to the same physical place.
6. Add UI/integration tests for map refresh, history, permission denial, API failure, and camera reconstruction states.
7. Move Gemini calls behind a small backend before distributing the app outside the hackathon team.

## Useful commands

```sh
# Static checks
npm run typecheck
npm test

# Start Metro for the native development client
npm start

# Build and run iOS
npm run ios

# Install a bundled Release build on a connected physical iPhone
npm run ios:standalone

# Inspect public Expo configuration
npx expo config --type public

# Regenerate native iOS only when plugin/config changes require it
npx expo prebuild --platform ios

# Produce an iOS JavaScript export without launching Xcode
npx expo export --platform ios --output-dir /tmp/tripback-export --clear
```

Before changing or deleting files, check the repository status. The repository may contain unrelated user work, especially in the sibling Swift starter.
