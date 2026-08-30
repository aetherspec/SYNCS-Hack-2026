import { useState } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppState } from '@/components/app-state';
import { Fonts, Palette } from '@/constants/theme';
import { saveToCameraRoll } from '@/services/media/saveToCameraRoll';

export function HistoricalVideoAction({
  siteId,
  portalId,
  title,
  year,
  videoUri,
}: {
  siteId: string;
  portalId: string;
  title: string;
  year: string;
  videoUri?: string;
}) {
  const { videoJobs, startPortalVideo, openPortalVideo } = useAppState();
  const job = videoJobs[portalId];
  const readyUri = videoUri ?? job?.videoUri;

  const label = readyUri
    ? 'Watch this scene come alive ▶'
    : job?.status === 'generating'
      ? 'Bringing this scene to life…'
      : job?.status === 'error'
        ? 'Try creating the video again ↻'
        : 'Bring this scene to life 🎞';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={job?.status === 'generating'}
      onPress={() => {
        if (readyUri) void openPortalVideo(portalId, title);
        else startPortalVideo(siteId, portalId, title, year);
      }}
      style={[styles.action, job?.status === 'generating' && styles.actionBusy]}
    >
      <Text style={styles.actionTitle}>{label}</Text>
      <Text style={styles.actionSub}>
        {job?.status === 'generating'
          ? 'This may take a few minutes. You can keep exploring TripBack.'
          : job?.status === 'error'
            ? `${job.error ?? 'The last attempt did not finish.'} Tap to retry.`
            : readyUri
              ? `Play your eight-second window into ${year}.`
              : `Create an eight-second moving scene with period ambience.`}
      </Text>
    </Pressable>
  );
}

export function HistoricalVideoLayer() {
  const [savingVideo, setSavingVideo] = useState(false);
  const {
    videoJobs,
    dismissVideoJob,
    viewingVideo,
    openPortalVideo,
    closePortalVideo,
  } = useAppState();
  const jobs = Object.values(videoJobs);
  const job = jobs[jobs.length - 1];
  const player = useVideoPlayer(viewingVideo?.uri ?? null, instance => {
    instance.loop = true;
    instance.play();
  });

  return (
    <>
      {job && !viewingVideo ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (job.status === 'ready' && job.videoUri) {
              void openPortalVideo(job.portalId, job.title);
              dismissVideoJob(job.portalId);
            } else if (job.status === 'error') {
              dismissVideoJob(job.portalId);
            }
          }}
          style={[
            styles.banner,
            job.status === 'ready' && styles.bannerReady,
            job.status === 'error' && styles.bannerError,
          ]}
        >
          <View style={styles.bannerDot} />
          <View style={styles.bannerCopy}>
            <Text numberOfLines={1} style={styles.bannerTitle}>
              {job.status === 'generating'
                ? `Bringing ${job.title} to life…`
                : job.status === 'ready'
                  ? `${job.title} is alive — watch now`
                  : `Video couldn’t be created`}
            </Text>
            <Text numberOfLines={job.status === 'error' ? 3 : 1} style={styles.bannerSub}>
              {job.status === 'generating'
                ? 'Keep exploring — this will stay here while it generates.'
                : job.status === 'ready'
                  ? 'Tap to play the eight-second historical scene.'
                  : (job.error ?? 'Tap to dismiss, then retry from the place page.')}
            </Text>
          </View>
          <Text style={styles.bannerArrow}>{job.status === 'generating' ? '•••' : '›'}</Text>
        </Pressable>
      ) : null}

      <Modal visible={Boolean(viewingVideo)} animationType="fade" presentationStyle="fullScreen">
        <View style={styles.viewer}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls
            fullscreenOptions={{ enable: true }}
          />
          <View style={styles.viewerTop}>
            <Pressable accessibilityRole="button" onPress={closePortalVideo} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            <View style={styles.viewerLabel}>
              <Text numberOfLines={1} style={styles.viewerTitle}>{viewingVideo?.title}</Text>
              <Text style={styles.viewerSub}>An AI historical interpretation</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={savingVideo || !viewingVideo?.uri}
              onPress={() => {
                if (!viewingVideo?.uri) return;
                setSavingVideo(true);
                void saveToCameraRoll(viewingVideo.uri, 'video')
                  .then(() => Alert.alert('Saved to Photos', 'Your historical video is now in your camera roll.'))
                  .catch((error) => Alert.alert(
                    'Couldn’t save video',
                    error instanceof Error ? error.message : String(error),
                  ))
                  .finally(() => setSavingVideo(false));
              }}
              style={[styles.saveVideo, savingVideo && { opacity: 0.65 }]}
            >
              <Text style={styles.saveVideoText}>{savingVideo ? 'Saving…' : 'Save ↓'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: 4,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: Palette.ink,
    gap: 3,
  },
  actionBusy: { opacity: 0.78 },
  actionTitle: { fontFamily: Fonts.displayBold, fontSize: 17, color: Palette.lime },
  actionSub: { fontFamily: Fonts.body, fontSize: 12.5, lineHeight: 17, color: '#E8E6EE' },
  banner: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 20,
    minHeight: 68,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Palette.purple,
    boxShadow: '0 10px 28px rgba(16,16,20,0.3)',
  },
  bannerReady: { backgroundColor: Palette.lime },
  bannerError: { backgroundColor: Palette.blush },
  bannerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.white },
  bannerCopy: { flex: 1, gap: 1 },
  bannerTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Palette.ink },
  bannerSub: { fontFamily: Fonts.body, fontSize: 11.5, color: Palette.inkSoft },
  bannerArrow: { fontFamily: Fonts.displayBold, fontSize: 24, color: Palette.ink },
  viewer: { flex: 1, backgroundColor: '#050507' },
  viewerTop: {
    position: 'absolute',
    top: 52,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  closeText: { fontFamily: Fonts.body, fontSize: 31, lineHeight: 34, color: Palette.ink },
  viewerLabel: { flex: 1 },
  viewerTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Palette.white },
  viewerSub: { fontFamily: Fonts.body, fontSize: 11.5, color: '#D5D2DB' },
  saveVideo: {
    minWidth: 70,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.lime,
  },
  saveVideoText: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Palette.ink },
});
