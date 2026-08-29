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
  const placeTitle = discovery.citations[0]?.title ?? discovery.title;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: discovery.title,
      body: discovery.hook,
      sound: 'default',
      data: {
        discoveryId: discovery.id,
        candidateId: discovery.candidateId,
        placeTitle,
      },
    },
    trigger: null,
  });
}

export function notificationDestination(
  response?: Notifications.NotificationResponse | null,
): string | undefined {
  const data = response?.notification.request.content.data;
  const candidateId = typeof data?.candidateId === 'string' ? data.candidateId : undefined;
  if (!candidateId) return undefined;
  const placeTitle = typeof data?.placeTitle === 'string' ? data.placeTitle : 'Discovered place';
  return `/discover/${encodeURIComponent(candidateId)}?name=${encodeURIComponent(placeTitle)}`;
}

export function listenForNotificationDestinations(
  listener: (href: string) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const href = notificationDestination(response);
    if (href) listener(href);
  });
  return () => subscription.remove();
}

export async function consumeInitialNotificationDestination(): Promise<string | undefined> {
  const response = await Notifications.getLastNotificationResponseAsync();
  const href = notificationDestination(response);
  if (response) await Notifications.clearLastNotificationResponseAsync();
  return href;
}
