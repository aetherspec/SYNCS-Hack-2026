import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { processLocation } from '../../core/processLocation';

export const TRIPBACK_LOCATION_TASK = 'tripback-active-walk-location';

type LocationTaskData = { locations: Location.LocationObject[] };

if (!TaskManager.isTaskDefined(TRIPBACK_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(
    TRIPBACK_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data) return;
      for (const location of data.locations) {
        try {
          await processLocation(
            {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            {
              accuracy: location.coords.accuracy ?? undefined,
              capturedAt: new Date(location.timestamp).toISOString(),
            },
          );
        } catch (processingError) {
          console.warn('TripBack location processing failed', processingError);
        }
      }
    },
  );
}
