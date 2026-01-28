import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

interface VerificationSentScreenProps {
  navigation: any;
}

const VerificationSentScreen: React.FC<VerificationSentScreenProps> = ({ navigation }) => {
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigation.navigate('OTPVerification');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation]);

  const handlePress = () => {
    navigation.navigate('OTPVerification');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={colors.white} />
        </View>

        <Text style={styles.title}>You're all set!</Text>

        <Text style={styles.subtitle}>
          A verification code has been sent to your email.{'\n'}
          Please check your inbox.
        </Text>

        <Text style={styles.timer}>Redirecting in {countdown}s...</Text>

        <Text style={styles.tapHint}>Tap anywhere to continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 32,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: 40,
  },
  timer: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.white,
    opacity: 0.7,
    marginBottom: 20,
  },
  tapHint: {
    fontFamily: fonts.outfit.thin,
    fontSize: 12,
    color: colors.white,
    opacity: 0.5,
  },
});

export default VerificationSentScreen;
