import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, fonts } from '../../theme';
import AIGeneratedLabel from '../../components/AIGeneratedLabel';

type RevealedPlayerHandle = { play: () => void };
const RevealedVideoPlayer = forwardRef<RevealedPlayerHandle, {
  source: any;
  style: any;
}>(({ source, style }, ref) => {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
  });
  useImperativeHandle(ref, () => ({ play: () => player.play() }));
  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
});

const AFFIRM_STARS = Array.from({ length: 40 }, (_, i) => ({
  left: ((i * 39 + 23) % 100),
  top: ((i * 57 + 13) % 100),
  size: i < 3 ? 2.5 : (i % 3 === 0) ? 2 : 1,
  opacity: i < 3 ? 0.5 : (0.1 + (i % 5) * 0.09),
}));

const REVEALED_DATE_KEY = '@soultalk_affirmation_revealed_date';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CloudsBg = require('../../../assets/images/home/CloudsBg.png');
const CloudsLeft = require('../../../assets/images/home/CloudsLeft.png');
const CloudsRight = require('../../../assets/images/home/CloudsRight.png');
const IdleVideo = require('../../../assets/videos/affirmationIdle.mp4');
const RevealedVideo = require('../../../assets/videos/affirmationMirrorLookingUp.mp4');
const IdleVideoDark = require('../../../assets/videos/dark/affirmationIdle.mp4');
const RevealedVideoDark = require('../../../assets/videos/dark/affirmationMirrorLookingUp.mp4');

type Props = {
  isDarkMode: boolean;
  // so-dtuh: AffirmationReveal is now the entry screen for the affirmation
  // flow. Three modes, driven by the prop combination:
  //   1. !hasEntryToday + no affirmation_text → "Journal to Unlock" button,
  //      central press routes to onOpenJournal. Idle animation only.
  //   2. hasEntryToday + no affirmation_text → "Click to Reveal" button,
  //      press calls onGenerate(), then plays the reveal animation with the
  //      returned text. Used for cold entry from the Home grid.
  //   3. affirmation_text supplied → replay-from-ready path. The existing
  //      AsyncStorage REVEALED_DATE_KEY check auto-jumps to the revealed
  //      state (preserves so-atde / earlier replay behavior).
  hasEntryToday: boolean;
  onOpenJournal: () => void;
  onGenerate?: () => Promise<{ affirmation_text: string; date_key: string }>;
  affirmation_text?: string;
  date_key?: string;
  onClose: () => void;
  // so-pq3o: gates the interactive central CTA. The ambient backdrop (idle
  // video + clouds) always renders, but while the screen hasn't yet decided
  // reveal-vs-ready (cold re-entry, before listAffirmations resolves) the
  // button is HIDDEN and its press is a no-op — killing the reveal-flash and
  // the click-race where a tap during the glitch fired a redundant generate.
  // Defaults true so the replay path and any other caller are unaffected.
  ctaReady?: boolean;
};

