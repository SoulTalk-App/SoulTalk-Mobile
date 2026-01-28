import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';

const Carousel1 = require('../../assets/images/onboarding/Carousel1.png');
const SendIcon = require('../../assets/images/common/SendIcon.png');

interface SoulPalNameScreenProps {
  navigation: any;
}

const SoulPalNameScreen: React.FC<SoulPalNameScreenProps> = ({ navigation }) => {
  const [soulPalName, setSoulPalName] = useState('');

  const handleContinue = async () => {
    if (soulPalName.trim()) {
      // Store SoulPal name locally
      await AsyncStorage.setItem('@soultalk_soulpal_name', soulPalName.trim());
      navigation.navigate('SetupComplete');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={Carousel1}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.question}>
            What would you like to name your SoulPal?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter a name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={soulPalName}
            onChangeText={setSoulPalName}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              styles.button,
              !soulPalName.trim() && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!soulPalName.trim()}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Image source={SendIcon} style={styles.sendIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    marginBottom: 40,
  },
  image: {
    width: 250,
    height: 250,
  },
  question: {
    fontFamily: fonts.edensor.semiBold,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    height: 56,
    width: '100%',
    paddingHorizontal: 16,
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.white,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 56,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sendIcon: {
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  buttonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.primary,
  },
});

export default SoulPalNameScreen;
