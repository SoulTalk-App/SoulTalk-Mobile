import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

interface SoulTalkLoaderProps {
  /** When false, plays once then calls onComplete. Default true (loops). */
  loop?: boolean;
  /** Called after the animation finishes (only when loop=false). */
  onComplete?: () => void;
}

const FULL_TEXT = 'SoulTalk';
const CHAR_DELAY = 150;
const PAUSE_AFTER = 500;

const SoulTalkLoader: React.FC<SoulTalkLoaderProps> = ({ loop = true, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = useCallback(() => {
    if (indexRef.current < FULL_TEXT.length) {
      indexRef.current++;
      setDisplayedText(FULL_TEXT.substring(0, indexRef.current));
      timerRef.current = setTimeout(tick, CHAR_DELAY);
    } else {
      // Finished typing — pause, then either loop or complete
      timerRef.current = setTimeout(() => {
        if (loop) {
          indexRef.current = 0;
          setDisplayedText('');
          timerRef.current = setTimeout(tick, CHAR_DELAY);
        } else {
          onComplete?.();
        }
      }, PAUSE_AFTER);
    }
  }, [loop, onComplete]);

  useEffect(() => {
    timerRef.current = setTimeout(tick, CHAR_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tick]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{displayedText}</Text>
      <Text style={styles.cursor}>|</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  logo: {
    fontFamily: fonts.edensor.bold,
    fontSize: 40,
    color: colors.white,
    letterSpacing: 2,
  },
  cursor: {
    fontFamily: fonts.edensor.light,
    fontSize: 40,
    color: colors.white,
    opacity: 0.8,
  },
});

export default SoulTalkLoader;
