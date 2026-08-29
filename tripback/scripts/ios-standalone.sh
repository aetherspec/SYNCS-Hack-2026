#!/usr/bin/env bash
# Build a Release iOS app with JS and EXPO_PUBLIC_* compiled in, then
# install it on a paired iPhone. After this, the phone can unplug.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local. Copy .env.example and add the Gemini key before building." >&2
  exit 1
fi

MODULE_PROVIDER="ios/Pods/Target Support Files/Pods-TripBack/ExpoModulesProvider.swift"
if [[ ! -f "$MODULE_PROVIDER" ]] || ! grep -q 'TripBackARModule.self' "$MODULE_PROVIDER"; then
  echo "TripBackAR is not linked. Run 'cd ios && pod install && cd ..' before building." >&2
  exit 1
fi

DEVICE_JSON="$(mktemp)"
trap 'rm -f "$DEVICE_JSON"' EXIT
xcrun devicectl list devices --json-output "$DEVICE_JSON" >/dev/null

eval "$(python3 - "$DEVICE_JSON" <<'PY'
import json, sys

data = json.load(open(sys.argv[1]))
picked = None
for device in data.get("result", {}).get("devices", []):
    hardware = device.get("hardwareProperties", {})
    connection = device.get("connectionProperties", {})
    properties = device.get("deviceProperties", {})
    if connection.get("pairingState") != "paired":
        continue
    if hardware.get("platform") not in ("iOS", "iPadOS"):
        continue
    candidate = {
        "id": device.get("identifier"),
        "udid": hardware.get("udid"),
        "name": properties.get("name"),
        "wired": connection.get("transportType") == "wired",
    }
    if picked is None or (candidate["wired"] and not picked["wired"]):
        picked = candidate

if not picked or not picked["id"] or not picked["udid"]:
    sys.stderr.write(
        "No paired iPhone found. Unlock it, tap Trust, and keep it plugged in.\n"
    )
    sys.exit(1)

def sh(value):
    return "'" + str(value).replace("'", "'\\''") + "'"

print(f"DEVICE_CORE={sh(picked['id'])}")
print(f"DEVICE_UDID={sh(picked['udid'])}")
print(f"DEVICE_NAME={sh(picked['name'])}")
PY
)"

echo "Building Release for ${DEVICE_NAME}."
echo "JavaScript and EXPO_PUBLIC_* values are compiled into the app."
echo "After install you can unplug. The app still needs internet for maps, Wikipedia, Heritage NSW, and Gemini."

xcodebuild \
  -workspace ios/TripBack.xcworkspace \
  -scheme TripBack \
  -configuration Release \
  -destination "id=${DEVICE_UDID}" \
  -allowProvisioningUpdates \
  build

APP="$(ls -d "${HOME}"/Library/Developer/Xcode/DerivedData/TripBack-*/Build/Products/Release-iphoneos/TripBack.app 2>/dev/null | head -n 1)"
if [[ -z "$APP" || ! -d "$APP" ]]; then
  echo "Release app was not found in DerivedData after the build." >&2
  exit 1
fi
if [[ ! -f "$APP/main.jsbundle" ]]; then
  echo "main.jsbundle is missing from ${APP}. The phone would show 'No script URL provided'." >&2
  exit 1
fi

echo "Installing ${APP}"
xcrun devicectl device install app --device "$DEVICE_CORE" "$APP"
xcrun devicectl device process launch --device "$DEVICE_CORE" com.syncshack.tripback
echo "TripBack is installed and launched. You can unplug the phone."
