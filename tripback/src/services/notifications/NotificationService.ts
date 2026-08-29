import * as Notifications from 'expo-notifications';

import type { Discovery } from '../../domain/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyDiscovery(discovery: Discovery): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: discovery.title,
      body: discovery.hook,
      sound: 'default',
      data: { discoveryId: discovery.id },
    },
    trigger: null,
  });
}
