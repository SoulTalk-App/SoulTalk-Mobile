import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

const SoulTalkLoader: React.FC = () => {
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'SoulTalk';
  const indexRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (indexRef.current < fullText.length) {
        indexRef.current++;
        setDisplayedText(fullText.substring(0, indexRef.current));
      } else {
        // Pause then reset to loop
        setTimeout(() => {
          indexRef.current = 0;
          setDisplayedText('');
        }, 500);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

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
