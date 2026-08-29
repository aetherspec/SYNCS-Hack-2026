import 'react-native-gesture-handler';
import './src/services/location/backgroundTask';

import {
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PortalViewerModal } from './src/alternateReality/PortalViewerModal';
import { AppStateProvider, useAppState } from './src/components/app-state';
import { HistoricalVideoLayer } from './src/components/historical-video';
import { NavigationRoot } from './src/navigation';
import { consumeInitialNotificationDestination } from './src/services/notifications/NotificationService';

SplashScreen.preventAutoHideAsync();

function PortalLayer() {
  const { viewingPortal, closePortalViewer, location } = useAppState();
  if (!viewingPortal) return null;
  return (
    <PortalViewerModal
      visible
      portal={viewingPortal}
      currentLocation={location}
      onClose={closePortalViewer}
    />
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const [initialHref, setInitialHref] = useState<string>();

  useEffect(() => {
    void Promise.all([
      Location.getForegroundPermissionsAsync(),
      consumeInitialNotificationDestination(),
    ]).then(([permission, notificationHref]) => {
      setInitialHref(notificationHref ?? (permission.granted ? '/map' : '/onboarding'));
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded && initialHref) void SplashScreen.hideAsync();
  }, [fontsLoaded, initialHref]);

  if (!fontsLoaded || !initialHref) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStateProvider>
        <NavigationRoot initialHref={initialHref} />
        <PortalLayer />
        <HistoricalVideoLayer />
        <StatusBar style="dark" />
      </AppStateProvider>
    </GestureHandlerRootView>
  );
}
