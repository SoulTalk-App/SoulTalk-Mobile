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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/AuthService';
import JournalService from '../services/JournalService';
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

// so-wz41: editable profile fields, persisted locally so an edit survives a
// failed save (offline / mid-flight back-nav) instead of being silently
// dropped. Mirrors the useLocalDraft/so-skm AsyncStorage pattern.
//
// so-5eu1: the key MUST be scoped per-user. A static key let user A's draft
// survive logout and bleed onto user B on a shared device — B's SettingsScreen
// would restore A's displayName/pronoun and autosave them onto B's account
// (cross-user PII contamination). Keying by user.id isolates drafts; we also
// clear on logout for belt-and-suspenders.
const SETTINGS_PROFILE_DRAFT_KEY_PREFIX = '@soultalk_settings_profile_draft';
const settingsDraftKey = (userId: string) =>
  `${SETTINGS_PROFILE_DRAFT_KEY_PREFIX}:${userId}`;

interface ProfileFields {
  displayName: string;
  username: string;
  pronoun: string;
}

interface SettingsProfileDraft extends ProfileFields {
  updatedAt: number;
}

const profilesDiffer = (a: ProfileFields, b: ProfileFields) =>
  a.displayName !== b.displayName ||
  a.username !== b.username ||
  a.pronoun !== b.pronoun;

const serverProfile = (user: {
  display_first_name?: string | null;
  first_name?: string;
  username?: string | null;
  pronoun?: string | null;
}): ProfileFields => ({
  displayName: user.display_first_name || user.first_name || '',
  username: user.username || '',
  pronoun: user.pronoun || '',
});

const saveSettingsDraft = async (userId: string, p: ProfileFields): Promise<void> => {
  try {
    const payload: SettingsProfileDraft = { ...p, updatedAt: Date.now() };
    await AsyncStorage.setItem(settingsDraftKey(userId), JSON.stringify(payload));
  } catch (err: any) {
    console.log('[Settings] draft write error:', err?.message);
  }
};

const loadSettingsDraft = async (userId: string): Promise<ProfileFields | null> => {
  try {
    const json = await AsyncStorage.getItem(settingsDraftKey(userId));
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (
      typeof parsed?.displayName !== 'string' ||
      typeof parsed?.username !== 'string' ||
      typeof parsed?.pronoun !== 'string'
    ) {
      return null;
    }
    return {
      displayName: parsed.displayName,
      username: parsed.username,
      pronoun: parsed.pronoun,
    };
  } catch (err: any) {
    console.log('[Settings] draft load error:', err?.message);
    return null;
  }
};

