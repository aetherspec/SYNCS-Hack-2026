import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import type { PendingCapture } from '@/components/app-state';
import type { Coordinate } from '@/domain/types';

export async function takePortalPhoto({
  siteId,
  era,
  name,
  coordinate,
}: {
  siteId: string;
  era: string;
  name: string;
  coordinate: Coordinate;
}): Promise<PendingCapture | undefined> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera needed', 'TripBack uses the camera to pin this view in place.');
    return;
  }

  let heading = 0;
  try {
    const next = await Location.getHeadingAsync();
    const value = next.trueHeading >= 0 ? next.trueHeading : next.magHeading;
    if (Number.isFinite(value)) heading = value;
  } catch {
    // Compass is optional; the portal still pins to GPS.
  }

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.6,
      base64: true,
      exif: false,
    });
  } catch (error) {
    Alert.alert('Camera failed', String(error));
    return;
  }
  if (result.canceled) return;
  const asset = result.assets[0];
  if (!asset?.base64) {
    Alert.alert('Couldn’t read that photo', 'Please try taking it again.');
    return;
  }

  return {
    siteId,
    era,
    name,
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType || 'image/jpeg',
    heading,
    coordinate,
  };
}
