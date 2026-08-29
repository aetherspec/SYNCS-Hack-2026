import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { useRouter } from '@/nav';
import { requestNotificationPermission } from '@/services/notifications/NotificationService';

import { Motion } from '@/components/motion';

import { useAppState } from '@/components/app-state';
import { Fonts, Palette } from '@/constants/theme';

const STEP_BG = { 1: Palette.lime, 2: Palette.lavender, 3: Palette.blush } as const;

const PERMS = [
  {
    key: 'location',
    icon: '📍',
    tint: Palette.lavender,
    name: 'Location',
    desc: 'Spots portals as you walk past them',
  },
  {
    key: 'notifications',
    icon: '🔔',
    tint: Palette.blush,
    name: 'Notifications',
    desc: 'A nudge when history is 50 m away',
  },
  {
    key: 'camera',
    icon: '📷',
    tint: Palette.sky,
    name: 'Camera',
    desc: 'Take a photo to reconstruct the year',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { perms, togglePerm } = useAppState();

  const finish = () => router.replace('/map');
  const next = () => (step < 3 ? setStep((step + 1) as 2 | 3) : finish());

  const allow = async (key: string) => {
    if (perms[key]) {
      togglePerm(key);
      return;
    }
    if (key === 'location') {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.granted) {
        await Location.requestBackgroundPermissionsAsync();
        if (!perms.location) togglePerm('location');
      }
      return;
    }
    if (key === 'notifications') {
      const granted = await requestNotificationPermission();
      if (granted && !perms.notifications) togglePerm('notifications');
      return;
    }
    if (key === 'camera') {
      const camera = await ImagePicker.requestCameraPermissionsAsync();
      if (camera.granted && !perms.camera) togglePerm('camera');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: STEP_BG[step] }]}>
      <View style={styles.skipRow}>
        <Pressable onPress={finish} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {step === 1 && (
        <Motion key="s1" kind="rise" style={styles.stepBody}>
          <Text style={styles.logo}>TripBack</Text>
          <Text style={styles.h1}>Sydney remembers. Let it show you 👀</Text>
          <Text style={styles.lead}>
            Point your camera at a building and swipe back through time. Real
            archival photos, stuck to the real world.
          </Text>
        </Motion>
      )}

      {step === 2 && (
        <Motion key="s2" kind="rise" style={[styles.stepBody, { gap: 22 }]}>
          <View style={styles.preview}>
            <View style={styles.previewPast} />
            <View style={styles.previewNow} />
            <View style={[styles.previewBadge, styles.previewBadgePast]}>
              <Text style={styles.previewBadgePastText}>1897</Text>
            </View>
            <View style={[styles.previewBadge, styles.previewBadgeNow]}>
              <Text style={styles.previewBadgeNowText}>now</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewKnob}>
              <Text style={styles.previewKnobText}>‹ ›</Text>
            </View>
          </View>
          <Text style={styles.h2}>Swipe between now and then</Text>
          <Text style={styles.lead}>
            Drag the handle to peel today away — on screen here, or locked onto
            the actual facade in AR.
          </Text>
        </Motion>
      )}

      {step === 3 && (
        <Motion key="s3" kind="rise" style={[styles.stepBody, { gap: 12 }]}>
          <Text style={styles.h3}>Three quick permissions</Text>
          <Text style={[styles.lead, { fontSize: 15, marginBottom: 6 }]}>
            And the city starts talking. Everything you collect stays on your
            phone.
          </Text>
          {PERMS.map(pm => {
            const on = !!perms[pm.key];
            return (
              <View key={pm.key} style={styles.permCard}>
                <View style={[styles.permIcon, { backgroundColor: pm.tint }]}>
                  <Text style={{ fontSize: 19 }}>{pm.icon}</Text>
                </View>
                <View style={styles.permText}>
                  <Text style={styles.permName}>{pm.name}</Text>
                  <Text style={styles.permDesc}>{pm.desc}</Text>
                </View>
                <Pressable
                  onPress={() => void allow(pm.key)}
                  style={[
                    styles.permBtn,
                    { backgroundColor: on ? Palette.ink : Palette.purple },
                  ]}
                >
                  <Text
                    style={[
                      styles.permBtnText,
                      { color: on ? Palette.lime : Palette.white },
                    ]}
                  >
                    {on ? 'Allowed ✓' : 'Allow'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </Motion>
      )}

      <Motion kind="rise" delay={120} style={styles.footer}>
        <View style={styles.dots}>
          {[1, 2, 3].map(n => (
            <View
              key={n}
              style={[
                styles.dot,
                { backgroundColor: n === step ? Palette.ink : 'rgba(16,16,20,0.25)' },
              ]}
            />
          ))}
        </View>
        <Pressable onPress={next} style={styles.cta}>
          <Text style={styles.ctaText}>{step === 3 ? 'Start walking' : 'Next'}</Text>
        </Pressable>
      </Motion>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  skipRow: { alignItems: 'flex-end' },
  skip: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Palette.ink },
  stepBody: { flex: 1, justifyContent: 'center', gap: 16 },
  logo: { fontFamily: Fonts.display, fontSize: 20, color: Palette.purple },
  h1: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 46,
    color: Palette.ink,
  },
  h2: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 37,
    color: Palette.ink,
  },
  h3: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 33,
    color: Palette.ink,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.body,
    maxWidth: 310,
  },
  preview: {
    width: '100%',
    height: 190,
    borderRadius: 28,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  previewPast: { width: '55%', backgroundColor: '#FFD84D' },
  previewNow: { flex: 1, backgroundColor: '#B9A6FF' },
  previewBadge: {
    position: 'absolute',
    top: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  previewBadgePast: { left: 14, backgroundColor: Palette.ink },
  previewBadgePastText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Palette.lime },
  previewBadgeNow: { right: 14, backgroundColor: Palette.white },
  previewBadgeNowText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Palette.ink },
  previewDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '55%',
    width: 3,
    marginLeft: -1.5,
    backgroundColor: Palette.white,
  },
  previewKnob: {
    position: 'absolute',
    top: '50%',
    left: '55%',
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(16,16,20,0.2)',
  },
  previewKnobText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Palette.ink },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Palette.white,
    borderRadius: 22,
    padding: 13,
    boxShadow: '0 4px 14px rgba(16,16,20,0.08)',
  },
  permIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permText: { flex: 1, gap: 1 },
  permName: { fontFamily: Fonts.displayBold, fontSize: 16, color: Palette.ink },
  permDesc: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
    color: Palette.body,
  },
  permBtn: {
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 999,
  },
  permBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  footer: { gap: 20 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cta: {
    height: 58,
    borderRadius: 999,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Palette.lime },
});
