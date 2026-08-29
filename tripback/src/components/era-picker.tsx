import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';

const QUICK_YEARS = ['1850', '1900', '1920', '1950', '1980'];

export function EraPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (year: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(/^\d{4}$/.test(value) ? value : '');
  const [error, setError] = useState('');
  const displayedOptions = options.includes(value) ? options : [...options, value];

  const choose = (year: string) => {
    onChange(year);
    setDraft(year);
    setError('');
    setOpen(false);
  };

  const apply = () => {
    const year = Number(draft);
    const latest = new Date().getFullYear() - 5;
    if (!/^\d{4}$/.test(draft) || year < 1700 || year > latest) {
      setError(`Choose a year from 1700 to ${latest}.`);
      return;
    }
    choose(draft);
  };

  return (
    <>
      <View style={styles.row}>
        {displayedOptions.map((year) => (
          <Pressable
            key={year}
            accessibilityRole="button"
            onPress={() => choose(year)}
            style={[styles.chip, year === value && styles.chipActive]}
          >
            <Text style={[styles.chipText, year === value && styles.chipTextActive]}>
              {year}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDraft(/^\d{4}$/.test(value) ? value : '');
            setError('');
            setOpen(true);
          }}
          style={[styles.chip, styles.customChip]}
        >
          <Text style={styles.customText}>+ Choose year</Text>
        </Pressable>
      </View>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>YOUR TIME PORTAL</Text>
            <Text style={styles.title}>Which year should we visit?</Text>
            <Text style={styles.body}>
              Pick any year, or use one of the historically significant suggestions.
            </Text>
            <TextInput
              autoFocus
              keyboardType="number-pad"
              maxLength={4}
              value={draft}
              onChangeText={(text) => {
                setDraft(text.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="e.g. 1928"
              placeholderTextColor={Palette.muted}
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.quickRow}>
              {QUICK_YEARS.map((year) => (
                <Pressable key={year} onPress={() => setDraft(year)} style={styles.quickChip}>
                  <Text style={styles.quickText}>{year}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={apply} style={styles.apply}>
              <Text style={styles.applyText}>Use {draft || 'this year'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Palette.cloud,
  },
  chipActive: { backgroundColor: Palette.ink },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#55555F' },
  chipTextActive: { color: Palette.lime },
  customChip: { borderWidth: 1.5, borderColor: Palette.purple, backgroundColor: Palette.white },
  customText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.purple },
  scrim: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(16,16,20,0.66)',
  },
  card: { padding: 22, gap: 12, borderRadius: 28, backgroundColor: Palette.white },
  eyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Palette.purple,
  },
  title: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 27, color: Palette.ink },
  body: { fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 19, color: Palette.body },
  input: {
    height: 64,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: Palette.cloud,
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Palette.ink,
  },
  error: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#C83E52' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  quickChip: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999, backgroundColor: Palette.lavender },
  quickText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Palette.purple },
  apply: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: Palette.lime },
  applyText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Palette.ink },
  cancel: { alignItems: 'center', paddingVertical: 7 },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.muted },
});
