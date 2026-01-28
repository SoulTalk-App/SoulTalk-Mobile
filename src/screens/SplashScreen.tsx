import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fonts } from '../theme';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'SoulTalk';
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        // Fade out the splash screen before navigating
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }).start(() => {
            navigation.replace('Welcome');
          });
        }, 300);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [navigation, fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.logo}>{displayedText}</Text>
      <Text style={styles.cursor}>|</Text>
    </Animated.View>
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

export default SplashScreen;
