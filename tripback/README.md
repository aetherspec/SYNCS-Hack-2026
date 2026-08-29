# TripBack — handover

TripBack is an iOS React Native / Expo app: walk around Sydney, see nearby history, photograph a facade, and get a Gemini reconstruction of that viewpoint in another year.

This folder is the live app:

```text
SYNCS-Hack-2026/tripback/
```

The git root is the parent `SYNCS-Hack-2026` repo. Do not overwrite or delete the sibling `../ios-TripBack/` Swift starter.

There is no backend, account system, or cloud database. Wikipedia, Heritage NSW, Wikimedia, Apple Maps, and Gemini are called from the phone. The Gemini key is bundled in the client for this private demo — restrict quota, do not ship the build widely, and rotate the key after the event.

## What the app does

**Map.** Apple Maps only (`react-native-maps`). Wikipedia and Heritage NSW are always on. Pins and the bottom rail show curated Rocks sites plus live discoveries. Panning the map (without walking) refetches spots around the camera centre after ~150 m of movement. Recenter (compass) follows GPS again. **Start a walk** records a real outing; **Demo** replays a Rocks-loop GPS path on the map without saving a canned walk.

**Place pages.** Opening a curated site or a live discovery shows a Wikipedia / Commons photo immediately. **Take a photo** opens the system camera. After a reconstruction exists, the button becomes **Take another photo**. Then/now slider appears only when a generated image exists. Source boxes and AI-interpretation captions were removed from the UI.

**Walks.** Only walks the user starts and ends. Names are Morning / Afternoon / Evening walk from the start time — Gemini no longer invents recap titles. Simulated sessions are excluded from the list.

**Passport.** One stamp per opened portal, anywhere, not limited to The Rocks. Twelve stamps fill a page and count as one Keeper stamp; the next portal starts a new page. Settings still has nudge radius, quiet-on-repeat, track-walks, and clear library.

**On-device library.** Walks, route points, discoveries, citations, and portal images (modern + generated panoramas) live in SQLite on the phone.

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript
- Small custom stack navigator (`src/nav.ts`, `src/navigation.tsx`) — not Expo Router
- Path alias `@/*` → `src/*`
- Apple Maps, Expo Location / Task Manager / Notifications / Image Picker / SQLite / Font / Splash
- Reanimated 4, Gesture Handler, SVG
- `@google/genai`
- Optional native ARKit module: `modules/reality-portal/` (still linked; the current UI does not push the look-around viewer)

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

Do not use Expo Go. Background location, camera, and the RealityPortal module need the native app.

**Do not casually run `npx expo prebuild --clean`.** Prebuild recreates `ios/` and drops signing plus the RealityPortal link. If you must prebuild, use `npx expo prebuild --platform ios` (no `--clean`), then confirm:

- `DEVELOPMENT_TEAM = 6T277AMLZM` is back in the pbxproj
- `ios/Pods/Target Support Files/Pods-TripBack/ExpoModulesProvider.swift` includes `RealityPortalModule.self`
- the podspec path is `modules/reality-portal/ios/RealityPortal.podspec` (not a nested duplicate)

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
src/alternateReality/   unused-in-UI AR look-around (module still present)
modules/reality-portal/ Expo native ARKit viewer
ios/                    generated Xcode workspace — treat as generated, but signing is hand-restored
scripts/ios-standalone.sh
```

UI state (opened portals, active walk, pending camera capture) is `src/components/app-state.tsx`. It hydrates walks and portal pins from `tripBackEngine`.

## Runtime

**Nearby (map, including pan):** GPS or map-camera centre → Wikipedia geosearch + Heritage NSW (500 m) → skip names that match curated sites → show up to 8 cards/pins. Distances follow the look-at point. First load uses GPS; after the user pans, compass-recenter returns to GPS.

**Walk notifications:** `startWalk` → background location → `processLocation` → throttle (~150 m or 90 s) → same sources → Gemini picks one story within 200 m → SQLite + local notification. Tuning is in `src/config.ts`.

**Time photo:** site/discover CTA → system camera (`takePortalPhoto`) → generating screen → `createHistoricalPanorama` → `tripBackEngine.savePortal` (modern + generated bytes, heading, coordinate, walk id if walking). Then/now uses those URIs.

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

Vitest covers geo helpers in `src/domain/geo.test.ts`.

Verified on a physical iPhone (Release standalone) during the hack: map, pan-to-refresh nearby, camera → generate → then/now, recorded walks only, Apple Maps, passport stamps, Wikipedia/Heritage always on.

## Gotchas

- Generated images are AI reconstructions from the user’s photo, not archives. The on-screen warning was removed by product choice; keep that distinction in any public copy.
- Cross-source duplicates still happen (Wikipedia vs Heritage NSW, different IDs).
- Notification taps do not deep-link to a place screen.
- Force-quit stops background walking until the app is opened again.
- Simulator has no real camera; use a phone for the photo flow.
- `ios/` is Expo-generated. After prebuild, re-set the development team and confirm RealityPortal is in `ExpoModulesProvider.swift`.
- Do not merge `origin/main` blindly; the design prototype and this native app diverged. UI was ported by hand into `src/screens/`.

## Next work (if continuing)

1. Deep-link notifications into site/discover.
2. Deduplicate Wikipedia + Heritage hits for the same building.
3. Proxy Gemini through a backend before any wider install.
4. Attribution on photos (Wikipedia / Commons / Heritage).
5. Walk-detail map that shows the real recorded route (today it is a decorative card).
6. Tests for nearby refresh, camera failure, and empty walks.
