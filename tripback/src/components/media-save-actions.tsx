import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';
import { saveToCameraRoll } from '@/services/media/saveToCameraRoll';

export function MediaSaveActions({
  modernUri,
  historicalUri,
  year,
}: {
  modernUri?: string;
  historicalUri?: string;
  year: string;
}) {
  const [saving, setSaving] = useState<'modern' | 'historical'>();

  const save = async (which: 'modern' | 'historical', uri?: string) => {
    if (!uri || saving) return;
    setSaving(which);
    try {
      await saveToCameraRoll(uri, 'photo');
      Alert.alert('Saved to Photos', which === 'modern'
        ? 'Your original photo is now in your camera roll.'
        : `Your ${year} reconstruction is now in your camera roll.`);
    } catch (error) {
      Alert.alert('Couldn’t save photo', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(undefined);
    }
  };

  if (!modernUri && !historicalUri) return null;

  return (
    <View style={styles.row}>
      {modernUri ? (
        <Pressable
          accessibilityRole="button"
          disabled={Boolean(saving)}
          onPress={() => void save('modern', modernUri)}
          style={[styles.button, styles.modernButton, saving && styles.busy]}
        >
          <Text style={styles.modernText}>
            {saving === 'modern' ? 'Saving…' : 'Save original ↓'}
          </Text>
        </Pressable>
      ) : null}
      {historicalUri ? (
        <Pressable
          accessibilityRole="button"
          disabled={Boolean(saving)}
          onPress={() => void save('historical', historicalUri)}
          style={[styles.button, styles.historicalButton, saving && styles.busy]}
        >
          <Text style={styles.historicalText}>
            {saving === 'historical' ? 'Saving…' : `Save ${year} ↓`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  button: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modernButton: { backgroundColor: Palette.cloud },
  historicalButton: { backgroundColor: Palette.ink },
  modernText: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Palette.ink },
  historicalText: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Palette.lime },
  busy: { opacity: 0.65 },
});