export function AffirmationReveal({
  isDarkMode,
  hasEntryToday,
  onOpenJournal,
  onGenerate,
  affirmation_text: initialText,
  date_key: initialDateKey,
  onClose,
  ctaReady = true,
}: Props) {
  const insets = useSafeAreaInsets();
  // so-i7xd: full migration to useThemeColors. `colors` is the per-active-
  // theme palette (dark → teal/teal-ink, light → purple). The static
  // StyleSheet has been moved into the buildStyles factory below so all
  // color tokens resolve dynamically.
  const colors = useThemeColors();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevealedMounted, setIsRevealedMounted] = useState(false);
  // so-dtuh: text/dateKey become local state so the cold-entry generate flow
  // can populate them after onGenerate resolves. For the replay path the
  // initial values come straight from props.
  const [text, setText] = useState<string>(initialText ?? '');
  const [dateKey, setDateKey] = useState<string>(initialDateKey ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const isLockedEntry = !initialText && !hasEntryToday;
  const revealedPlayerRef = useRef<RevealedPlayerHandle>(null);
  const playRevealedOnMountRef = useRef(false);

  // so-3i78: P0 crash on TF49 (Chelsea repro) — exiting the mirror before
  // the in-flight generate request resolves. Several callsites continue to
  // setState / write Reanimated shared values / poke the expo-video player
  // refs after the component unmounts (handleGeneratePress's post-await
  // continuation; idlePlayer.statusChange firing while teardown is in
  // progress; checkRevealed's AsyncStorage await; the setTimeout in
  // handleReveal). On iOS this rolls up to a native crash via the video
  // player teardown. mountedRef gates every async-resolve setState +
  // reanimated/player call below so they no-op once the screen is gone.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const idleSource = isDarkMode ? IdleVideoDark : IdleVideo;
  const revealedSource = isDarkMode ? RevealedVideoDark : RevealedVideo;

  const idlePlayer = useVideoPlayer(idleSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
    p.addListener('statusChange', ({ status }) => {
      // so-3i78: the listener can fire mid-teardown; only flip state if
      // the component is still mounted, otherwise we update on a disposed
      // tree.
      if (status === 'readyToPlay' && mountedRef.current) {
        setIsRevealedMounted(true);
      }
    });
  });

  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.92);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const cloudsBgOpacity = useSharedValue(1);
  const cloudsLeftX = useSharedValue(0);
  const cloudsLeftOpacity = useSharedValue(1);
  const cloudsRightX = useSharedValue(0);
  const cloudsRightOpacity = useSharedValue(1);
  const backButtonOpacity = useSharedValue(1);
  const idleVideoOpacity = useSharedValue(1);
  const revealedVideoOpacity = useSharedValue(0);
  const videoZoom = useSharedValue(1);

  const isRevealedRef = useRef(false);

  const { fontSize, lineHeight } = useMemo(() => {
    const len = text?.length ?? 0;
    if (len <= 60) return { fontSize: 42, lineHeight: 56 };
    if (len <= 100) return { fontSize: 36, lineHeight: 48 };
    if (len <= 160) return { fontSize: 30, lineHeight: 42 };
    if (len <= 220) return { fontSize: 26, lineHeight: 37 };
    return { fontSize: 22, lineHeight: 32 };
  }, [text]);

  useEffect(() => {
    buttonOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    // so-dtuh: only meaningful on the replay-from-ready path where an
    // initialDateKey was supplied. Cold entry has no key to compare against.
    if (!initialDateKey) return;
    const checkRevealed = async () => {
      try {
        const revealedDate = await AsyncStorage.getItem(REVEALED_DATE_KEY);
        // so-3i78: bail if the user backed out during the AsyncStorage await.
        if (!mountedRef.current) return;
        if (revealedDate === initialDateKey) {
          isRevealedRef.current = true;
          setIsRevealed(true);
          setIsRevealedMounted(true);
          playRevealedOnMountRef.current = true;
          textOpacity.value = 1;
          textScale.value = 1;
          buttonOpacity.value = 0;
          cloudsBgOpacity.value = 0;
          cloudsLeftX.value = -SCREEN_WIDTH;
          cloudsLeftOpacity.value = 0;
          cloudsRightX.value = SCREEN_WIDTH;
          cloudsRightOpacity.value = 0;
          backButtonOpacity.value = 1;
          idleVideoOpacity.value = 0;
          revealedVideoOpacity.value = 1;
          videoZoom.value = 1.08;
          idlePlayer.pause();
        }
      } catch (err) {
        // so-zmjn: previously swallowed silently. A failed
        // AsyncStorage.getItem here means the user sees the reveal
        // button (and can replay the affirmation) instead of jumping
        // straight to the revealed state on the next mount. We can't
        // recover but we DO need to log so a regression in storage is
        // visible in field traces — silent break is the audit smell.
        console.warn('[AffirmationReveal] so-zmjn: checkRevealed AsyncStorage read failed:', err);
      }
    };
    checkRevealed();
  }, []);

  useEffect(() => {
    if (isRevealedMounted && playRevealedOnMountRef.current) {
      revealedPlayerRef.current?.play();
    }
  }, [isRevealedMounted]);

  const handleReveal = async (overrideText?: string, overrideDateKey?: string) => {
    // so-dtuh: optional overrides let the cold-entry generate flow run the
    // animation immediately with the freshly returned text/key without
    // waiting for the local state setters to flush — both setText and
    // setIsRevealed batch in this handler, so the JSX render after this
    // event sees the new text alongside isRevealed=true.
    const revealText = overrideText ?? text;
    const revealDateKey = overrideDateKey ?? dateKey;
    if (!revealText) return;
    // so-3i78: don't kick off the reveal animation on an unmounted screen.
    // Writing to disposed Reanimated shared values + a torn-down expo-video
    // player has been the crash class.
    if (!mountedRef.current) return;
    if (overrideText !== undefined) setText(overrideText);
    if (overrideDateKey !== undefined) setDateKey(overrideDateKey);

    isRevealedRef.current = true;
    setIsRevealed(true);

    // so-zmjn: only write a real date_key. Pre-fix an undefined /
    // empty key would write nothing usefully (the `if (revealDateKey)`
    // already protected against undefined) but a literally-empty
    // string from a degenerate BE response would still land as ''.
    // Defensive trim before the write.
    const writableKey = typeof revealDateKey === 'string' ? revealDateKey.trim() : '';
    if (writableKey) {
      try {
        await AsyncStorage.setItem(REVEALED_DATE_KEY, writableKey);
      } catch (err) {
        // so-zmjn: previously swallowed silently. If this write fails
        // the user can replay the same affirmation tomorrow's mount —
        // i.e. reveal-once silently breaks. Surface to logs so the
        // failure isn't invisible.
        console.warn('[AffirmationReveal] so-zmjn: REVEALED_DATE_KEY write failed:', err);
      }
    } else {
      // so-zmjn: defensive log so a BE that ships a blank date_key
      // surfaces in field traces. The replay UX still works for the
      // current session because isRevealedRef is set above; only the
      // cross-session memory is missed.
      console.warn(
        '[AffirmationReveal] so-zmjn: skipped REVEALED_DATE_KEY write — blank/missing date_key',
      );
    }

    buttonOpacity.value = withTiming(0, { duration: 250 });
    buttonScale.value = withTiming(0.9, { duration: 250 });

    cloudsBgOpacity.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.ease),
    });
    cloudsLeftX.value = withTiming(-SCREEN_WIDTH, {
      duration: 800,
      easing: Easing.in(Easing.cubic),
    });
    cloudsLeftOpacity.value = withDelay(300, withTiming(0, { duration: 500 }));
    cloudsRightX.value = withTiming(SCREEN_WIDTH, {
      duration: 800,
      easing: Easing.in(Easing.cubic),
    });
    cloudsRightOpacity.value = withDelay(300, withTiming(0, { duration: 500 }));
    videoZoom.value = withTiming(1.15, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    idleVideoOpacity.value = withDelay(
      200,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    revealedVideoOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );

    setIsRevealedMounted(true);
    playRevealedOnMountRef.current = true;
    revealedPlayerRef.current?.play();

    textOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    textScale.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );

    backButtonOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

    setTimeout(() => {
      // so-3i78: skip the deferred pause if the screen has since unmounted —
      // the player has been torn down by expo-video's cleanup by then.
      if (!mountedRef.current) return;
      idlePlayer.pause();
    }, 1200);
  };

  // so-dtuh: cold-entry generate flow — fetch today's affirmation, then
  // play the reveal animation with the returned text. onGenerate alerts on
  // failure; we just reset the spinner and stay on idle.
  const handleGeneratePress = async () => {
    if (!onGenerate || isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await onGenerate();
      // so-3i78: this is the primary crash path Chelsea hit on TF49 —
      // exiting before the generate resolves leaves the post-await
      // continuation writing to a disposed tree (setState + Reanimated
      // worklets + expo-video calls). Bail cleanly if we've unmounted.
      if (!mountedRef.current) return;
      setIsGenerating(false);
      handleReveal(result.affirmation_text, result.date_key);
    } catch {
      if (!mountedRef.current) return;
      setIsGenerating(false);
    }
  };

  // so-dtuh: central-button behavior fans out by mode.
  //   - locked entry → routes to Journal (no generate, no reveal).
  //   - cold entry with hasEntryToday → generate then reveal.
  //   - replay (text already supplied) → reveal immediately.
  // so-pq3o: until the screen settles reveal-vs-ready, the CTA is gated —
  // hidden in render below AND its press is a no-op here (belt-and-suspenders
  // against the click-race that double-fired generation during the flash).
  const handleCenterPress = !ctaReady
    ? () => {}
    : isLockedEntry
      ? onOpenJournal
      : text
        ? () => handleReveal()
        : handleGeneratePress;
  const buttonLabel = isLockedEntry ? 'Journal to Unlock' : 'Click to Reveal';

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));
  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));
  const cloudsBgAnimStyle = useAnimatedStyle(() => ({ opacity: cloudsBgOpacity.value }));
  const cloudsLeftAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsLeftOpacity.value,
    transform: [{ translateX: cloudsLeftX.value }],
  }));
  const cloudsRightAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsRightOpacity.value,
    transform: [{ translateX: cloudsRightX.value }],
  }));
  const backButtonAnimStyle = useAnimatedStyle(() => ({ opacity: backButtonOpacity.value }));
  const videoZoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: videoZoom.value }] }));
  const idleVideoAnimStyle = useAnimatedStyle(() => ({ opacity: idleVideoOpacity.value }));
  const revealedVideoAnimStyle = useAnimatedStyle(() => ({ opacity: revealedVideoOpacity.value }));

  const containerBg = isDarkMode ? '#33335B' : colors.accent.pink;

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {isDarkMode && (
        <LinearGradient
          colors={['#2B2B54', '#33335B', '#33335B']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <Animated.View style={[styles.videoWrapper, videoZoomStyle]}>
        <Animated.View style={[styles.videoContainer, idleVideoAnimStyle]}>
          <VideoView
            player={idlePlayer}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </Animated.View>

        {isRevealedMounted && (
          <Animated.View style={[styles.videoContainer, revealedVideoAnimStyle]}>
            <RevealedVideoPlayer
              ref={revealedPlayerRef}
              source={revealedSource}
              style={styles.video}
            />
          </Animated.View>
        )}

        {isDarkMode && (
          <LinearGradient
            colors={['#33335B', 'rgba(51,51,91,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.seamFade}
            pointerEvents="none"
          />
        )}
      </Animated.View>

      {isDarkMode && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {AFFIRM_STARS.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${s.left}%` as any,
                top: `${s.top}%` as any,
                width: s.size,
                height: s.size,
                borderRadius: s.size,
                backgroundColor: '#FFFFFF',
                opacity: s.opacity,
              }}
            />
          ))}
        </View>
      )}

      <View
        style={[styles.cloudsContainer, isDarkMode && styles.cloudsContainerDark]}
        pointerEvents="none"
      >
        <Animated.View style={[styles.cloudsLayer, cloudsBgAnimStyle]}>
          <Image source={CloudsBg} style={styles.cloudsImage} resizeMode="cover" />
        </Animated.View>
        <Animated.View style={[styles.cloudsLayer, cloudsLeftAnimStyle]}>
          <Image source={CloudsLeft} style={styles.cloudsImage} resizeMode="cover" />
        </Animated.View>
        <Animated.View style={[styles.cloudsLayer, cloudsRightAnimStyle]}>
          <Image source={CloudsRight} style={styles.cloudsImage} resizeMode="cover" />
        </Animated.View>
      </View>

      <Animated.View
        style={[styles.backButtonContainer, { top: insets.top + 16 }, backButtonAnimStyle]}
      >
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close affirmation"
        >
          <View style={styles.backIconCircle}>
            <Feather name="chevron-left" size={26} color="#3A0E66" />
          </View>
        </Pressable>
      </Animated.View>

      {isRevealed && (
        <View
          style={[
            styles.textArea,
            { paddingTop: insets.top + 20, height: SCREEN_HEIGHT - SCREEN_WIDTH + 40 },
          ]}
        >
          {/* so-7r4y: persistent AI-disclosure label above every
              AI-generated affirmation. tone="light" because the reveal
              view is always on the dark cosmic backdrop regardless of
              the active app theme. */}
          {/* so-gp1q: fade the WHOLE revealed text block (disclosure label +
              affirmation) in as one unit via textAnimStyle. Previously the
              AIGeneratedLabel was static and popped in instantly while the
              clouds were still dissolving — a hard cut on the top half. Now the
              label and text resolve together with the same opacity/scale, so
              the top half reads as one continuous reveal. Timing unchanged
              (reuses the existing textOpacity/textScale); identical in both
              themes (tone stays "light"). */}
          <Animated.View style={[styles.textBlock, textAnimStyle]}>
            <AIGeneratedLabel tone="light" style={{ marginBottom: 16 }} />
            <Text style={[styles.affirmationText, { fontSize, lineHeight }]}>
              {text}
            </Text>
          </Animated.View>
        </View>
      )}

      {!isRevealed && ctaReady && (
        <Animated.View style={[styles.revealButtonContainer, buttonAnimStyle]}>
          <Pressable
            onPress={handleCenterPress}
            disabled={isGenerating || !ctaReady}
            accessibilityRole="button"
            accessibilityLabel={isGenerating ? 'Generating your affirmation' : buttonLabel}
            accessibilityState={{ disabled: isGenerating, busy: isGenerating }}
            style={[styles.revealButton, isDarkMode && styles.revealButtonDark]}
          >
            <LinearGradient
              colors={
                isDarkMode
                  ? ['rgba(77, 232, 212, 0.15)', 'rgba(77, 232, 212, 0.05)']
                  : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.revealButtonGradient}
            />
            {isGenerating ? (
              <ActivityIndicator color={isDarkMode ? colors.primary : colors.white} />
            ) : (
              <Text
                style={[
                  styles.revealButtonText,
                  isDarkMode && styles.revealButtonTextDark,
                  // so-y6d4: override the static styles.revealButtonTextDark's
                  // alias-pinned color with the active theme's primary so the
                  // dark-mode label renders teal not purple.
                  isDarkMode && { color: colors.primary },
                ]}
              >
                {buttonLabel}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const buildStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1 },
  videoWrapper: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    justifyContent: 'flex-end',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  seamFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_WIDTH - 56,
    height: 56,
  },
  cloudsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    zIndex: 2,
  },
  cloudsContainerDark: {
    opacity: 0.35,
  },
  cloudsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  cloudsImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  backButtonContainer: {
    position: 'absolute',
    left: 22,
    zIndex: 10,
  },
  backIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 5,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
  },
  affirmationText: {
    fontFamily: fonts.outfit.light,
    color: colors.white,
    textAlign: 'center',
  },
  revealButtonContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.53,
    alignSelf: 'center',
    zIndex: 10,
  },
  revealButton: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  revealButtonDark: {
    borderColor: 'rgba(77, 232, 212, 0.3)',
    backgroundColor: 'rgba(77, 232, 212, 0.08)',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  revealButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  revealButtonText: {
    fontFamily: fonts.edensor.semiBold,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
  },
  revealButtonTextDark: {
    color: colors.primary,
  },
});
