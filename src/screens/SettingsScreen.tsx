import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import SecureStorage from '../utils/SecureStorage';
import { colors, fonts, surfaces } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

const BackButtonIcon = require('../../assets/images/settings/BackButtonIcon.png');
const SoulTalkLogo = require('../../assets/images/settings/SoulTalkLogo.png');

// Rich star field
const SETTINGS_STARS = Array.from({ length: 50 }, (_, i) => ({
  left: ((i * 47 + 13) % 100),
  top: ((i * 53 + 17) % 100),
  size: i < 3 ? 2.8 : i < 7 ? 2 : (i % 4 === 0) ? 1.5 : 0.8,
  opacity: i < 3 ? 0.55 : i < 7 ? 0.35 : (0.08 + (i % 5) * 0.06),
}));

// Shooting stars
const SETTINGS_METEORS = [
  { startLeft: 20, startTop: 5, length: 40, angle: 32 },
  { startLeft: 65, startTop: 8, length: 35, angle: 38 },
];

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

const SettingsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pronoun, setPronoun] = useState('');
  const [showPronounPicker, setShowPronounPicker] = useState(false);
  const darkModeTapCount = useRef(0);
  const darkModeTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track current values in a ref so beforeRemove always sees latest
  const profileRef = useRef({ displayName, username, pronoun });
  useEffect(() => {
    profileRef.current = { displayName, username, pronoun };
  }, [displayName, username, pronoun]);


  const usernameIsLocked = Boolean(user?.username);

  // Pre-fill from user profile (backend data)
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_first_name || user.first_name || '');
    setUsername(user.username || '');
    setPronoun(user.pronoun || '');
  }, [user]);

  // Save profile to backend + device prefs to AsyncStorage
  const saveSettings = useCallback(async () => {
    const current = profileRef.current;

    // Save profile fields to backend
    const updates: Record<string, string | null> = {};
    const currentDisplayName = current.displayName || null;
    const currentUsername = current.username || null;
    const currentPronoun = current.pronoun || null;

    if (currentDisplayName !== (user?.display_first_name || user?.first_name || null)) {
      updates.display_first_name = currentDisplayName;
    }
    if (currentUsername !== (user?.username || null)) {
      updates.username = currentUsername;
    }
    if (currentPronoun !== (user?.pronoun || null)) {
      updates.pronoun = currentPronoun;
    }

    // Don't save if username is taken or already locked
    if (usernameAvailable === false || usernameIsLocked) {
      delete updates.username;
    }

    if (Object.keys(updates).length > 0) {
      try {
        await updateProfile(updates);
      } catch (error: any) {
        Alert.alert('Save Failed', error.message || 'Could not save profile changes.');
      }
    }
  }, [user, updateProfile]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      saveSettings();
    });
    return unsubscribe;
  }, [navigation, saveSettings]);

  const checkUsernameAvailability = useCallback((value: string) => {
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);

    // If username hasn't changed from server value, no need to check
    if (!value || value === (user?.username || '')) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }

    setUsernameChecking(true);
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const apiConfig = Constants.expoConfig?.extra?.apiConfig || { baseUrl: 'https://soultalkapp.com/api' };
        const token = await SecureStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const resp = await fetch(
          `${apiConfig.baseUrl}/auth/check-username?username=${encodeURIComponent(value)}`,
          { headers },
        );
        if (resp.ok) {
          const data = await resp.json();
          setUsernameAvailable(data.available);
        }
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
  }, [user?.username]);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    checkUsernameAvailability(text);
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // ── Space backdrop animations (dark mode) ──
  const planet1Y = useSharedValue(0);
  const planet2Y = useSharedValue(0);
  const planet3Y = useSharedValue(0);
  const nebulaScale = useSharedValue(1);
  const galaxyRotation = useSharedValue(0);
  const meteor0Opacity = useSharedValue(0);
  const meteor0TX = useSharedValue(0);
  const meteor0TY = useSharedValue(0);
  const meteor1Opacity = useSharedValue(0);
  const meteor1TX = useSharedValue(0);
  const meteor1TY = useSharedValue(0);

  useEffect(() => {
    if (!isDarkMode) return;

    planet1Y.value = withRepeat(
      withSequence(
        withTiming(-16, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(16, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    planet2Y.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(-12, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    planet3Y.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
        withTiming(9, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    nebulaScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    galaxyRotation.value = withRepeat(
      withTiming(360, { duration: 55000, easing: Easing.linear }), -1,
    );

    // Shooting stars
    const animateMeteor = (opVal: any, txVal: any, tyVal: any, m: typeof SETTINGS_METEORS[0], delay: number) => {
      const rad = (m.angle * Math.PI) / 180;
      const dx = Math.cos(rad) * m.length * 3;
      const dy = Math.sin(rad) * m.length * 3;
      const fire = () => {
        opVal.value = 0; txVal.value = 0; tyVal.value = 0;
        opVal.value = withDelay(delay, withSequence(
          withTiming(1, { duration: 100 }), withTiming(1, { duration: 500 }), withTiming(0, { duration: 300 }),
        ));
        txVal.value = withDelay(delay, withTiming(dx, { duration: 900, easing: Easing.out(Easing.quad) }));
        tyVal.value = withDelay(delay, withTiming(dy, { duration: 900, easing: Easing.out(Easing.quad) }));
      };
      fire();
      return setInterval(fire, 14000);
    };

    const i0 = animateMeteor(meteor0Opacity, meteor0TX, meteor0TY, SETTINGS_METEORS[0], 0);
    const i1 = animateMeteor(meteor1Opacity, meteor1TX, meteor1TY, SETTINGS_METEORS[1], 5000);
    return () => { clearInterval(i0); clearInterval(i1); };
  }, [isDarkMode]);

  const planet1Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet1Y.value }] }));
  const planet2Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet2Y.value }] }));
  const planet3Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet3Y.value }] }));
  const nebulaAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: nebulaScale.value }] }));
  const galaxyAnimStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${galaxyRotation.value}deg` }] }));
  const meteor0Style = useAnimatedStyle(() => ({
    opacity: meteor0Opacity.value, transform: [{ translateX: meteor0TX.value }, { translateY: meteor0TY.value }],
  }));
  const meteor1Style = useAnimatedStyle(() => ({
    opacity: meteor1Opacity.value, transform: [{ translateX: meteor1TX.value }, { translateY: meteor1TY.value }],
  }));

  const Wrapper = isDarkMode ? LinearGradient : View;
  const wrapperProps = isDarkMode
    ? { colors: [...surfaces.profileGradient], locations: [0, 0.3, 0.65, 1] as number[], style: [styles.container, { paddingTop: insets.top + 10 }] }
    : { style: [styles.container, { paddingTop: insets.top + 10 }] };

  return (
    <Wrapper {...(wrapperProps as any)}>
      {/* ═══ Rich space backdrop (dark mode) ═══ */}
      {isDarkMode && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Nebula glow */}
          <Animated.View style={[dkS.nebula, nebulaAnimStyle]}>
            <LinearGradient
              colors={['rgba(155, 89, 182, 0.16)', 'rgba(123, 104, 238, 0.07)', 'transparent']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0, y: 0 }}
              style={dkS.nebulaFill}
            />
          </Animated.View>
          <Animated.View style={[dkS.nebula2, nebulaAnimStyle]}>
            <LinearGradient
              colors={['rgba(196, 122, 219, 0.10)', 'rgba(79, 23, 134, 0.05)', 'transparent']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={dkS.nebulaFill}
            />
          </Animated.View>

          {/* Galaxy swirl */}
          <Animated.View style={[dkS.galaxy, galaxyAnimStyle]}>
            <View style={dkS.galaxyCore} />
            <View style={[dkS.galaxyArm, { width: 55, transform: [{ rotate: '0deg' }] }]} />
            <View style={[dkS.galaxyArm, { width: 45, transform: [{ rotate: '60deg' }], opacity: 0.7 }]} />
            <View style={[dkS.galaxyArm, { width: 50, transform: [{ rotate: '120deg' }], opacity: 0.8 }]} />
          </Animated.View>

          {/* Stars */}
          {SETTINGS_STARS.map((s, i) => (
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

          {/* Planet 1 — large purple, top right */}
          <Animated.View style={[dkS.planet, dkS.planet1, planet1Style]}>
            <LinearGradient
              colors={['rgba(155, 89, 182, 0.28)', 'rgba(155, 89, 182, 0.07)', 'rgba(0, 0, 0, 0.18)']}
              start={{ x: 0.2, y: 0.15 }}
              end={{ x: 0.9, y: 0.85 }}
              style={dkS.planetFill}
            />
            <View style={[dkS.planetHighlight, { top: '16%', left: '20%', width: 14, height: 14 }]} />
          </Animated.View>

          {/* Planet 2 — ringed indigo, mid left */}
          <Animated.View style={[dkS.planet, dkS.planet2, planet2Style]}>
            <LinearGradient
              colors={['rgba(123, 104, 238, 0.24)', 'rgba(123, 104, 238, 0.05)', 'rgba(0, 0, 0, 0.18)']}
              start={{ x: 0.25, y: 0.1 }}
              end={{ x: 0.85, y: 0.9 }}
              style={dkS.planetFill}
            />
            <View style={[dkS.planetHighlight, { top: '15%', left: '25%', width: 10, height: 10 }]} />
            <View style={dkS.planetRing} />
          </Animated.View>

          {/* Planet 3 — tiny teal moon, bottom right */}
          <Animated.View style={[dkS.planet, dkS.planet3, planet3Style]}>
            <LinearGradient
              colors={['rgba(77, 232, 212, 0.18)', 'rgba(77, 232, 212, 0.04)', 'rgba(0, 0, 0, 0.10)']}
              start={{ x: 0.3, y: 0.2 }}
              end={{ x: 0.8, y: 0.85 }}
              style={dkS.planetFill}
            />
            <View style={[dkS.planetHighlight, { top: '20%', left: '28%', width: 5, height: 5 }]} />
          </Animated.View>

          {/* Shooting stars */}
          {SETTINGS_METEORS.map((m, idx) => (
            <Animated.View
              key={idx}
              style={[
                dkS.meteor,
                { left: `${m.startLeft}%` as any, top: `${m.startTop}%` as any, width: m.length, transform: [{ rotate: `${m.angle}deg` }] },
                idx === 0 ? meteor0Style : meteor1Style,
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.3)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={dkS.meteorTrail}
              />
            </Animated.View>
          ))}

          {/* Asteroids */}
          <View style={[dkS.asteroid, { top: '30%', left: '7%', width: 4, height: 3 }]} />
          <View style={[dkS.asteroid, { top: '31%', left: '10%', width: 3, height: 2 }]} />
          <View style={[dkS.asteroid, { bottom: '25%', right: '5%', width: 4, height: 3 }]} />

          {/* Dust lane */}
          <View style={dkS.dustLane}>
            <LinearGradient
              colors={['transparent', 'rgba(155, 89, 182, 0.04)', 'rgba(123, 104, 238, 0.05)', 'rgba(155, 89, 182, 0.04)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>
      )}

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
        <View style={[styles.dashedLine, isDarkMode && styles.dashedLineDark]} />

        {/* Display Name */}
        <TextInput
          style={[styles.fieldInput, displayName ? styles.fieldInputActive : null]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="user"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
        />
        <View style={[styles.separator, isDarkMode && styles.separatorDark]} />

        {/* @username */}
        <View style={styles.usernameRow}>
          <TextInput
            style={[styles.fieldInput, { flex: 1, opacity: usernameIsLocked ? 0.6 : 1 }]}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="@username"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            autoCapitalize="none"
            editable={!usernameIsLocked}
          />
          {usernameIsLocked ? (
            <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.5)" />
          ) : usernameChecking ? (
            <Text style={styles.usernameChecking}>...</Text>
          ) : usernameAvailable === true ? (
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          ) : usernameAvailable === false ? (
            <Ionicons name="close-circle" size={20} color="#FF5E5E" />
          ) : null}
        </View>
        {usernameAvailable === false && !usernameIsLocked && (
          <Text style={styles.usernameTaken}>Username is taken</Text>
        )}
        <View style={[styles.separator, isDarkMode && styles.separatorDark]} />

        {/* User Email */}
        <Text style={styles.emailLabel}>User Email</Text>
        <View style={styles.usernameRow}>
          <Text style={[styles.emailInput, styles.fieldInputActive, { flex: 1 }]}>
            {user?.email || ''}
          </Text>
          <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.5)" />
        </View>
        <View style={[styles.separator, isDarkMode && styles.separatorDark]} />

        {/* Change Password — only for email users */}
        {user?.providers?.includes('email') && (
          <Pressable onPress={handleChangePassword} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>CHANGE PASSWORD</Text>
          </Pressable>
        )}

        {/* Pronouns */}
        <Text style={styles.fieldLabel}>Pronouns</Text>
        <Pressable onPress={() => setShowPronounPicker(true)}>
          <Text style={styles.pronounText}>{pronoun}</Text>
        </Pressable>
        <View style={[styles.separator, isDarkMode && styles.separatorDark]} />

        {/* Push Notification */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Push Notification</Text>
          <Text style={styles.comingSoonTag}>Coming Soon</Text>
        </View>

        {/* Dark/Light Mode — hidden behind Coming Soon */}
        <Pressable
          style={styles.toggleRow}
          onPress={() => {
            darkModeTapCount.current += 1;
            if (darkModeTapTimer.current) clearTimeout(darkModeTapTimer.current);
            darkModeTapTimer.current = setTimeout(() => { darkModeTapCount.current = 0; }, 2000);
            if (darkModeTapCount.current >= 4) {
              darkModeTapCount.current = 0;
              toggleTheme();
            }
          }}
        >
          <Text style={styles.toggleLabel}>Dark Mode</Text>
          <Text style={styles.comingSoonTag}>Coming Soon</Text>
        </Pressable>

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
        <View style={[styles.footerSeparator, isDarkMode && styles.separatorDark]} />
        <View style={styles.logoContainer}>
          <Image source={SoulTalkLogo} style={styles.logo} resizeMode="contain" />
        </View>
      </ScrollView>

      {/* Pronoun Picker Modal */}
      <Modal visible={showPronounPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPronounPicker(false)}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={styles.modalTitle}>Select Pronouns</Text>
            <FlatList
              data={PRONOUN_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalOption,
                    pronoun === item && (isDarkMode ? styles.modalOptionActiveDark : styles.modalOptionActive),
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
    </Wrapper>
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
  fieldInputActive: {
    color: colors.white,
  },

  // Field label
  fieldLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.white,
    marginTop: 16,
  },

  // Email
  emailLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.white,
    marginTop: 16,
  },
  emailInput: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.5)',
    height: 36,
  },

  // Username
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameChecking: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  usernameTaken: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: '#FF5E5E',
    marginTop: 2,
    marginBottom: 4,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.white,
  },
  separatorDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dashedLineDark: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
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

  // Pronouns
  pronounText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 20,
    height: 36,
    color: 'rgba(255, 255, 255, 0.5)',
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
  comingSoonTag: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
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
  modalContentDark: {
    backgroundColor: '#1E1540',
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  modalOptionActiveDark: {
    backgroundColor: 'rgba(77, 232, 212, 0.12)',
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

// ── Dark mode space backdrop styles ──
const dkS = StyleSheet.create({
  nebula: {
    position: 'absolute',
    width: 280,
    height: 280,
    top: -40,
    right: -70,
    borderRadius: 140,
  },
  nebula2: {
    position: 'absolute',
    width: 220,
    height: 220,
    bottom: 120,
    left: -50,
    borderRadius: 110,
  },
  nebulaFill: {
    width: '100%',
    height: '100%',
    borderRadius: 140,
  },
  galaxy: {
    position: 'absolute',
    width: 70,
    height: 70,
    top: '55%',
    right: '15%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galaxyCore: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(196, 122, 219, 0.22)',
    shadowColor: 'rgba(196, 122, 219, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  galaxyArm: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(155, 89, 182, 0.07)',
    borderRadius: 1,
  },
  planet: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  planet1: {
    width: 120,
    height: 120,
    top: 50,
    right: -30,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.10)',
  },
  planet2: {
    width: 85,
    height: 85,
    top: '45%',
    left: -22,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.08)',
  },
  planet3: {
    width: 30,
    height: 30,
    bottom: '18%',
    right: '10%',
    borderWidth: 1,
    borderColor: 'rgba(77, 232, 212, 0.08)',
  },
  planetFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  planetHighlight: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  planetRing: {
    position: 'absolute',
    width: '175%',
    height: 14,
    top: '44%',
    left: '-37%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(123, 104, 238, 0.18)',
    transform: [{ rotate: '-20deg' }],
  },
  meteor: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  meteorTrail: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
  asteroid: {
    position: 'absolute',
    backgroundColor: 'rgba(180, 170, 200, 0.14)',
    borderRadius: 1.5,
    transform: [{ rotate: '25deg' }],
  },
  dustLane: {
    position: 'absolute',
    width: '150%',
    height: 70,
    top: '60%',
    left: '-25%',
    transform: [{ rotate: '-18deg' }],
    opacity: 0.5,
  },
});

export default SettingsScreen;
