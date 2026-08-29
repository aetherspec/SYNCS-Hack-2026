# TripBack — handover

TripBack is an iOS React Native / Expo app: walk around Sydney, see nearby history, photograph a facade, and get a Gemini reconstruction of that viewpoint in another year.

This folder is the live app:

```text
SYNCS-Hack-2026/tripback/
```

The git root is the parent `SYNCS-Hack-2026` repo. Do not overwrite or delete the sibling `../ios-TripBack/` Swift starter.

There is no backend, account system, or cloud database. Wikipedia, Heritage NSW, Wikimedia, Apple Maps, and Gemini are called from the phone. The Gemini key is bundled in the client for this private demo — restrict quota, do not ship the build widely, and rotate the key after the event.

## What the app does

**Map.** Apple Maps only (`react-native-maps`). The map waits for a real GPS fix, starts at the user, and follows location updates. Wikipedia, Heritage NSW, and Apple’s normal points of interest make the visible area feel populated. Panning or zooming refetches up to 40 stories around the camera; the search radius expands with the viewport up to 10 km. Recenter (compass) follows GPS again. **Start a walk** records a real outing; **Demo** replays a Rocks-loop GPS path on the map without saving a canned walk.

**Place pages.** Opening a curated site or a live discovery shows a Wikipedia / Commons photo immediately, with extra clearance between the image and title. If a Heritage NSW place has no Wikipedia article, Gemini researches the exact heritage record with Google Search grounding and supplies a concise overview plus up to three verified, meaningful dates; the result is cached in memory and falls back to a local heritage message if Gemini is unavailable. Era chips represent actual events and reveal a **Why this year** explanation when selected. Construction ranges are combined and administrative dates such as heritage-register listings are excluded, so Haymarket Post Office is one `1928 — Built 1927–1928` era rather than unrelated 1927/1928/1999 chips. **+ Choose year** accepts any four-digit year from 1700 through five years ago. **Take a photo** creates the normal then/now result and returns to the page. **Create AR view** captures and generates the same historically reconstructed scene, then automatically opens wall placement. Once saved, **Place in AR** and **Take another photo** remain separate actions.

**AR placement.** A saved reconstruction can be opened from a curated place, live discovery, or previous walk. TripBack finds vertical surfaces through ARKit; tap a wall or facade to place the upright historical scene, pinch to resize it, twist to rotate it, and tap elsewhere to move it. The viewer uses the existing purple/lime TripBack design and offers a draggable panorama fallback if AR tracking is unavailable.

**Walks.** Only walks the user starts and ends. Names are Morning / Afternoon / Evening walk from the start time — Gemini no longer invents recap titles. Simulated sessions are excluded from the list. Completed-walk detail uses actual SQLite route points and named photo locations on an Apple map; human-readable `placeTitle` metadata is retained instead of exposing portal IDs.

**Passport.** One stamp per opened historical view, anywhere, not limited to The Rocks. Each stamp keeps its place name, selected era/event, and visit date after restart. Twelve stamps fill a page and count as one Keeper stamp; the next view starts a new page. Settings has nudge radius, quiet-on-repeat, track-walks, and clear library; the old source footnote is removed.

**On-device library.** Walks, route points, discoveries, citations, and portal images (modern + generated panoramas) live in SQLite on the phone.

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript
- Small custom stack navigator (`src/nav.ts`, `src/navigation.tsx`) — not Expo Router
- Path alias `@/*` → `src/*`
- Apple Maps, Expo Location / Task Manager / Notifications / Image Picker / SQLite / Font / Splash
- Reanimated 4, Gesture Handler, SVG
- `@google/genai`
- Native ARKit wall-placement module: `modules/tripback-ar/`
- Legacy automatic RealityKit viewer: `modules/reality-portal/` (still linked, no longer used by the UI)

iOS identity:

- Bundle ID `com.syncshack.tripback`
- Apple team `6T277AMLZM` (`app.json` `appleTeamId` and the Xcode project)

## Setup

Needs macOS, Xcode plus an iOS runtime, Node/npm, and CocoaPods.

```sh
cd tripback
cp .env.example .env.local   # then put the demo Gemini key in
npm ci
npm run typecheck
npm test
```

If Xcode is not selected:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Native pods, if needed:

```sh
cd ios && pod install && cd ..
```

`.env.local` and `.env` are gitignored. Do not commit the real key.

```dotenv
EXPO_PUBLIC_GEMINI_API_KEY=replace-with-the-demo-key
EXPO_PUBLIC_GEMINI_MODEL=gemini-3.5-flash-lite
EXPO_PUBLIC_GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
```

- `EXPO_PUBLIC_GEMINI_MODEL` — short grounded story JSON (walk notifications).
- `EXPO_PUBLIC_GEMINI_IMAGE_MODEL` — edits the camera photo into a wide historical view.

`package-lock.json` is the lockfile. Ignore leftover pnpm files.

## Run

Development client (Metro + Xcode):

```sh
npm run ios
```

Standalone Release on a paired, unlocked iPhone (JS and `EXPO_PUBLIC_*` compiled in; unplug after install):

```sh
npm run ios:standalone
```

The phone still needs internet for maps, Wikipedia, Heritage NSW, Wikimedia, and Gemini. If you see `No script URL provided`, a Debug build was installed without Metro — reinstall with `ios:standalone`.

Do not use Expo Go. Background location, camera, and TripBackAR need the native app.

**Do not casually run `npx expo prebuild --clean`.** Prebuild recreates `ios/` and may drop signing or native module links. If you must prebuild, use `npx expo prebuild --platform ios` (no `--clean`), run `cd ios && pod install && cd ..`, then confirm:

