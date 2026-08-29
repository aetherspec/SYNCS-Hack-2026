# TripBack

> Turn every walk into a walk through time—discover the stories beneath Sydney’s streets and see the past come alive.

TripBack is an iOS app that turns an ordinary walk into an interactive journey through local history.

## Inspiration

Sydney is filled with stories hiding in plain sight. We walk past old pubs, parks, buildings and street corners every day without knowing what happened there.

We built TripBack to make an ordinary walk feel like an adventure—one where the city reveals its past as you explore it.

## What it does

TripBack follows your location and lets you know when you approach an interesting place. You can discover what happened there, explore important years and see how the location may have looked at different points in time.

You can photograph the modern scene, reconstruct it in a selected historical period and compare then with now. You can also place the historical view into the real world using AR or animate it into a short, lively scene.

TripBack records your walking route, visited locations and historical creations. These become part of a personal passport showing everywhere you have travelled through time.

The app also includes a dedicated First Nations map highlighting publicly documented places connected to Aboriginal history, activism, community and living culture.

## How to use TripBack

1. Open TripBack and allow location access so the map can follow you. Allow notifications if you want nearby story alerts.
2. Explore the **Map**. Drag or zoom to browse another area, or press the compass to return to your current location.
3. Press **Start a walk** before heading out. TripBack records your route locally and alerts you when an interesting place is close.
4. Tap a place or open a notification to read its story and see why each historical year matters.
5. Select a suggested year or choose your own.
6. Choose **Take a photo** for a then-and-now comparison, or **Create AR view** to place the reconstructed past onto a wall or facade.
7. In AR, move slowly until a surface is found. Tap to place the scene, pinch to resize and twist to rotate. You can switch to panorama view if surface tracking is difficult.
8. Choose **Bring this scene to life** after creating a historical scene. You can continue exploring the app while it is prepared.
9. Open **Walks** to revisit completed routes, **Passport** to see collected places, and **First Nations** to explore its separate public-history map.
10. For a quick demonstration, open **Settings → Replay demo walk**. TripBack follows a simulated route through The Rocks and previews its nearby notifications.

TripBack works best outdoors with location services enabled. AR works best in good light while pointing at a textured, flat wall or building facade.

## How we built it

We built TripBack as an iOS app using React Native, Expo and TypeScript.

Live GPS tracking powers a map that follows the user as they walk. Native iOS notifications alert users when they approach a nearby story and open the exact location when tapped.

We used Swift, ARKit and SceneKit to create the surface-placement experience, allowing users to position historical scenes on real walls and building facades. Walks, routes, visited places and saved creations are stored locally on the device using SQLite.

The app was built, signed and tested on a physical iPhone using Xcode and CocoaPods.

## Challenges we ran into

Many of TripBack’s most important features—location tracking, the camera, notifications and AR—behave differently on a physical phone than they do in a simulator. This meant repeatedly building and installing the app on a real iPhone during development.

Creating convincing historical scenes was another challenge. The result needed to retain the user’s original viewpoint while changing anything that did not belong in the selected period.

For example, a modern whiteboard might become a chalkboard in the same position. However, if the modern building did not exist and the site was farmland at the time, the entire interior needed to become an outdoor landscape.

We also worked through background location tracking, notification deep-linking, AR surface detection, image orientation and long-running video generation that needed to continue while the user explored another part of the app.

## Accomplishments that we're proud of

We created a complete experience that works on a real iPhone:

- A live map that follows the user’s location.
- Nearby historical places and location-triggered notifications.
- Notifications that open the exact place being described.
- Historical scene reconstruction and then-and-now comparison.
- Native AR placement on walls and building facades.
- Short animated historical scenes.
- Recorded walks with routes and visited locations.
- A personal passport of completed experiences.
- A curated First Nations public-history map.
- A standalone app that works without a development computer.

We are especially proud that TripBack brings all these features together without making the experience feel complicated. You can simply start walking and let the city tell you its stories.

## What we learned

We learned how important physical-device testing is when building an app around the real world. Location accuracy, camera behaviour, AR tracking and notifications can only be properly understood by leaving the desk and walking around with the app.

We also learned that historical recreation involves more than changing an image’s visual style. The viewpoint, architecture, land use, objects and atmosphere all need to make sense for the selected location and year.

Finally, we learned that cultural history requires care. Public information must be presented respectfully, and culturally sensitive locations should never be treated as ordinary map data.

## What's next for TripBack

We want to expand TripBack beyond central Sydney with more neighbourhoods, historical events and curated walking trails.

The next stage of the First Nations experience would involve working directly with local Aboriginal communities and knowledge holders to decide which stories should be included and how they should be presented.

We would also like to introduce shared walks, classroom experiences, community-contributed stories and easier ways to save and share historical scenes.

Eventually, TripBack could help people travel through the history of cities around the world—one walk at a time.

## Developer setup

The live application is in [`tripback/`](tripback/). See [`tripback/README.md`](tripback/README.md) for environment setup, iPhone installation, architecture and handover notes.

