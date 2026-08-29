import './src/services/location/backgroundTask';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import { tripBackEngine } from './src/core/TripBackEngine';
import { distanceMetres, PORTAL_PROXIMITY_METRES } from './src/domain/geo';
import type {
  Coordinate,
  Discovery,
  EngineStatus,
  RealityPortal,
  RealityPortalPin,
  StoryCandidate,
  WalkDetail,
  WalkSession,
} from './src/domain/types';
import { listNearbyPlaces } from './src/services/discovery/DiscoveryService';
import { createHistoricalView } from './src/services/images/HistoricalImageClient';
import { AlternateRealityModal } from './src/alternateReality/AlternateRealityModal';
import { PortalViewerModal } from './src/alternateReality/PortalViewerModal';

const sydneyCentre: Coordinate = { latitude: -33.856784, longitude: 151.215297 };
const initialRegion: Region = {
  ...sydneyCentre,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

type Tab = 'explore' | 'history';

export default function App() {
  const mapRef = useRef<MapView>(null);
  const lastNearbyOrigin = useRef<Coordinate | undefined>(undefined);
  const nearbyRequest = useRef(0);
  const followingLocation = useRef(true);
  const [tab, setTab] = useState<Tab>('explore');
  const [status, setStatus] = useState<EngineStatus>({ ready: false });
  const [currentLocation, setCurrentLocation] = useState<Coordinate>();
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [locationMessage, setLocationMessage] = useState('Finding your location…');
  const [nearby, setNearby] = useState<StoryCandidate[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [walks, setWalks] = useState<WalkSession[]>([]);
  const [portals, setPortals] = useState<RealityPortalPin[]>([]);
  const [openPortal, setOpenPortal] = useState<RealityPortal>();
  const [busyAction, setBusyAction] = useState<string>();

  const refreshHistory = useCallback(async () => {
    const [savedDiscoveries, savedWalks, savedPortals] = await Promise.all([
      tripBackEngine.listDiscoveries(),
      tripBackEngine.listWalks(),
      tripBackEngine.listPortalPins(),
    ]);
    setDiscoveries(savedDiscoveries);
    setWalks(savedWalks.filter((walk) => !walk.isSimulated));
    setPortals(savedPortals);
  }, []);

  const loadNearby = useCallback(async (coordinate: Coordinate, force = false) => {
    if (
      !force &&
      lastNearbyOrigin.current &&
      distanceMetres(lastNearbyOrigin.current, coordinate) < 50
    ) {
      return;
    }
    lastNearbyOrigin.current = coordinate;
    const requestId = ++nearbyRequest.current;
    setNearbyLoading(true);
    try {
      const places = await listNearbyPlaces(coordinate);
      if (requestId === nearbyRequest.current) setNearby(places);
    } catch (error) {
      console.warn('Unable to load nearby TripBack places', error);
    } finally {
      if (requestId === nearbyRequest.current) setNearbyLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = tripBackEngine.subscribe(setStatus);
    void tripBackEngine.initialize().then(refreshHistory);
    void loadNearby(sydneyCentre);
    return unsubscribe;
  }, [loadNearby, refreshHistory]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    const receiveLocation = (location: Location.LocationObject) => {
      if (cancelled) return;
      const coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(coordinate);
      setLocationMessage('Live location');
      void loadNearby(coordinate);
      if (followingLocation.current) {
        mapRef.current?.animateToRegion(
          { ...coordinate, latitudeDelta: 0.009, longitudeDelta: 0.009 },
          650,
        );
      }
    };

    async function beginForegroundTracking() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationMessage('Location is off — showing central Sydney');
        return;
      }
      setLocationAllowed(true);
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        receiveLocation(initial);
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 2_000,
          },
          receiveLocation,
        );
      } catch (error) {
        setLocationMessage('Waiting for a GPS signal…');
        console.warn('Foreground location unavailable', error);
      }
    }

    void beginForegroundTracking();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [loadNearby]);

  useEffect(() => {
    if (!status.latestDiscovery) return;
    setDiscoveries((previous) => [
      status.latestDiscovery!,
      ...previous.filter((item) => item.id !== status.latestDiscovery!.id),
    ]);
  }, [status.latestDiscovery]);

  useEffect(() => {
    if (tab === 'history') void refreshHistory();
  }, [refreshHistory, tab]);

  async function perform(label: string, action: () => Promise<unknown>) {
    setBusyAction(label);
    try {
      await action();
      await refreshHistory();
    } catch (error) {
      Alert.alert('TripBack', error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction(undefined);
    }
  }

  function recenter() {
    const coordinate = currentLocation ?? sydneyCentre;
    followingLocation.current = true;
    mapRef.current?.animateToRegion(
      { ...coordinate, latitudeDelta: 0.009, longitudeDelta: 0.009 },
      500,
    );
  }

  return (
    <View style={styles.app}>
      {tab === 'explore' ? (
        <ExploreScreen
          mapRef={mapRef}
          locationAllowed={locationAllowed}
          locationMessage={locationMessage}
          currentLocation={currentLocation}
          nearby={nearby}
          nearbyLoading={nearbyLoading}
          status={status}
          busyAction={busyAction}
          onPanMap={() => {
            followingLocation.current = false;
          }}
          onRecenter={recenter}
          onStartWalk={() =>
            void perform('Starting walk…', () => tripBackEngine.startWalk())
          }
          onStopWalk={() =>
            void perform('Saving walk…', () => tripBackEngine.stopWalk())
          }
          onDemo={() =>
            void perform('Replaying Sydney…', () => tripBackEngine.runSimulation())
          }
          portals={portals}
          onOpenPortal={(pin) => {
            void tripBackEngine.getPortal(pin.id).then((portal) => {
              if (portal) setOpenPortal(portal);
            });
          }}
          onPortalCreated={(portal) => {
            void refreshHistory();
            setOpenPortal(portal);
          }}
        />
      ) : (
        <HistoryScreen discoveries={discoveries} walks={walks} />
      )}

      {openPortal ? (
        <PortalViewerModal
          visible
          portal={openPortal}
          currentLocation={currentLocation}
          onClose={() => setOpenPortal(undefined)}
        />
      ) : null}

      <View style={styles.tabBar}>
        <TabButton icon="⌖" label="Explore" selected={tab === 'explore'} onPress={() => setTab('explore')} />
        <TabButton icon="↶" label="History" selected={tab === 'history'} onPress={() => setTab('history')} />
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

function ExploreScreen({
  mapRef,
  locationAllowed,
  locationMessage,
  currentLocation,
  nearby,
  nearbyLoading,
  status,
  busyAction,
  onPanMap,
  onRecenter,
  onStartWalk,
  onStopWalk,
  onDemo,
  portals,
  onOpenPortal,
  onPortalCreated,
}: {
  mapRef: React.RefObject<MapView | null>;
  locationAllowed: boolean;
  locationMessage: string;
  currentLocation?: Coordinate;
  nearby: StoryCandidate[];
  nearbyLoading: boolean;
  status: EngineStatus;
  busyAction?: string;
  onPanMap: () => void;
  onRecenter: () => void;
  onStartWalk: () => void;
  onStopWalk: () => void;
  onDemo: () => void;
  portals: RealityPortalPin[];
  onOpenPortal: (pin: RealityPortalPin) => void;
  onPortalCreated: (portal: RealityPortal) => void;
}) {
  const [timeCameraOpen, setTimeCameraOpen] = useState(false);
  const [alternateRealityOpen, setAlternateRealityOpen] = useState(false);
  const nearbyPortal = currentLocation
    ? portals.find((portal) => distanceMetres(currentLocation, portal.coordinate) <= PORTAL_PROXIMITY_METRES)
    : undefined;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.exploreContent}>
      <View style={styles.mapShell}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={locationAllowed}
          showsMyLocationButton={false}
          followsUserLocation={false}
          showsCompass={false}
          onPanDrag={onPanMap}
        >
          {nearby.map((place) => (
            <Marker
              key={place.id}
              coordinate={place.coordinate}
              title={place.title}
              description={`${formatDistance(place.distanceMetres)} away`}
              pinColor="#b34a32"
            />
          ))}
          {portals.map((portal) => (
            <Marker
              key={portal.id}
              coordinate={portal.coordinate}
              title={portal.placeTitle ? `${portal.placeTitle} · ${portal.year}` : `Alternate Reality · ${portal.year}`}
              description="Look around this pinned year"
              pinColor="#5a3d8c"
              onPress={() => onOpenPortal(portal)}
            />
          ))}
        </MapView>

        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.brandEyebrow}>SYDNEY, THEN AND NOW</Text>
            <Text style={styles.brand}>TripBack</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{locationMessage}</Text>
          </View>
        </View>

        <Pressable accessibilityLabel="Recenter map" onPress={onRecenter} style={styles.recenter}>
          <Text style={styles.recenterIcon}>⌖</Text>
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionEyebrow}>AROUND YOU</Text>
            <Text style={styles.sectionTitle}>Nearby places</Text>
          </View>
          {nearbyLoading ? <ActivityIndicator color="#b34a32" /> : null}
        </View>

        {nearby.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyList}>
            {nearby.map((place) => <NearbyCard key={place.id} place={place} />)}
          </ScrollView>
        ) : nearbyLoading ? (
          <View style={styles.emptyCompact}><Text style={styles.emptyText}>Looking for stories nearby…</Text></View>
        ) : (
          <View style={styles.emptyCompact}>
            <Text style={styles.emptyTitle}>No mapped places here yet</Text>
            <Text style={styles.emptyText}>Move the map or walk a little further.</Text>
          </View>
        )}

        {status.latestDiscovery ? (
          <View style={styles.discoveryBanner}>
            <Text style={styles.discoveryLabel}>JUST DISCOVERED</Text>
            <Text style={styles.discoveryTitle}>{status.latestDiscovery.title}</Text>
            <Text style={styles.discoveryHook}>{status.latestDiscovery.hook}</Text>
          </View>
        ) : null}

        {nearbyPortal ? (
          <Pressable
            onPress={() => onOpenPortal(nearbyPortal)}
            style={styles.portalBanner}
          >
            <Text style={styles.portalBannerLabel}>ALTERNATE REALITY · {nearbyPortal.year}</Text>
            <Text style={styles.discoveryTitle}>{nearbyPortal.placeTitle ?? 'Pinned streetscape'}</Text>
            <Text style={styles.discoveryHook}>Look around this year — turn or take a few steps.</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => setTimeCameraOpen(true)}
          style={({ pressed }) => [styles.timeCameraButton, pressed && styles.buttonDimmed]}
        >
          <View style={styles.timeCameraIcon}><Text style={styles.timeCameraIconText}>◉</Text></View>
          <View style={styles.timeCameraCopy}>
            <Text style={styles.timeCameraEyebrow}>TIME CAMERA</Text>
            <Text style={styles.timeCameraTitle}>See this view in the past</Text>
          </View>
          <Text style={styles.timeCameraArrow}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => setAlternateRealityOpen(true)}
          style={({ pressed }) => [styles.alternateButton, pressed && styles.buttonDimmed]}
        >
          <View style={styles.alternateIcon}><Text style={styles.timeCameraIconText}>▣</Text></View>
          <View style={styles.timeCameraCopy}>
            <Text style={styles.alternateEyebrow}>ALTERNATE REALITY</Text>
            <Text style={styles.alternateTitle}>Pin a year to this spot</Text>
          </View>
          <Text style={styles.alternateArrow}>›</Text>
        </Pressable>

        <View style={styles.walkRow}>
          <Pressable
            disabled={Boolean(busyAction) || !status.ready}
            onPress={status.activeWalk && !status.activeWalk.isSimulated ? onStopWalk : onStartWalk}
            style={({ pressed }) => [styles.walkButton, (pressed || busyAction || !status.ready) && styles.buttonDimmed]}
          >
            {busyAction ? <ActivityIndicator color="#fffaf0" /> : null}
            <Text style={styles.walkButtonText}>
              {busyAction ?? (status.activeWalk && !status.activeWalk.isSimulated ? 'End this walk' : 'Start a history walk')}
            </Text>
          </Pressable>
          <Pressable
            disabled={Boolean(busyAction) || Boolean(status.activeWalk)}
            onPress={onDemo}
            style={({ pressed }) => [styles.demoButton, (pressed || busyAction || status.activeWalk) && styles.buttonDimmed]}
          >
            <Text style={styles.demoButtonText}>Demo</Text>
          </Pressable>
        </View>
      </View>

      <TimeCameraModal
        visible={timeCameraOpen}
        coordinate={currentLocation ?? sydneyCentre}
        places={nearby}
        walkId={status.activeWalk?.id}
        onClose={() => setTimeCameraOpen(false)}
      />
      <AlternateRealityModal
        visible={alternateRealityOpen}
        coordinate={currentLocation ?? sydneyCentre}
        places={nearby}
        walkId={status.activeWalk?.id}
        onClose={() => setAlternateRealityOpen(false)}
        onCreated={(portal) => {
          setAlternateRealityOpen(false);
          onPortalCreated(portal);
        }}
      />
    </ScrollView>
  );
}

