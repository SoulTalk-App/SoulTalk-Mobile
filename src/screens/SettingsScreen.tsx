import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

const BackButtonIcon = require('../../assets/images/settings/BackButtonIcon.png');
const SoulTalkLogo = require('../../assets/images/settings/SoulTalkLogo.png');

const SETTINGS_KEY = '@soultalk_settings';
const BIO_MAX_LENGTH = 150;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PRONOUN_OPTIONS = [
  'He/Him',
  'She/Her',
  'They/Them',
  'He/They',
  'She/They',
  'Ze/Zir',
  'Xe/Xem',
  'Prefer not to say',
];

const CustomToggle = ({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) => (
  <Pressable onPress={onToggle} style={styles.toggleTrack}>
    <View
      style={[
        styles.toggleThumb,
        value ? styles.toggleThumbOn : styles.toggleThumbOff,
      ]}
    />
  </Pressable>
);

const SettingsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, logout, resetPassword } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [bio, setBio] = useState('');
  const [bioError, setBioError] = useState('');
  const [pronoun, setPronoun] = useState('He/Him');
  const [showPronounPicker, setShowPronounPicker] = useState(false);

  // Load saved settings
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.displayName) setDisplayName(data.displayName);
          if (data.username) setUsername(data.username);
          if (data.bio) setBio(data.bio);
          if (data.pronoun) setPronoun(data.pronoun);
          if (data.pushNotifications !== undefined) setPushNotifications(data.pushNotifications);
          if (data.darkMode !== undefined) setDarkMode(data.darkMode);
        }
      } catch {}
    };
    load();

    // Pre-fill from auth user
    if (user?.first_name) setDisplayName((prev) => prev || user.first_name || '');
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Auto-save on navigate away
  const saveSettings = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ displayName, username, bio, pronoun, pushNotifications, darkMode })
      );
    } catch {}
  }, [displayName, username, bio, pronoun, pushNotifications, darkMode]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      saveSettings();
    });
    return unsubscribe;
  }, [navigation, saveSettings]);

  const handleBioChange = (text: string) => {
    setBio(text);
    if (text.length > BIO_MAX_LENGTH) {
      setBioError(`Bio cannot exceed ${BIO_MAX_LENGTH} characters (${text.length}/${BIO_MAX_LENGTH})`);
    } else {
      setBioError('');
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.length > 0 && !EMAIL_REGEX.test(text)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      Alert.alert('Password Reset', 'Please check your email for reset instructions.');
    } catch {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={BackButtonIcon} style={styles.backIcon} resizeMode="contain" />
          </Pressable>
          <Text style={styles.backText}>Back</Text>
        </View>

        {/* Signed in as */}
        <Text style={styles.signedInText}>
          Signed in as <Text style={styles.signedInBold}>{user?.first_name || 'User'}</Text>
        </Text>

        {/* Dashed separator */}
        <View style={styles.dashedLine} />

        {/* Display Name */}
        <TextInput
          style={styles.fieldInput}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="user"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
        />
        <View style={styles.separator} />

        {/* @username */}
        <TextInput
          style={styles.fieldInput}
          value={username}
          onChangeText={setUsername}
          placeholder="@username"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          autoCapitalize="none"
        />
        <View style={styles.separator} />

        {/* User Email */}
        <Text style={styles.emailLabel}>User Email</Text>
        <TextInput
          style={styles.emailInput}
          value={email}
          onChangeText={handleEmailChange}
          placeholder={user?.email || 'email@example.com'}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        <View style={styles.separator} />

        {/* Reset Password */}
        <Pressable onPress={handleResetPassword} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>RESET PASSWORD</Text>
        </Pressable>

        {/* Bio */}
        <TextInput
          style={styles.bioInput}
          value={bio}
          onChangeText={handleBioChange}
          placeholder="Bio"
          placeholderTextColor={colors.white}
          multiline
          maxLength={BIO_MAX_LENGTH + 10}
        />
        {bioError ? <Text style={styles.errorText}>{bioError}</Text> : null}
        {bio.length > 0 && !bioError ? (
          <Text style={styles.charCount}>{bio.length}/{BIO_MAX_LENGTH}</Text>
        ) : null}
        <View style={styles.separator} />

        {/* Pronouns */}
        <Pressable onPress={() => setShowPronounPicker(true)}>
          <Text style={styles.pronounText}>{pronoun}</Text>
        </Pressable>
        <View style={styles.separator} />

        {/* Push Notification */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Push Notification</Text>
          <CustomToggle
            value={pushNotifications}
            onToggle={() => setPushNotifications(!pushNotifications)}
          />
        </View>

        {/* Dark/Light Mode */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Dark/Light Mode</Text>
          <CustomToggle
            value={darkMode}
            onToggle={() => setDarkMode(!darkMode)}
          />
        </View>

        {/* Log Out */}
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </Pressable>

        {/* Spacer */}
        <View style={{ flex: 1, minHeight: 80 }} />

        {/* Footer */}
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.footerLink}>Terms & Privacy</Text>
          </Pressable>
          <Pressable onPress={() => Alert.alert('Coming Soon', 'Help page is under development.')}>
            <Text style={styles.footerLink}>Help</Text>
          </Pressable>
        </View>
        <View style={styles.footerSeparator} />
        <View style={styles.logoContainer}>
          <Image source={SoulTalkLogo} style={styles.logo} resizeMode="contain" />
        </View>
      </ScrollView>

      {/* Pronoun Picker Modal */}
      <Modal visible={showPronounPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPronounPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Pronouns</Text>
            <FlatList
              data={PRONOUN_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalOption,
                    pronoun === item && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setPronoun(item);
                    setShowPronounPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      pronoun === item && styles.modalOptionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#59168B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 12,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    lineHeight: 24 * 1.26,
    color: colors.white,
  },

  // Signed in
  signedInText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 46,
    color: colors.white,
  },
  signedInBold: {
    fontFamily: fonts.outfit.semiBold,
  },

  // Dashed line
  dashedLine: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },

  // Input fields
  fieldInput: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.5)',
    height: 46,
  },

  // Email
  emailLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.white,
    marginTop: 8,
  },
  emailInput: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.5)',
    height: 36,
  },

  // Error text
  errorText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: '#FF5E5E',
    marginTop: 2,
    marginBottom: 4,
  },
  charCount: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'right',
    marginTop: 2,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.white,
  },

  // Reset Password
  resetButton: {
    marginTop: 6,
    marginBottom: 6,
  },
  resetButtonText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 46,
    color: colors.white,
  },

  // Bio
  bioInput: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.white,
    paddingVertical: 12,
    minHeight: 46,
  },

  // Pronouns
  pronounText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 46,
    color: colors.white,
  },

  // Toggle
  toggleTrack: {
    width: 34,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  toggleThumbOff: {
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
  },
  toggleLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 46,
    color: colors.white,
  },

  // Logout
  logoutText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 46,
    color: '#FF5E5E',
    marginTop: 4,
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLink: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    lineHeight: 28,
    color: '#5ECFFF',
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logo: {
    width: 100,
    height: 22,
  },

  // Pronoun Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#59168B',
    borderRadius: 16,
    width: 280,
    maxHeight: 400,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalOptionText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalOptionTextActive: {
    color: colors.white,
    fontFamily: fonts.outfit.medium,
  },
});

export default SettingsScreen;