const clearSettingsDraft = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(settingsDraftKey(userId));
  } catch (err: any) {
    console.log('[Settings] draft clear error:', err?.message);
  }
};

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

  // so-wz41: a prior save that didn't land (offline / mid-flight back-nav)
  // leaves a persisted draft; surface a non-blocking retry affordance.
  const [pendingSaveFailed, setPendingSaveFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // so-sjua: in-flight guard for the data-export request.
  const [exportingData, setExportingData] = useState(false);
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gate the autosave + server pre-fill until the initial load (server or
  // restored draft) has run, so we don't autosave an empty form or clobber
  // the user's in-flight edits when our own save updates the auth user.
  const hasPrefilledRef = useRef(false);

  // Track current values in a ref so beforeRemove always sees latest
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // so-punu: defensive guards for the Settings ↔ Home rapid-tab crash.
  // mountedRef gates async setState + Alert calls so they no-op after
  // unmount; savingRef collapses overlapping persistAndSave invocations
  // into one in-flight request (rapid pop-push-pop kicks beforeRemove on
  // each unmount, which fan-fired parallel updateProfile fetches on prior
  // builds).
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
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current);
        autoSaveDebounceRef.current = null;
      }
    };
  }, []);


  const usernameIsLocked = Boolean(user?.username);

  // Pre-fill from user profile (backend data) — runs once. so-wz41: if a
  // persisted draft from a failed save exists and still differs from the
  // server, restore THAT instead so the user's edit survives an offline
  // round-trip, and flag it so the retry affordance shows. Gated to run a
  // single time so our own successful saves (which update the auth user)
  // don't re-fire this and clobber in-flight edits.
  useEffect(() => {
    if (!user || hasPrefilledRef.current) return;
    hasPrefilledRef.current = true;
    let cancelled = false;
    (async () => {
      const server = serverProfile(user);
      const draft = await loadSettingsDraft(user.id);
      if (cancelled) return;
      if (draft && profilesDiffer(draft, server)) {
        // so-urv4 #4: single setProfile so the pre-fill is one batched update.
        setProfile(draft);
        setPendingSaveFailed(true);
      } else {
        if (draft) clearSettingsDraft(user.id);
        setProfile(server);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // so-wz41: compute the backend diff for the current fields, preserving the
  // username guards (never save a taken or an already-locked username).
  const computeUpdates = useCallback(
    (current: ProfileFields): Record<string, string | null> => {
      const updates: Record<string, string | null> = {};
      const currentDisplayName = current.displayName || null;
      const currentUsername = current.username || null;
      const currentPronoun = current.pronoun || null;
      if (currentDisplayName !== (user?.display_first_name || user?.first_name || null)) {
        updates.display_first_name = currentDisplayName;
      }
      if (currentPronoun !== (user?.pronoun || null)) {
        updates.pronoun = currentPronoun;
      }
      // Username guard: it's only editable before one is set. With save-as-you-
      // type we must never persist a taken OR a not-yet-confirmed username, so
      // only include a CHANGED username once the availability check says it's
      // free (usernameAvailable === true) and it isn't already locked.
      if (
        currentUsername !== (user?.username || null) &&
        usernameAvailable === true &&
        !usernameIsLocked
      ) {
        updates.username = currentUsername;
      }
      return updates;
    },
    [user, usernameAvailable, usernameIsLocked],
  );

  // so-wz41: persist-then-save. The local draft is written FIRST so the edit
  // survives even if the network save fails (offline) or the screen unmounts
  // mid-flight; on next open the draft is restored and re-tried. On success
  // the draft is cleared and the retry affordance hidden.
  const persistAndSave = useCallback(async () => {
    // so-5eu1: no user.id -> no per-user draft key, so there's nothing safe to
    // persist (and nothing to save). Bail rather than fall back to a shared key.
    const userId = user?.id;
    if (!userId) return;

    const current = profileRef.current;
    const updates = computeUpdates(current);

    if (Object.keys(updates).length === 0) {
      // Nothing to save (matches server) — drop any stale draft + banner.
      await clearSettingsDraft(userId);
      if (mountedRef.current) setPendingSaveFailed(false);
      return;
    }

    // Local-first: durable before the network attempt.
    await saveSettingsDraft(userId, current);

    // so-punu: collapse concurrent invocations (rapid nav fires beforeRemove
    // on each unmount, which previously raced parallel updateProfile fetches).
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await updateProfile(updates);
      await clearSettingsDraft(userId);
      if (mountedRef.current) setPendingSaveFailed(false);
    } catch {
      // Offline / failure: keep the draft and surface the non-blocking retry
      // affordance instead of an Alert that gets suppressed on unmount.
      if (mountedRef.current) setPendingSaveFailed(true);
    } finally {
      savingRef.current = false;
    }
  }, [user?.id, computeUpdates, updateProfile]);

  // so-wz41 (option C): debounced save-as-you-type. Each field change schedules
  // a save 500ms after the last keystroke; combined with the local draft this
  // makes the legacy beforeRemove save non-destructive.
  useEffect(() => {
    if (!hasPrefilledRef.current) return;
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    autoSaveDebounceRef.current = setTimeout(() => {
      persistAndSave();
    }, 500);
    return () => {
      if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    };
  }, [profile, persistAndSave]);

  // Final save attempt on the way out. Now non-destructive: persistAndSave has
  // already written the draft locally, so an offline / mid-flight failure no
  // longer drops the change (it is restored + retried on next open).
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      persistAndSave();
    });
    return unsubscribe;
  }, [navigation, persistAndSave]);

  const handleRetrySave = useCallback(async () => {
    setRetrying(true);
    await persistAndSave();
    if (mountedRef.current) setRetrying(false);
  }, [persistAndSave]);

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

  // so-sjua: CCPA data export. Kicks the background job via the service, then
  // confirms. In-progress state disables the row so a double-tap can't queue
  // two jobs; errors surface a retryable alert.
  const handleExportData = async () => {
    if (exportingData) return;
    setExportingData(true);
    try {
      await authService.requestDataExport();
      Alert.alert(
        'Preparing your data',
        "We're preparing your data. You'll get an email with a secure download link shortly.",
      );
    } catch (error: any) {
      Alert.alert(
        'Export failed',
        error?.message || 'Could not start your data export. Please try again.',
      );
    } finally {
      setExportingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      // so-5eu1: belt-and-suspenders — drop this user's local profile draft on
      // logout so it can't linger on a shared device (the per-user key already
      // prevents cross-user reads; this also avoids restoring a stale draft if
      // the same user logs back in).
      // so-vpqj: same belt-and-suspenders for the pending SoulPal-name sync.
      if (user?.id) {
        await clearSettingsDraft(user.id);
        await JournalService.clearPendingSoulPalName(user.id);
      }
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

        {/* so-wz41: non-blocking retry affordance when a prior save didn't land */}
        {pendingSaveFailed && (
          <View style={styles.saveFailedBanner}>
            <Text style={styles.saveFailedText}>
              Couldn't save your last changes.
            </Text>
            <Pressable onPress={handleRetrySave} hitSlop={8} disabled={retrying}>
              <Text style={styles.saveFailedRetry}>
                {retrying ? 'Saving...' : 'Retry'}
              </Text>
            </Pressable>
          </View>
        )}

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

        {/* Export My Data (so-sjua — CCPA portability) */}
        <View style={styles.separator} />
        <Pressable
          onPress={handleExportData}
          disabled={exportingData}
          style={styles.resetButton}
          accessibilityRole="button"
          accessibilityLabel="Export my data"
          accessibilityState={{ disabled: exportingData, busy: exportingData }}
        >
          <Text style={styles.resetButtonText}>
            {exportingData ? 'PREPARING…' : 'EXPORT MY DATA'}
          </Text>
        </Pressable>

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

    // so-wz41: failed-save retry banner
    saveFailedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,94,94,0.12)' : 'rgba(255,94,94,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255,94,94,0.4)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    saveFailedText: {
      fontFamily: fonts.outfit.regular,
      fontSize: 13,
      color: ink,
      flex: 1,
    },
    saveFailedRetry: {
      fontFamily: fonts.outfit.semiBold,
      fontSize: 13,
      color: isDark ? '#FF8A8A' : '#C0392B',
      marginLeft: 12,
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