function NearbyCard({ place }: { place: StoryCandidate }) {
  return (
    <View style={styles.nearbyCard}>
      <PlaceImage imageUrl={place.imageUrl} title={place.title} style={styles.nearbyImage} />
      <View style={styles.nearbyBody}>
        <Text style={styles.distance}>{formatDistance(place.distanceMetres)} away</Text>
        <Text style={styles.nearbyTitle} numberOfLines={2}>{place.title}</Text>
        <Text style={styles.nearbySummary} numberOfLines={3}>{place.summary}</Text>
      </View>
    </View>
  );
}

type CapturedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
};

function TimeCameraModal({
  visible,
  coordinate,
  places,
  walkId,
  onClose,
}: {
  visible: boolean;
  coordinate: Coordinate;
  places: StoryCandidate[];
  walkId?: string;
  onClose: () => void;
}) {
  const [year, setYear] = useState('1890');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [photo, setPhoto] = useState<CapturedPhoto>();
  const [historicalImage, setHistoricalImage] = useState<string>();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const selectedPlace =
    places.find((candidate) => candidate.id === selectedPlaceId) ?? places[0];

  useEffect(() => {
    if (!visible) return;
    setSelectedPlaceId(places[0]?.id);
    setYear(suggestHistoricalYear(places[0]));
    setPhoto(undefined);
    setHistoricalImage(undefined);
    setError(undefined);
  }, [places, visible]);

  function choosePlace(place: StoryCandidate) {
    setSelectedPlaceId(place.id);
    setYear(suggestHistoricalYear(place));
    setHistoricalImage(undefined);
  }

  async function takePhoto() {
    setError(undefined);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is required to capture this view.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.75,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      setError('TripBack could not read that photo. Please try again.');
      return;
    }
    setPhoto({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType || 'image/jpeg',
    });
    setHistoricalImage(undefined);
  }

  async function generate() {
    if (!photo) return;
    if (!/^1[7-9]\d{2}$|^20\d{2}$/.test(year)) {
      setError('Enter a four-digit year between 1700 and 2099.');
      return;
    }
    setGenerating(true);
    setError(undefined);
    try {
      const result = await createHistoricalView({
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        coordinate,
        place: selectedPlace,
        year,
      });
      setHistoricalImage(result.imageDataUri);
      try {
        await tripBackEngine.saveGeneratedImage({
          walkId,
          placeTitle: selectedPlace?.title,
          year,
          coordinate,
          modernBase64: photo.base64,
          modernMimeType: photo.mimeType,
          generatedBase64: result.base64,
          generatedMimeType: result.mimeType,
        });
      } catch (saveError) {
        console.warn('Unable to save Time Camera image', saveError);
      }
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'The historical image could not be created.',
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.cameraModal}>
        <View style={styles.cameraModalHeader}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.cameraClose}>Close</Text>
          </Pressable>
          <Text style={styles.cameraHeaderTitle}>Time Camera</Text>
          <View style={styles.cameraHeaderSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.cameraContent}>
          <Text style={styles.cameraEyebrow}>REIMAGINE THE VIEW</Text>
          <Text style={styles.cameraTitle}>Hold history up to the present.</Text>
          <Text style={styles.cameraIntro}>
            Take a scene or selfie. Gemini will keep the viewpoint and people while rebuilding the surroundings for your chosen era.
          </Text>

          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>CURRENT CONTEXT</Text>
            <Text style={styles.contextTitle}>{selectedPlace?.title ?? 'Your current Sydney location'}</Text>
            <Text style={styles.contextDistance}>
              {selectedPlace ? `${formatDistance(selectedPlace.distanceMetres)} away` : 'Using the live map position'}
            </Text>
          </View>

          {places.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contextChoices}>
              {places.slice(0, 6).map((candidate) => {
                const selected = candidate.id === selectedPlace?.id;
                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => choosePlace(candidate)}
                    style={[styles.contextChoice, selected && styles.contextChoiceSelected]}
                  >
                    <Text numberOfLines={1} style={[styles.contextChoiceText, selected && styles.contextChoiceTextSelected]}>
                      {candidate.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Text style={styles.yearLabel}>Historical year</Text>
          <TextInput
            value={year}
            onChangeText={(value) => setYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="1890"
            maxLength={4}
            style={styles.yearInput}
          />

          {historicalImage ? (
            <View>
              <View style={styles.generatedLabelRow}>
                <Text style={styles.generatedLabel}>AI HISTORICAL INTERPRETATION · {year}</Text>
              </View>
              <Image source={{ uri: historicalImage }} style={styles.cameraPreview} resizeMode="cover" />
              <Text style={styles.interpretationNote}>
                This is an imaginative reconstruction, not an archival photograph. Details may be inaccurate.
              </Text>
            </View>
          ) : photo ? (
            <View>
              <Text style={styles.previewLabel}>YOUR MODERN VIEW</Text>
              <Image source={{ uri: photo.uri }} style={styles.cameraPreview} resizeMode="cover" />
            </View>
          ) : (
            <Pressable onPress={() => void takePhoto()} style={styles.cameraPlaceholder}>
              <Text style={styles.cameraGlyph}>◎</Text>
              <Text style={styles.cameraPlaceholderTitle}>Take a photo</Text>
              <Text style={styles.cameraPlaceholderText}>A street scene or selfie both work.</Text>
            </Pressable>
          )}

          {error ? <Text style={styles.cameraError}>{error}</Text> : null}

          {photo && !historicalImage ? (
            <Pressable
              disabled={generating}
              onPress={() => void generate()}
              style={({ pressed }) => [styles.generateButton, (pressed || generating) && styles.buttonDimmed]}
            >
              {generating ? <ActivityIndicator color="#fffaf0" /> : <Text style={styles.generateButtonText}>Reimagine this view in {year}</Text>}
            </Pressable>
          ) : null}

          {photo ? (
            <Pressable disabled={generating} onPress={() => void takePhoto()} style={styles.retakeButton}>
              <Text style={styles.retakeButtonText}>{historicalImage ? 'Take another photo' : 'Retake photo'}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.privacyNote}>
            {walkId
              ? 'This photo is sent to Gemini, then saved on this walk so you can reopen it later.'
              : 'This photo is sent to Gemini. Start a history walk first if you want the result saved with a walk.'}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function HistoryScreen({ discoveries, walks }: { discoveries: Discovery[]; walks: WalkSession[] }) {
  const [openWalkId, setOpenWalkId] = useState<string>();
  const totalDistance = walks.reduce((total, walk) => total + walk.distanceMetres, 0);
  const walkIds = new Set(walks.map((walk) => walk.id));
  const otherDiscoveries = discoveries.filter(
    (discovery) => !discovery.walkId || !walkIds.has(discovery.walkId),
  );
  const openWalk = walks.find((walk) => walk.id === openWalkId);

  if (openWalk) {
    return <WalkDetailScreen walk={openWalk} onClose={() => setOpenWalkId(undefined)} />;
  }

  return (
    <ScrollView style={styles.historyScreen} contentContainerStyle={styles.historyContent}>
      <Text style={styles.brandEyebrow}>YOUR TRIPBACK</Text>
      <Text style={styles.historyHeading}>Your walks</Text>
      <Text style={styles.historyIntro}>
        Open a walk to see the route, the places you found, and Time Camera images from that outing.
      </Text>

      <View style={styles.statsCard}>
        <Stat value={String(discoveries.length)} label="places" />
        <View style={styles.statRule} />
        <Stat value={String(walks.length)} label="walks" />
        <View style={styles.statRule} />
        <Stat value={formatWalkDistance(totalDistance)} label="travelled" />
      </View>

      {walks.length ? (
        <View style={styles.historyList}>
          {walks.map((walk) => (
            <WalkListCard
              key={walk.id}
              walk={walk}
              onPress={() => setOpenWalkId(walk.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.historyEmpty}>
          <Text style={styles.emptyMonogram}>TB</Text>
          <Text style={styles.emptyTitle}>No walks stored yet</Text>
          <Text style={styles.emptyText}>Start a history walk from Explore. Ending it saves the route and stories.</Text>
        </View>
      )}

      {otherDiscoveries.length ? (
        <View style={styles.historyList}>
          <Text style={styles.sectionEyebrow}>OTHER PLACES</Text>
          {otherDiscoveries.map((discovery) => (
            <DiscoveryHistoryCard key={discovery.id} discovery={discovery} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function WalkListCard({ walk, onPress }: { walk: WalkSession; onPress: () => void }) {
  const placeCount = walk.discoveryCount ?? 0;
  const imageCount = walk.generatedImageCount ?? 0;
  const bits = [
    formatWalkDistance(walk.distanceMetres),
    placeCount ? `${placeCount} place${placeCount === 1 ? '' : 's'}` : undefined,
    imageCount ? `${imageCount} Time Camera` : undefined,
    walk.endedAt ? undefined : 'In progress',
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open walk ${formatWalkRange(walk)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.walkListCard, pressed && styles.buttonDimmed]}
    >
      <View style={styles.walkListCopy}>
        <Text style={styles.historyDate}>{formatWalkRange(walk)}</Text>
        <Text style={styles.walkListTitle}>{walk.title ?? 'Sydney walk'}</Text>
        <Text style={styles.walkMeta}>{bits.join(' · ')}</Text>
        {walk.summary ? (
          <Text numberOfLines={3} style={styles.walkListSummary}>{walk.summary}</Text>
        ) : null}
      </View>
      <Text style={styles.walkListArrow}>›</Text>
    </Pressable>
  );
}

function WalkDetailScreen({ walk, onClose }: { walk: WalkSession; onClose: () => void }) {
  const mapRef = useRef<MapView>(null);
  const [detail, setDetail] = useState<WalkDetail>();
  const [loading, setLoading] = useState(true);
  const [openPortal, setOpenPortal] = useState<RealityPortal>();

  useEffect(() => {
    let cancelled = false;
    void tripBackEngine.getWalkDetail(walk.id).then((loaded) => {
      if (cancelled) return;
      setDetail(loaded ?? undefined);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [walk.id]);

  useEffect(() => {
    if (!detail) return;
    const coordinates = [
      ...detail.route,
      ...detail.discoveries.map((discovery) => discovery.coordinate),
      ...detail.generatedImages.map((image) => image.coordinate),
      ...detail.portals.map((portal) => portal.coordinate),
    ];
    if (coordinates.length === 0) return;
    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 48, right: 36, bottom: 36, left: 36 },
      animated: false,
    });
  }, [detail]);

  const route = detail?.route ?? [];
  const spots = detail?.discoveries ?? [];
  const generated = detail?.generatedImages ?? [];
  const walkPortals = detail?.portals ?? [];

  return (
    <ScrollView style={styles.historyScreen} contentContainerStyle={styles.walkDetailContent}>
      <Pressable onPress={onClose} hitSlop={12} style={styles.walkBack}>
        <Text style={styles.walkBackText}>‹ Walks</Text>
      </Pressable>
      <Text style={styles.historyDate}>{formatWalkRange(walk)}</Text>
      <Text style={styles.historyHeading}>{walk.title ?? 'Sydney walk'}</Text>
      <Text style={styles.walkMeta}>
        {formatWalkDistance(walk.distanceMetres)}
        {spots.length ? ` · ${spots.length} place${spots.length === 1 ? '' : 's'}` : ''}
        {generated.length ? ` · ${generated.length} Time Camera` : ''}
        {walkPortals.length ? ` · ${walkPortals.length} Alternate Reality` : ''}
      </Text>
      {walk.summary ? <Text style={styles.walkSummary}>{walk.summary}</Text> : null}

      <View style={styles.walkMapShell}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsCompass={false}
        >
          {route.length > 1 ? (
            <Polyline coordinates={route} strokeColor="#183c2b" strokeWidth={4} />
          ) : null}
          {spots.map((discovery) => (
            <Marker
              key={discovery.id}
              coordinate={discovery.coordinate}
              title={discovery.title}
              pinColor="#b34a32"
            />
          ))}
          {generated.map((image) => (
            <Marker
              key={image.id}
              coordinate={image.coordinate}
              title={image.placeTitle ? `${image.placeTitle} · ${image.year}` : `Time Camera · ${image.year}`}
              pinColor="#2c6b8b"
            />
          ))}
          {walkPortals.map((portal) => (
            <Marker
              key={portal.id}
              coordinate={portal.coordinate}
              title={portal.placeTitle ? `${portal.placeTitle} · ${portal.year}` : `Alternate Reality · ${portal.year}`}
              pinColor="#5a3d8c"
              onPress={() => setOpenPortal(portal)}
            />
          ))}
        </MapView>
      </View>

      {loading ? (
        <View style={styles.emptyCompact}>
          <ActivityIndicator color="#b34a32" />
          <Text style={styles.emptyText}>Loading this walk…</Text>
        </View>
      ) : null}

      {spots.length ? (
        <View style={styles.historyList}>
          <Text style={styles.sectionEyebrow}>PLACES YOU SAW</Text>
          {spots.map((discovery) => (
            <DiscoveryHistoryCard key={discovery.id} discovery={discovery} nested />
          ))}
        </View>
      ) : !loading ? (
        <View style={styles.emptyCompact}>
          <Text style={styles.emptyTitle}>No places saved on this walk</Text>
          <Text style={styles.emptyText}>Stories appear here when TripBack finds history along the route.</Text>
        </View>
      ) : null}

      {generated.length ? (
        <View style={styles.historyList}>
          <Text style={styles.sectionEyebrow}>TIME CAMERA</Text>
          {generated.map((image) => (
            <View key={image.id} style={styles.historyCard}>
              <Image
                source={{ uri: image.generatedImageDataUri }}
                accessibilityLabel={`AI historical interpretation of ${image.placeTitle ?? 'this view'} in ${image.year}`}
                style={styles.historyImage}
                resizeMode="cover"
              />
              <View style={styles.historyBody}>
                <Text style={styles.generatedLabel}>AI HISTORICAL INTERPRETATION · {image.year}</Text>
                <Text style={styles.nestedHistoryTitle}>
                  {image.placeTitle ?? 'This viewpoint'}
                </Text>
                {image.modernImageDataUri ? (
                  <View style={styles.modernThumbWrap}>
                    <Text style={styles.previewLabel}>YOUR MODERN VIEW</Text>
                    <Image
                      source={{ uri: image.modernImageDataUri }}
                      style={styles.modernThumb}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
                <Text style={styles.interpretationNote}>
                  This is an imaginative reconstruction, not an archival photograph.
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {walkPortals.length ? (
        <View style={styles.historyList}>
          <Text style={styles.sectionEyebrow}>ALTERNATE REALITY</Text>
          {walkPortals.map((portal) => (
            <Pressable key={portal.id} onPress={() => setOpenPortal(portal)} style={styles.historyCard}>
              <Image
                source={{ uri: portal.generatedImageDataUri }}
                accessibilityLabel={`AI historical panorama of ${portal.placeTitle ?? 'this view'} in ${portal.year}`}
                style={styles.historyImage}
                resizeMode="cover"
              />
              <View style={styles.historyBody}>
                <Text style={styles.generatedLabel}>AI HISTORICAL INTERPRETATION · {portal.year}</Text>
                <Text style={styles.nestedHistoryTitle}>
                  {portal.placeTitle ?? 'This viewpoint'}
                </Text>
                <Text style={styles.interpretationNote}>
                  Look around this 2D streetscape. This is an imaginative reconstruction, not an archival photograph.
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {openPortal ? (
        <PortalViewerModal
          visible
          portal={openPortal}
          onClose={() => setOpenPortal(undefined)}
        />
      ) : null}
    </ScrollView>
  );
}

function DiscoveryHistoryCard({
  discovery,
  nested = false,
}: {
  discovery: Discovery;
  nested?: boolean;
}) {
  return (
    <View style={nested ? styles.nestedHistoryCard : styles.historyCard}>
      <PlaceImage
        imageUrl={discovery.imageDataUri ?? discovery.imageUrl}
        title={discovery.title}
        style={nested ? styles.nestedHistoryImage : styles.historyImage}
      />
      <View style={styles.historyBody}>
        {!nested ? (
          <Text style={styles.historyDate}>{formatDate(discovery.discoveredAt)}</Text>
        ) : null}
        <Text style={nested ? styles.nestedHistoryTitle : styles.historyTitle}>
          {discovery.title}
        </Text>
        <Text style={styles.historyHook}>{discovery.hook}</Text>
        <Text style={styles.historyStory}>{discovery.story}</Text>
        <Text style={styles.sourceText}>
          {discovery.citations.length} verified source{discovery.citations.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}

function PlaceImage({ imageUrl, title, style }: { imageUrl?: string; title: string; style: object }) {
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} accessibilityLabel={title} style={style} resizeMode="cover" />;
  }
  return <View style={[style, styles.imageFallback]}><Text style={styles.imageFallbackMark}>TB</Text></View>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function TabButton({ icon, label, selected, onPress }: { icon: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} tab`} onPress={onPress} style={styles.tabButton}>
      <Text style={[styles.tabIcon, selected && styles.tabSelected]}>{icon}</Text>
      <Text style={[styles.tabLabel, selected && styles.tabSelected]}>{label}</Text>
    </Pressable>
  );
}

function suggestHistoricalYear(place?: StoryCandidate): string {
  const years = place?.summary.match(/\b(?:17|18|19|20)\d{2}\b/g) ?? [];
  const plausible = years
    .map(Number)
    .filter((year) => year >= 1700 && year <= new Date().getFullYear())
    .sort((a, b) => a - b);
  return String(plausible[0] ?? 1890);
}

function formatDistance(metres: number): string {
  if (metres < 1_000) return `${Math.max(1, Math.round(metres))} m`;
  return `${(metres / 1_000).toFixed(1)} km`;
}

function formatWalkDistance(metres: number): string {
  if (metres < 1_000) return `${Math.round(metres)} m`;
  return `${(metres / 1_000).toFixed(1)} km`;
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(isoDate));
}

function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(new Date(isoDate));
}

function formatWalkRange(walk: WalkSession): string {
  const day = formatDate(walk.startedAt);
  const start = formatTime(walk.startedAt);
  const end = walk.endedAt ? formatTime(walk.endedAt) : 'now';
  return `${day} · ${start} – ${end}`;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#f5f0e5' },
  screen: { flex: 1 },
  exploreContent: { paddingBottom: 108 },
  mapShell: { height: 430, overflow: 'hidden', backgroundColor: '#dbe1d8' },
  map: { ...StyleSheet.absoluteFill },
  mapHeader: { position: 'absolute', top: 58, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandEyebrow: { color: '#b34a32', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  brand: { color: '#17261e', fontSize: 34, fontWeight: '900', letterSpacing: -1.5 },
  livePill: { maxWidth: 170, backgroundColor: 'rgba(255,250,240,0.94)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7, shadowColor: '#17261e', shadowOpacity: 0.12, shadowRadius: 9, shadowOffset: { width: 0, height: 3 } },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2c8b57' },
  liveText: { color: '#304239', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  recenter: { position: 'absolute', right: 18, bottom: 22, width: 46, height: 46, borderRadius: 23, backgroundColor: '#fffaf0', alignItems: 'center', justifyContent: 'center', shadowColor: '#17261e', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  recenterIcon: { color: '#183c2b', fontSize: 25, fontWeight: '900' },
  sheet: { marginTop: -12, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#f5f0e5', paddingTop: 24, paddingBottom: 32 },
  sectionHeadingRow: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionEyebrow: { color: '#b34a32', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { color: '#17261e', fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  nearbyList: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 14 },
  nearbyCard: { width: 245, overflow: 'hidden', borderRadius: 20, backgroundColor: '#fffaf0', shadowColor: '#27382f', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  nearbyImage: { width: '100%', height: 132 },
  nearbyBody: { padding: 15, minHeight: 154 },
  distance: { color: '#b34a32', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  nearbyTitle: { color: '#17261e', fontSize: 19, lineHeight: 22, fontWeight: '900', marginTop: 5 },
  nearbySummary: { color: '#58655e', fontSize: 13, lineHeight: 18, marginTop: 7 },
  imageFallback: { backgroundColor: '#d9cfb9', alignItems: 'center', justifyContent: 'center' },
  imageFallbackMark: { color: '#a99473', fontSize: 30, fontWeight: '900', letterSpacing: -2 },
  emptyCompact: { margin: 20, padding: 20, borderRadius: 18, backgroundColor: '#e6decb' },
  emptyTitle: { color: '#17261e', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: '#647168', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 5 },
  discoveryBanner: { margin: 20, marginBottom: 4, backgroundColor: '#dfe6d9', borderRadius: 19, padding: 17 },
  discoveryLabel: { color: '#3f6f52', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  discoveryTitle: { color: '#17261e', fontSize: 20, fontWeight: '900', marginTop: 5 },
  discoveryHook: { color: '#485b50', fontSize: 14, lineHeight: 20, marginTop: 4 },
  portalBanner: { marginHorizontal: 20, marginTop: 12, marginBottom: 4, backgroundColor: '#d9e4ec', borderRadius: 19, padding: 17 },
  portalBannerLabel: { color: '#2c6b8b', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  timeCameraButton: { marginHorizontal: 20, marginTop: 18, minHeight: 76, borderRadius: 20, backgroundColor: '#b34a32', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 13 },
  alternateButton: { marginHorizontal: 20, marginTop: 10, minHeight: 76, borderRadius: 20, backgroundColor: '#3d4f73', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 13 },
  alternateIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: 'rgba(255,250,240,0.18)', alignItems: 'center', justifyContent: 'center' },
  alternateEyebrow: { color: '#c5d0e8', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  alternateTitle: { color: '#fffaf0', fontSize: 17, fontWeight: '900', marginTop: 2 },
  alternateArrow: { color: '#fffaf0', fontSize: 31, fontWeight: '300' },
  timeCameraIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: 'rgba(255,250,240,0.18)', alignItems: 'center', justifyContent: 'center' },
  timeCameraIconText: { color: '#fffaf0', fontSize: 25, fontWeight: '900' },
  timeCameraCopy: { flex: 1 },
  timeCameraEyebrow: { color: '#f3c4b5', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  timeCameraTitle: { color: '#fffaf0', fontSize: 17, fontWeight: '900', marginTop: 2 },
  timeCameraArrow: { color: '#fffaf0', fontSize: 31, fontWeight: '300' },
  walkRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 18 },
  walkButton: { flex: 1, minHeight: 58, borderRadius: 18, backgroundColor: '#183c2b', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 15 },
  walkButtonText: { color: '#fffaf0', fontSize: 15, fontWeight: '900' },
  demoButton: { minWidth: 82, minHeight: 58, borderRadius: 18, backgroundColor: '#dfd5bf', alignItems: 'center', justifyContent: 'center' },
  demoButtonText: { color: '#27382f', fontSize: 14, fontWeight: '900' },
  buttonDimmed: { opacity: 0.5 },
  cameraModal: { flex: 1, backgroundColor: '#f5f0e5' },
  cameraModalHeader: { height: 60, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d4cbb8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cameraClose: { color: '#b34a32', fontSize: 15, fontWeight: '800' },
  cameraHeaderTitle: { color: '#17261e', fontSize: 16, fontWeight: '900' },
  cameraHeaderSpacer: { width: 42 },
  cameraContent: { padding: 22, paddingBottom: 50 },
  cameraEyebrow: { color: '#b34a32', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  cameraTitle: { color: '#17261e', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, marginTop: 7 },
  cameraIntro: { color: '#58655e', fontSize: 15, lineHeight: 22, marginTop: 10 },
  contextCard: { backgroundColor: '#e4dcc8', borderRadius: 18, padding: 16, marginTop: 20 },
  contextLabel: { color: '#8a7457', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  contextTitle: { color: '#17261e', fontSize: 18, fontWeight: '900', marginTop: 4 },
  contextDistance: { color: '#69746d', fontSize: 12, fontWeight: '700', marginTop: 3 },
  contextChoices: { paddingTop: 10, gap: 8 },
  contextChoice: { maxWidth: 190, height: 36, borderRadius: 18, backgroundColor: '#e5dcc8', borderWidth: 1, borderColor: '#cbbda3', justifyContent: 'center', paddingHorizontal: 13 },
  contextChoiceSelected: { backgroundColor: '#183c2b', borderColor: '#183c2b' },
  contextChoiceText: { color: '#58655e', fontSize: 12, fontWeight: '800' },
  contextChoiceTextSelected: { color: '#fffaf0' },
  yearLabel: { color: '#34433a', fontSize: 13, fontWeight: '800', marginTop: 19, marginBottom: 7 },
  yearInput: { height: 52, borderRadius: 15, backgroundColor: '#fffaf0', borderWidth: 1, borderColor: '#cabda4', color: '#17261e', fontSize: 20, fontWeight: '900', paddingHorizontal: 16 },
  cameraPlaceholder: { height: 330, borderRadius: 22, backgroundColor: '#dcd3c0', borderWidth: 1, borderColor: '#c5b89f', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  cameraGlyph: { color: '#b34a32', fontSize: 48, fontWeight: '700' },
  cameraPlaceholderTitle: { color: '#17261e', fontSize: 20, fontWeight: '900', marginTop: 8 },
  cameraPlaceholderText: { color: '#69746d', fontSize: 13, marginTop: 5 },
  previewLabel: { color: '#8a7457', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginTop: 20, marginBottom: 7 },
  generatedLabelRow: { marginTop: 20, marginBottom: 7 },
  generatedLabel: { color: '#b34a32', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  cameraPreview: { width: '100%', height: 420, borderRadius: 22, backgroundColor: '#dcd3c0' },
  interpretationNote: { color: '#69746d', fontSize: 12, lineHeight: 17, marginTop: 9 },
  cameraError: { color: '#a12e22', fontSize: 13, lineHeight: 18, marginTop: 12 },
  generateButton: { minHeight: 58, borderRadius: 18, backgroundColor: '#183c2b', alignItems: 'center', justifyContent: 'center', marginTop: 17, paddingHorizontal: 14 },
  generateButtonText: { color: '#fffaf0', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  retakeButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  retakeButtonText: { color: '#b34a32', fontSize: 14, fontWeight: '800' },
  privacyNote: { color: '#7d867f', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 18, paddingHorizontal: 8 },
  historyScreen: { flex: 1, backgroundColor: '#f5f0e5' },
  historyContent: { paddingTop: 66, paddingHorizontal: 20, paddingBottom: 118 },
  walkDetailContent: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 118 },
  walkBack: { alignSelf: 'flex-start', marginBottom: 10 },
  walkBackText: { color: '#b34a32', fontSize: 16, fontWeight: '800' },
  walkMapShell: { height: 280, overflow: 'hidden', borderRadius: 22, backgroundColor: '#dbe1d8', marginTop: 18 },
  walkListCard: { borderRadius: 22, backgroundColor: '#fffaf0', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  walkListCopy: { flex: 1 },
  walkListTitle: { color: '#17261e', fontSize: 22, fontWeight: '900', marginTop: 4 },
  walkListSummary: { color: '#3f4d46', fontSize: 14, lineHeight: 20, marginTop: 8 },
  walkListArrow: { color: '#b34a32', fontSize: 32, fontWeight: '300' },
  modernThumbWrap: { marginTop: 14 },
  modernThumb: { width: '100%', height: 160, borderRadius: 16, backgroundColor: '#dcd3c0', marginTop: 7 },
  historyHeading: { color: '#17261e', fontSize: 38, lineHeight: 42, fontWeight: '900', letterSpacing: -1.5, marginTop: 6 },
  historyIntro: { color: '#58655e', fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 320 },
  statsCard: { flexDirection: 'row', backgroundColor: '#e4dcc8', borderRadius: 20, marginTop: 24, paddingVertical: 17, alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#17261e', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#6b766f', fontSize: 11, fontWeight: '700', marginTop: 2 },
  statRule: { width: 1, height: 32, backgroundColor: '#c7bca4' },
  historyList: { gap: 16, marginTop: 24 },
  historyCard: { overflow: 'hidden', borderRadius: 22, backgroundColor: '#fffaf0' },
  historyImage: { width: '100%', height: 180 },
  historyBody: { padding: 18 },
  historyDate: { color: '#b34a32', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  historyTitle: { color: '#17261e', fontSize: 24, fontWeight: '900', marginTop: 6 },
  historyHook: { color: '#4e5f55', fontSize: 15, lineHeight: 21, marginTop: 6 },
  historyStory: { color: '#3f4d46', fontSize: 15, lineHeight: 23, marginTop: 10 },
  walkCard: { borderRadius: 22, backgroundColor: '#e8e0cd', padding: 16, gap: 14 },
  walkMeta: { color: '#6b766f', fontSize: 12, fontWeight: '800', marginTop: 4 },
  walkSummary: { color: '#3f4d46', fontSize: 15, lineHeight: 23, marginTop: 8 },
  nestedHistoryCard: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#fffaf0' },
  nestedHistoryImage: { width: '100%', height: 148 },
  nestedHistoryTitle: { color: '#17261e', fontSize: 20, fontWeight: '900' },
  sourceText: { color: '#879088', fontSize: 11, fontWeight: '700', marginTop: 13 },
  historyEmpty: { alignItems: 'center', marginTop: 48, paddingHorizontal: 28 },
  emptyMonogram: { color: '#b7aa8d', fontSize: 38, fontWeight: '900', letterSpacing: -3, marginBottom: 12 },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 88, paddingBottom: 18, flexDirection: 'row', backgroundColor: 'rgba(255,250,240,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d4cbb8' },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  tabIcon: { color: '#8a948e', fontSize: 25, fontWeight: '700' },
  tabLabel: { color: '#8a948e', fontSize: 11, fontWeight: '800' },
  tabSelected: { color: '#b34a32' },
});
