import { useState } from 'react';
import { Alert } from 'react-native';

import { currentCoordinate, useAppState } from '@/components/app-state';
import { useRouter } from '@/nav';
import { takePortalPhoto } from '@/services/images/takePortalPhoto';

export function useOpenTimePortal(siteId: string, era: string, name: string) {
  const router = useRouter();
  const { location, setPendingCapture } = useAppState();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (!siteId || busy) return;
    setBusy(true);
    try {
      const photo = await takePortalPhoto({
        siteId,
        era,
        name,
        coordinate: currentCoordinate(location),
      });
      if (!photo) return;
      setPendingCapture(photo);
      router.push(
        `/generating/${encodeURIComponent(siteId)}?era=${encodeURIComponent(
          era,
        )}&name=${encodeURIComponent(name)}`,
      );
    } catch (error) {
      console.warn('Unable to open the camera', error);
      Alert.alert('Camera failed', String(error));
    } finally {
      setBusy(false);
    }
  };

  return { open, busy };
}
