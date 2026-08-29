import { useEffect, useState } from 'react';

import { fetchPlacePhoto } from '@/services/discovery/WikipediaClient';

export function usePlacePhoto(title?: string) {
  const [uri, setUri] = useState<string>();

  useEffect(() => {
    if (!title) {
      setUri(undefined);
      return;
    }
    let cancelled = false;
    void fetchPlacePhoto(title).then((next) => {
      if (!cancelled) setUri(next);
    });
    return () => {
      cancelled = true;
    };
  }, [title]);

  return uri;
}
