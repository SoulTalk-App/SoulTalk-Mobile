import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { colors, typography } from '../theme';

interface SetupCompleteScreenProps {
  navigation: any;
}

const SetupCompleteScreen: React.FC<SetupCompleteScreenProps> = ({ navigation }) => {
  const { setLocalAuth } = useAuth();

  const handleContinue = async () => {
    // Set local auth as complete (for testing without backend)
    await AsyncStorage.setItem('@soultalk_local_auth', 'true');

    // Update auth context - this will trigger navigation to AppStack automatically
    setLocalAuth(true);
  };

  const handleBackToStart = () => {
    navigation.navigate('WelcomeSplash');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={100} color={colors.primary} />
        </View>

        <Text style={styles.title}>You're all set!</Text>

        <Text style={styles.subtitle}>
          A verification code has been sent to your email.{'\n'}
          Please check your inbox.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        {/* TODO: Remove before production */}
        <TouchableOpacity style={styles.devButton} onPress={handleBackToStart}>
          <Text style={styles.devButtonText}>DEV: Back to Start</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    ...typography.displayLarge,
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 50,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  // TODO: Remove before production
  devButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: 12,
    color: colors.error,
  },
});

export default SetupCompleteScreen;
