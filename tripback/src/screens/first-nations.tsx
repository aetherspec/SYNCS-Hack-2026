import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { useAppState, metersFromUser } from '@/components/app-state';
import {
  FirstNationsMap,
  type FirstNationsMapHandle,
} from '@/components/first-nations-map';
import { Motion } from '@/components/motion';
import { TabBar } from '@/components/tab-bar';
import {
  FIRST_NATIONS_PLACES,
  type FirstNationsPlace,
} from '@/constants/first-nations';
import { Fonts, Palette } from '@/constants/theme';

function distanceLabel(metres: number) {
  if (metres < 1_000) return `${Math.max(10, Math.round(metres / 10) * 10)} m away`;
  return `${(metres / 1_000).toFixed(1)} km away`;
}

export default function FirstNationsScreen() {
  const { location } = useAppState();
  const map = useRef<FirstNationsMapHandle>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [eventIndex, setEventIndex] = useState(0);

  const selected = FIRST_NATIONS_PLACES.find((place) => place.id === selectedId);
  const sortedPlaces = useMemo(
    () =>
      [...FIRST_NATIONS_PLACES].sort(
        (a, b) => metersFromUser(location, a.geo) - metersFromUser(location, b.geo),
      ),
    [location],
  );

  const select = (place: FirstNationsPlace) => {
    setSelectedId(place.id);
    setEventIndex(0);
    map.current?.flyTo(place.geo);
  };

  return (
    <View style={styles.root}>
      <FirstNationsMap
        ref={map}
        selectedId={selectedId}
        onSelect={(id) => {
          const place = FIRST_NATIONS_PLACES.find((item) => item.id === id);
          if (place) select(place);
        }}
      />

      <Motion kind="drop" style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>FIRST NATIONS</Text>
            <Text style={styles.title}>Stories on Gadigal Country</Text>
          </View>
          <View style={styles.publicBadge}>
            <Text style={styles.publicBadgeText}>PUBLIC</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Community, culture and change—past and present. Sensitive cultural sites are
          not mapped.
        </Text>
      </Motion>

      <View style={styles.controls}>
        <Pressable style={styles.ctrlBtn} onPress={() => map.current?.zoomIn()}>
          <Text style={styles.ctrlText}>+</Text>
        </Pressable>
        <Pressable style={styles.ctrlBtn} onPress={() => map.current?.zoomOut()}>
          <Text style={styles.ctrlText}>−</Text>
        </Pressable>
        <Pressable style={[styles.ctrlBtn, styles.recenter]} onPress={() => map.current?.recenter()}>
          <Text style={styles.ctrlText}>🧭</Text>
        </Pressable>
      </View>

      {selected ? (
        <Motion kind="rise" style={styles.detailWrap}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeading}>
              <View style={styles.detailTitleWrap}>
                <Text style={styles.category}>{selected.category} · {selected.area}</Text>
                <Text style={styles.placeTitle}>{selected.name}</Text>
              </View>
              <Pressable
                accessibilityLabel="Close place details"
                style={styles.closeButton}
                onPress={() => setSelectedId(undefined)}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.summary} numberOfLines={3}>{selected.summary}</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventTabs}
            >
              {selected.events.map((event, index) => (
                <Pressable
                  key={`${selected.id}-${event.year}`}
                  onPress={() => setEventIndex(index)}
                  style={[styles.eventTab, index === eventIndex && styles.eventTabActive]}
                >
                  <Text style={[styles.eventYear, index === eventIndex && styles.eventYearActive]}>
                    {event.year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {selected.events[eventIndex] && (
              <View style={styles.eventCopy}>
                <Text style={styles.eventTitle}>{selected.events[eventIndex].title}</Text>
                <Text style={styles.eventDetail} numberOfLines={4}>
                  {selected.events[eventIndex].detail}
                </Text>
              </View>
            )}

            <Pressable
              style={styles.sourceButton}
              onPress={() => void WebBrowser.openBrowserAsync(selected.sourceUrl, {
                controlsColor: '#B54A2D',
                dismissButtonStyle: 'close',
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
              })}
            >
              <Text style={styles.sourceText}>Read the public history</Text>
              <Text style={styles.sourceArrow}>↗</Text>
            </Pressable>
          </View>
        </Motion>
      ) : (
        <Motion kind="rise" delay={100} style={styles.rail}>
          <Text style={styles.railLabel}>PLACES NEAR YOU</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
          >
            {sortedPlaces.map((place) => (
              <Pressable key={place.id} style={styles.placeCard} onPress={() => select(place)}>
                <View style={styles.yearBadge}>
                  <Text style={styles.yearBadgeText}>{place.events[0]?.year}</Text>
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardDistance}>{distanceLabel(metersFromUser(location, place.geo))}</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{place.name}</Text>
                  <Text style={styles.cardMeta}>{place.category} · {place.area}</Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Motion>
      )}

      <TabBar active="First Nations" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6EBDD' },
  header: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: Palette.ink,
    boxShadow: '0 10px 28px rgba(16,16,20,0.26)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headingCopy: { flex: 1 },
  eyebrow: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: '#F08B5D' },
  title: { fontFamily: Fonts.displayBold, fontSize: 21, lineHeight: 25, color: Palette.white },
  subtitle: { marginTop: 5, fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 15, color: '#D5D2D0' },
  publicBadge: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: '#B54A2D' },
  publicBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 9, letterSpacing: 0.8, color: Palette.white },
  controls: { position: 'absolute', right: 16, top: 170, gap: 8 },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
    boxShadow: '0 6px 16px rgba(16,16,20,0.18)',
  },
  recenter: { backgroundColor: '#B54A2D' },
  ctrlText: { fontFamily: Fonts.display, fontSize: 19, color: Palette.ink },
  rail: { position: 'absolute', left: 0, right: 0, bottom: 102 },
  railLabel: {
    marginLeft: 22,
    marginBottom: 7,
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Palette.ink,
    textShadowColor: Palette.white,
    textShadowRadius: 4,
  },
  railContent: { paddingHorizontal: 16, gap: 10 },
  placeCard: {
    width: 308,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 25,
    backgroundColor: Palette.white,
    boxShadow: '0 12px 30px rgba(16,16,20,0.22)',
  },
  yearBadge: {
    width: 67,
    height: 67,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4D2C2',
  },
  yearBadgeText: { fontFamily: Fonts.display, fontSize: 14, color: '#96391F' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardDistance: { fontFamily: Fonts.bodyBold, fontSize: 10.5, color: '#B54A2D' },
  cardTitle: { fontFamily: Fonts.displayBold, fontSize: 16, lineHeight: 20, color: Palette.ink },
  cardMeta: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Palette.muted },
  cardArrow: { fontFamily: Fonts.display, fontSize: 23, color: '#B54A2D' },
  detailWrap: { position: 'absolute', left: 16, right: 16, bottom: 101 },
  detailCard: {
    padding: 17,
    borderRadius: 27,
    backgroundColor: Palette.white,
    boxShadow: '0 14px 36px rgba(16,16,20,0.25)',
  },
  detailHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailTitleWrap: { flex: 1 },
  category: { fontFamily: Fonts.bodyBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.7, color: '#B54A2D' },
  placeTitle: { fontFamily: Fonts.displayBold, fontSize: 21, lineHeight: 25, color: Palette.ink },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.cloud },
  closeText: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 24, color: Palette.ink },
  summary: { marginTop: 7, fontFamily: Fonts.body, fontSize: 12, lineHeight: 16, color: Palette.body },
  eventTabs: { gap: 7, marginTop: 11 },
  eventTab: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999, backgroundColor: '#F4D2C2' },
  eventTabActive: { backgroundColor: Palette.ink },
  eventYear: { fontFamily: Fonts.displayBold, fontSize: 13, color: '#96391F' },
  eventYearActive: { color: Palette.lime },
  eventCopy: { marginTop: 9, padding: 11, borderRadius: 16, backgroundColor: '#FFF6EF' },
  eventTitle: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Palette.ink },
  eventDetail: { marginTop: 2, fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 15, color: Palette.body },
  sourceButton: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: Palette.lime },
  sourceText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Palette.ink },
  sourceArrow: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Palette.ink },
});
