import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/AuthService';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';

const SoulTalkLogo = require('../../assets/images/settings/SoulTalkLogo.png');

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
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const { isDarkMode, themePref, setThemePref } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => buildStyles(colors, isDarkMode), [colors, isDarkMode]);
  const placeholderColor = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(58,14,102,0.5)';
  const lockIconColor = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(58,14,102,0.55)';
  // so-urv4 #4: the three profile fields are read and written together
  // (pre-fill from user on mount, snapshotted into profileRef for the
  // beforeRemove save). Collapse them into a single state object so the
  // pre-fill is one update instead of three back-to-back, and the
  // beforeRemove ref tracks one source of truth. Other useStates
  // (showPronounPicker, usernameAvailable, usernameChecking) have
  // independent lifecycles and stay separate.
  const [profile, setProfile] = useState<{
    displayName: string;
    username: string;
    pronoun: string;
  }>({ displayName: '', username: '', pronoun: '' });
  const { displayName, username, pronoun } = profile;
  const setDisplayName = useCallback(
    (v: string) => setProfile((p) => ({ ...p, displayName: v })),
    [],
  );
  const setUsername = useCallback(
    (v: string) => setProfile((p) => ({ ...p, username: v })),
    [],
  );
  const setPronoun = useCallback(
    (v: string) => setProfile((p) => ({ ...p, pronoun: v })),
    [],
  );

  const [showPronounPicker, setShowPronounPicker] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track current values in a ref so beforeRemove always sees latest
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // so-punu: defensive guards for the Settings ↔ Home rapid-tab crash.
  // mountedRef gates async setState + Alert calls so they no-op after
  // unmount; savingRef collapses overlapping beforeRemove saveSettings
  // invocations into one in-flight request (rapid pop-push-pop kicks
  // beforeRemove on each unmount, which fan-fired parallel updateProfile
  // fetches on prior builds).
  const mountedRef = useRef(true);
  const savingRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
        usernameDebounceRef.current = null;
      }
    };
  }, []);


  const usernameIsLocked = Boolean(user?.username);

  // Pre-fill from user profile (backend data)
  useEffect(() => {
    if (!user) return;
    // so-urv4 #4: single setProfile so the pre-fill is one batched update
    // rather than three (was the original perf catalog motivation).
    setProfile({
      displayName: user.display_first_name || user.first_name || '',
      username: user.username || '',
      pronoun: user.pronoun || '',
    });
  }, [user]);

  // Save profile to backend + device prefs to AsyncStorage
  const saveSettings = useCallback(async () => {
    // so-punu: collapse concurrent beforeRemove invocations. Rapid
    // Settings → Home → Settings → Home fired beforeRemove on each
    // unmount, racing multiple parallel updateProfile fetches that
    // could leave the auth context in an inconsistent state.
    if (savingRef.current) return;
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
      savingRef.current = true;
      try {
        await updateProfile(updates);
      } catch (error: any) {
        // so-punu: only surface the alert if Settings is still mounted —
        // otherwise the error toast pops on Home and confuses the user
        // (and can interleave with rapid nav transitions).
        if (mountedRef.current) {
          Alert.alert('Save Failed', error.message || 'Could not save profile changes.');
        }
      } finally {
        savingRef.current = false;
      }
    }
  }, [user, updateProfile, usernameAvailable, usernameIsLocked]);

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
        // so-opaq: go through authService (shared axiosInstance + auth
        // interceptors) instead of a raw fetch, so an expired access token
        // triggers the single-flight refresh rather than a bare 401.
        const data = await authService.checkUsernameAvailability(value);
        // so-punu: gate state writes behind the mounted check so a rapid
        // unmount during the in-flight request doesn't update state on a
        // discarded component (RN warns + can wedge on some devices).
        if (!mountedRef.current) return;
        setUsernameAvailable(data.available);
      } catch {
        if (mountedRef.current) setUsernameAvailable(null);
      } finally {
        if (mountedRef.current) setUsernameChecking(false);
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

  const performDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error: any) {
      Alert.alert(
        'Deletion Failed',
        error?.message || 'Could not delete your account. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', style: 'destructive', onPress: performDeleteAccount },
        ],
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your SoulTalk account?',
      'This permanently removes your journal entries, soul signals, soul shifts, soulsights, mood history, and personality test results. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your account and all related data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete forever', style: 'destructive', onPress: performDeleteAccount },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <CosmicScreen tone="void">
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Feather name="chevron-left" size={28} color={isDarkMode ? '#FFFFFF' : '#3A0E66'} />
          </Pressable>
        </View>

        {/* Signed in as */}
        <Text style={styles.signedInText}>
          Signed in as <Text style={styles.signedInBold}>{user?.first_name || 'User'}</Text>
        </Text>

        {/* Dashed separator */}
        <View style={styles.dashedLine} />

        {/* Display Name */}
        <TextInput
          style={[styles.fieldInput, displayName ? styles.fieldInputActive : null]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="user"
          placeholderTextColor={placeholderColor}
        />
        <View style={styles.separator} />

        {/* @username */}
        <View style={styles.usernameRow}>
          <TextInput
            style={[styles.fieldInput, { flex: 1, opacity: usernameIsLocked ? 0.6 : 1 }]}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="@username"
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
            editable={!usernameIsLocked}
          />
          {usernameIsLocked ? (
            <Ionicons name="lock-closed" size={18} color={lockIconColor} />
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
        <View style={styles.separator} />

        {/* User Email */}
        <Text style={styles.emailLabel}>User Email</Text>
        <View style={styles.usernameRow}>
          <Text style={[styles.emailInput, styles.fieldInputActive, { flex: 1 }]}>
            {user?.email || ''}
          </Text>
          <Ionicons name="lock-closed" size={18} color={lockIconColor} />
        </View>
        <View style={styles.separator} />

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
        <View style={styles.separator} />

        {/* Push Notification */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Push Notification</Text>
          <Text style={styles.comingSoonTag}>Coming Soon</Text>
        </View>

        {/* Appearance — Light / Dark */}
        <View style={styles.appearanceRow}>
          <Text style={styles.toggleLabel}>Appearance</Text>
          <View style={styles.themeSegment}>
            {(['light', 'dark'] as const).map((opt) => {
              const active = themePref === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.themeSegmentItem, active && styles.themeSegmentItemActive]}
                  onPress={() => setThemePref(opt)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Appearance ${opt}`}
                >
                  <Text style={[styles.themeSegmentText, active && styles.themeSegmentTextActive]}>
                    {opt === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Log Out */}
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </Pressable>

        {/* Delete Account */}
        <Pressable onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>DELETE ACCOUNT</Text>
        </Pressable>

        {/* Spacer */}
        <View style={{ flex: 1, minHeight: 80 }} />

        {/* Footer */}
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.footerLink}>Terms & Privacy</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Help')}>
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
      </View>
    </CosmicScreen>
  );
};

const buildStyles = (colors: ReturnType<typeof useThemeColors>, isDark: boolean) => {
  // Theme-aware ink tokens. Light path uses purple ink on the lavender
  // CosmicScreen wash; dark uses white on the void backdrop. (so-tbe)
  const ink = isDark ? colors.white : colors.text.primary;
  const inkSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(58,14,102,0.5)';
  const divider = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(58,14,102,0.18)';
  const dashedBorder = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(58,14,102,0.25)';

  return StyleSheet.create({
    container: {
      // Transparent so the CosmicScreen tone="void" backdrop (gradient + orb +
      // aurora + stars) shows through. Hardcoded bg here would suffocate it.
      flex: 1,
      backgroundColor: 'transparent',
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

    // Signed in
    signedInText: {
      fontFamily: fonts.outfit.regular,
      fontSize: 14,
      lineHeight: 46,
      color: ink,
    },
    signedInBold: {
      fontFamily: fonts.outfit.semiBold,
    },

    // Dashed line
    dashedLine: {
      borderWidth: 1,
      borderColor: dashedBorder,
      borderStyle: 'dashed',
    },

    // Input fields
    fieldInput: {
      fontFamily: fonts.outfit.regular,
      fontSize: 15,
      lineHeight: 20,
      color: inkSub,
      height: 46,
    },
    fieldInputActive: {
      color: ink,
    },

    // Field label
    fieldLabel: {
      fontFamily: fonts.outfit.regular,
      fontSize: 15,
      color: ink,
      marginTop: 16,
    },

    // Email
    emailLabel: {
      fontFamily: fonts.outfit.regular,
      fontSize: 15,
      color: ink,
      marginTop: 16,
    },
    emailInput: {
      fontFamily: fonts.outfit.regular,
      fontSize: 14,
      lineHeight: 20,
      color: inkSub,
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
      color: inkSub,
    },
    usernameTaken: {
      fontFamily: fonts.outfit.regular,
      fontSize: 11,
      color: colors.error,
      marginTop: 2,
      marginBottom: 4,
    },

    // Separator
    separator: {
      height: 1,
      backgroundColor: divider,
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
      color: ink,
    },

    // Pronouns
    pronounText: {
      fontFamily: fonts.outfit.regular,
      fontSize: 14,
      lineHeight: 20,
      height: 36,
      color: inkSub,
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
      color: ink,
    },
    comingSoonTag: {
      fontFamily: fonts.outfit.medium,
      fontSize: 11,
      color: inkSub,
      borderWidth: 1,
      borderColor: dashedBorder,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },

    // Appearance segmented control
    appearanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 46,
      paddingVertical: 6,
    },
    themeSegment: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(58,14,102,0.06)',
      borderRadius: 10,
      padding: 2,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(58,14,102,0.10)',
    },
    themeSegmentItem: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    themeSegmentItemActive: {
      // Active pill uses brand purple on light (high-contrast white-on-purple
      // text) and translucent white on dark (white-on-white-tint text).
      backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : colors.primary,
    },
    themeSegmentText: {
      fontFamily: fonts.outfit.medium,
      fontSize: 12,
      color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(58,14,102,0.7)',
    },
    themeSegmentTextActive: {
      color: colors.white,
    },

    // Logout
    logoutText: {
      fontFamily: fonts.outfit.regular,
      fontSize: 15,
      lineHeight: 46,
      color: colors.error,
      marginTop: 4,
    },

    // Delete Account (destructive — Apple 5.1.1(v) requirement)
    deleteAccountText: {
      fontFamily: fonts.outfit.regular,
      fontSize: 15,
      lineHeight: 32,
      color: colors.error,
      textDecorationLine: 'underline',
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
      // so-9cw: cyan reads clashy on the light lavender bg; fork to brand
      // purple in light. Dark mode keeps cyan to match the so-iao input chrome.
      color: isDark ? colors.accent.cyan : colors.primary,
      textDecorationLine: 'underline',
    },
    footerSeparator: {
      height: 1,
      backgroundColor: divider,
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
};

export default SettingsScreen;
