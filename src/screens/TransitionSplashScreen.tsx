import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

interface TransitionSplashScreenProps {
  navigation: any;
}

const TransitionSplashScreen: React.FC<TransitionSplashScreenProps> = ({ navigation }) => {
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'SoulTalk';

  useEffect(() => {
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        // Navigate to WelcomeSplash screen after animation completes
        setTimeout(() => {
          navigation.replace('WelcomeSplash');
        }, 500);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [navigation]);

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

export default TransitionSplashScreen;
