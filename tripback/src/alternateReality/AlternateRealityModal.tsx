import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { tripBackEngine } from '../core/TripBackEngine';
import type { Coordinate, RealityPortal, StoryCandidate } from '../domain/types';
import { createHistoricalPanorama } from '../services/images/HistoricalImageClient';

type CapturedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
};

export function AlternateRealityModal({
  visible,
  coordinate,
  places,
  walkId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  coordinate: Coordinate;
  places: StoryCandidate[];
  walkId?: string;
  onClose: () => void;
  onCreated: (portal: RealityPortal) => void;
}) {
  const [year, setYear] = useState('1890');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [photo, setPhoto] = useState<CapturedPhoto>();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const headingRef = useRef(0);
  const selectedPlace =
    places.find((candidate) => candidate.id === selectedPlaceId) ?? places[0];

  useEffect(() => {
    if (!visible) return;
    setSelectedPlaceId(places[0]?.id);
    setYear(suggestHistoricalYear(places[0]));
    setPhoto(undefined);
    setGenerating(false);
    setError(undefined);
    headingRef.current = 0;
    let subscription: Location.LocationSubscription | undefined;
    void Location.watchHeadingAsync((next) => {
      const value = next.trueHeading >= 0 ? next.trueHeading : next.magHeading;
      if (Number.isFinite(value)) headingRef.current = value;
    }).then((sub) => {
      subscription = sub;
    });
    return () => subscription?.remove();
  }, [places, visible]);

  async function takePhoto() {
    setError(undefined);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is required to pin this view.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
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
      const heading = headingRef.current;
      const result = await createHistoricalPanorama({
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        coordinate,
        place: selectedPlace,
        year,
      });
      const portal = await tripBackEngine.savePortal({
        walkId,
        placeTitle: selectedPlace?.title,
        year,
        coordinate,
        originHeading: heading,
        modernBase64: photo.base64,
        modernMimeType: photo.mimeType,
        generatedBase64: result.base64,
        generatedMimeType: result.mimeType,
      });
      onCreated(portal);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'The historical panorama could not be created.',
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Alternate Reality</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>PIN THIS STREET</Text>
          <Text style={styles.title}>Look around in another year.</Text>
          <Text style={styles.intro}>
            Take a photo here. Gemini builds a wide historical streetscape and pins it to this spot. Then turn or take a few steps to look around.
          </Text>

          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>PINNED AT</Text>
            <Text style={styles.contextTitle}>{selectedPlace?.title ?? 'Your current Sydney location'}</Text>
            <Text style={styles.contextDistance}>
              {selectedPlace ? `${formatDistance(selectedPlace.distanceMetres)} away` : 'Using the live map position'}
            </Text>
          </View>

          {places.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
              {places.slice(0, 6).map((candidate) => {
                const selected = candidate.id === selectedPlace?.id;
                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => {
                      setSelectedPlaceId(candidate.id);
                      setYear(suggestHistoricalYear(candidate));
                    }}
                    style={[styles.choice, selected && styles.choiceSelected]}
                  >
                    <Text numberOfLines={1} style={[styles.choiceText, selected && styles.choiceTextSelected]}>
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
            maxLength={4}
            style={styles.yearInput}
          />

          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <Pressable onPress={() => void takePhoto()} style={styles.placeholder}>
              <Text style={styles.glyph}>◎</Text>
              <Text style={styles.placeholderTitle}>Photograph this spot</Text>
              <Text style={styles.placeholderText}>Face the street you want pinned.</Text>
            </Pressable>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {photo ? (
            <Pressable
              disabled={generating}
              onPress={() => void generate()}
              style={({ pressed }) => [styles.generate, (pressed || generating) && styles.dimmed]}
            >
              {generating ? (
                <ActivityIndicator color="#fffaf0" />
              ) : (
                <Text style={styles.generateText}>Generate {year} panorama</Text>
              )}
            </Pressable>
          ) : null}

          <Text style={styles.note}>
            {walkId
              ? 'Saved to this walk and this map pin. AI historical interpretation, not an archive photo.'
              : 'Saved as a map pin on this phone. Start a walk first if you want it attached to that outing.'}
          </Text>
        </ScrollView>
      </View>
    </Modal>
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

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#f5f0e5' },
  header: {
    height: 60,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d4cbb8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { color: '#b34a32', fontSize: 15, fontWeight: '800' },
  headerTitle: { color: '#17261e', fontSize: 16, fontWeight: '900' },
  headerSpacer: { width: 42 },
  content: { padding: 22, paddingBottom: 50 },
  eyebrow: { color: '#b34a32', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#17261e', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, marginTop: 7 },
  intro: { color: '#58655e', fontSize: 15, lineHeight: 22, marginTop: 10 },
  contextCard: { backgroundColor: '#e4dcc8', borderRadius: 18, padding: 16, marginTop: 20 },
  contextLabel: { color: '#8a7457', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  contextTitle: { color: '#17261e', fontSize: 18, fontWeight: '900', marginTop: 4 },
  contextDistance: { color: '#69746d', fontSize: 12, fontWeight: '700', marginTop: 3 },
  choices: { paddingTop: 10, gap: 8 },
  choice: {
    maxWidth: 190,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5dcc8',
    borderWidth: 1,
    borderColor: '#cbbda3',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  choiceSelected: { backgroundColor: '#183c2b', borderColor: '#183c2b' },
  choiceText: { color: '#58655e', fontSize: 12, fontWeight: '800' },
  choiceTextSelected: { color: '#fffaf0' },
  yearLabel: { color: '#34433a', fontSize: 13, fontWeight: '800', marginTop: 19, marginBottom: 7 },
  yearInput: {
    height: 52,
    borderRadius: 15,
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#cabda4',
    color: '#17261e',
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 16,
  },
  preview: { width: '100%', height: 280, borderRadius: 22, backgroundColor: '#dcd3c0', marginTop: 20 },
  placeholder: {
    height: 280,
    borderRadius: 22,
    backgroundColor: '#dcd3c0',
    borderWidth: 1,
    borderColor: '#c5b89f',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  glyph: { color: '#b34a32', fontSize: 48, fontWeight: '700' },
  placeholderTitle: { color: '#17261e', fontSize: 20, fontWeight: '900', marginTop: 8 },
  placeholderText: { color: '#69746d', fontSize: 13, marginTop: 5 },
  error: { color: '#a12e22', fontSize: 13, lineHeight: 18, marginTop: 12 },
  generate: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#183c2b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
    paddingHorizontal: 14,
  },
  generateText: { color: '#fffaf0', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  dimmed: { opacity: 0.5 },
  note: { color: '#7d867f', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 18, paddingHorizontal: 8 },
});
