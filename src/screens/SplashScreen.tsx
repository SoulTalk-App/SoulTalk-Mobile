import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
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
        // Navigate to Welcome screen after animation completes
        setTimeout(() => {
          navigation.replace('Welcome');
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
    ...typography.displayLarge,
    fontSize: 40,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cursor: {
    ...typography.displayLarge,
    fontSize: 40,
    color: colors.white,
    fontWeight: '300',
    opacity: 0.8,
  },
});

export default SplashScreen;