- `DEVELOPMENT_TEAM = 6T277AMLZM` is back in the pbxproj
- `ios/Pods/Target Support Files/Pods-TripBack/ExpoModulesProvider.swift` includes `TripBackARModule.self`
- the podspec path is `modules/tripback-ar/ios/TripBackAR.podspec`

## Layout

```text
App.tsx                 fonts, splash, AppStateProvider, navigator, portal viewer layer
src/navigation.tsx      screen switcher
src/screens/            map, site, discover, generating, walks, passport, settings, onboarding
src/components/         Apple map, nearby hook, then/now slider, tab bar, app state
src/constants/places.ts curated Rocks / Circular Quay sites
src/config.ts           Gemini + search/notify distances
src/core/               walk engine, processLocation, events
src/services/discovery/ Wikipedia, Heritage NSW, Gemini stories
src/services/images/    camera capture, Gemini panorama, persist remote thumbs
src/services/database/  SQLite
src/alternateReality/   full-screen AR placement and panorama fallback UI
modules/tripback-ar/    Expo native ARKit/SceneKit surface-placement module
modules/reality-portal/ legacy native viewer (linked but unused)
ios/                    generated Xcode workspace — treat as generated, but signing is hand-restored
scripts/ios-standalone.sh
```

UI state (opened portals, active walk, pending camera capture) is `src/components/app-state.tsx`. It hydrates walks and portal pins from `tripBackEngine`.

## Runtime

**Nearby (map, including pan/zoom):** wait for GPS → map viewport → Wikipedia geosearch + Heritage NSW using an 800 m–10 km viewport-aware radius → skip names matching curated sites → show up to 40 cards/pins. A substantial centre move or zoom change triggers a debounced refresh. Distances follow the map centre; compass-recenter returns to GPS.

**Walk notifications:** `startWalk` → background location → `processLocation` → throttle (~150 m or 90 s) → same sources → Gemini picks one story within 200 m → SQLite + local notification. The payload stores the candidate ID and place title; tapping routes to that exact discovery whether the app is foregrounded, backgrounded, or launched cold. Tuning is in `src/config.ts`.

**Time photo:** **Take a photo** → system camera (`takePortalPhoto`) → generating screen → `createHistoricalPanorama` → `tripBackEngine.savePortal` (modern + generated bytes, heading, coordinate, place title, walk id if walking) → return to then/now.

**AR portal:** **Create AR view** runs camera + generation and opens the result immediately; a saved place/discovery/walk uses **Place in AR**. `openPortalViewer(portalId)` loads the generated image from SQLite → `TripBackARView` starts vertical-plane detection → tap to place, pinch to resize, twist to rotate. **Switch to panorama** keeps the historical view usable when ARKit is unsupported or tracking fails.

**Image reconstruction rules:** Gemini must preserve the original camera projection and use modern geometry as a scaffold only where historically compatible. Period-incompatible objects are translated at roughly the same scale and position (for example whiteboard → chalkboard). Grounded historical land use overrides the modern enclosure entirely when the photographed structure did not exist—for example an indoor room becomes farmland if those coordinates were farmland in the selected year.

**Passport:** every `opened` portal id is a stamp. `floor(count / 12)` is the Keeper reward count; remainder (or a full page of 12) is the current grid.

## Engine API

```ts
import { tripBackEngine } from '@/core/TripBackEngine';
```

`initialize`, `subscribe`, `startWalk`, `stopWalk`, `runSimulation`, `listDiscoveries`, `listWalks`, `savePortal`, `getPortal`, `listPortalPins`, `clearHistory`.

Nearby list: `listNearbyPlaces` in `DiscoveryService.ts`. Image edit: `createHistoricalPanorama` in `HistoricalImageClient.ts` (there is also a narrower `createHistoricalView`).

## Checks

```sh
npm run typecheck
npm test
```

Vitest covers geo helpers and significant-era extraction, including the Haymarket construction-range/heritage-listing case.

Verified on a physical iPhone (Release standalone) during the hack: map, pan-to-refresh nearby, camera → generate → then/now, recorded walks only, Apple Maps, passport stamps, Wikipedia/Heritage always on.

The TripBackAR pod is linked and its native target has been compiled successfully. Final camera tracking and placement still need a physical-device smoke test; ARKit world tracking does not run in the iOS Simulator.

## Gotchas

- Generated images are AI reconstructions from the user’s photo, not archives. The on-screen warning was removed by product choice; keep that distinction in any public copy.
- Cross-source duplicates still happen (Wikipedia vs Heritage NSW, different IDs).
- Notifications created by older builds lack destination metadata; only newly delivered notifications can deep-link.
- Force-quit stops background walking until the app is opened again.
- Simulator has no real camera or AR world tracking; use a phone for the complete photo and placement flow.
- With the current Xcode 26.5 / React Native toolchain, a Debug simulator build can hit an existing React Native `Sealable` linker mismatch. The unsigned Release device build succeeds; use `ios:standalone` for the demo phone.
- If the AR viewer reports no surface, move the phone slowly in good light and point it at a textured, flat wall before tapping.
- `ios/` is Expo-generated. After prebuild, re-set the development team, run `pod install`, and confirm `TripBackARModule.self` is in `ExpoModulesProvider.swift`.
- Do not merge `origin/main` blindly; the design prototype and this native app diverged. UI was ported by hand into `src/screens/`.

## Next work (if continuing)

1. Deduplicate Wikipedia + Heritage hits for the same building.
2. Proxy Gemini through a backend before any wider install.
3. Attribution on photos (Wikipedia / Commons / Heritage).
4. Tests for nearby refresh, camera failure, empty walks, and notification routing.
