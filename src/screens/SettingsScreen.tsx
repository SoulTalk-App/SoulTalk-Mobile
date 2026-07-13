import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/AuthService';
import JournalService from '../services/JournalService';
import { useEntitlement } from '../contexts/EntitlementContext';
import {
  openManageSubscription,
  restorePurchases,
  wasUnlocked,
} from '../services/paywall';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { SettingsTrialCard } from '../components/SettingsTrialCard';
import { useAppAlert } from '../components/AppAlertProvider';
import { normalizeError } from '../utils/normalizeError';

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

// so-zrb8: the data-export BE route (so-ruvl) is unmerged, so POST /data-export
// 404s in prod. Hide the button until it lands — flip this to true (and ship
// once so-ruvl is on main) to re-enable. The handler + AuthService.requestDataExport
// are intentionally left intact so re-enabling is a one-line change.
const DATA_EXPORT_ENABLED = false;

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
  // so-1zn0: themed alert replaces native Alert across this surface.
  const { showAlert, showError } = useAppAlert();
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
  // so-fwva: in-flight guard for restore-purchases (sandbox can take a
  // few seconds to round-trip Adapty → App Store).
  const [restoring, setRestoring] = useState(false);
  // so-por9: AI consent status for the Settings control (null = loading).
  const [aiConsentGranted, setAiConsentGranted] = useState<boolean | null>(null);
  const [aiConsentVersion, setAiConsentVersion] = useState<number>(1);
  const [aiConsentBusy, setAiConsentBusy] = useState(false);
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


  // so-por9: load AI consent status on mount so the Settings toggle reflects
  // reality. Silently ignores errors — the row stays in its loading state
  // rather than crashing the screen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await authService.getAiConsentStatus();
        if (!cancelled) {
          setAiConsentGranted(!status.consent_required);
          setAiConsentVersion(status.current_version);
        }
      } catch {
        // Non-fatal; leave as null (loading appearance).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // so-por9 / so-kff3: enable AI consent from Settings. Idempotent on the BE.
  // so-k25b: version is accepted for API compat but not validated on the server.
  const handleGrantAiConsent = useCallback(async () => {
    if (aiConsentBusy || aiConsentGranted) return;
    setAiConsentBusy(true);
    try {
      await authService.recordAiConsent(aiConsentVersion);
      setAiConsentGranted(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to enable AI Insights. Please try again.');
    } finally {
      setAiConsentBusy(false);
    }
  }, [aiConsentBusy, aiConsentGranted, aiConsentVersion, showError]);

  // so-kff3: explicit AI consent opt-out via Settings toggle.
  // Calls POST /auth/ai-consent/disable (so-k25b) which stamps
  // ai_consent_revoked_at — has_consent() then returns false until re-enabled.
  const handleRevokeAiConsent = useCallback(async () => {
    if (aiConsentBusy || !aiConsentGranted) return;
    setAiConsentBusy(true);
    try {
      await authService.revokeAiConsent();
      setAiConsentGranted(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to disable AI Insights. Please try again.');
    } finally {
      setAiConsentBusy(false);
    }
  }, [aiConsentBusy, aiConsentGranted, showError]);

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
      showAlert({
        title: 'Preparing your data',
        message:
          "We're preparing your data. You'll get an email with a secure download link shortly.",
      });
    } catch (error: any) {
      // so-fntk: normalizeError handles BE detail, Pydantic 422,
      // network/timeout, and status-based fallbacks; no raw axios
      // strings leak into the dialog.
      showError(error, { title: 'Export failed' });
    } finally {
      setExportingData(false);
    }
  };

  // so-fwva: pull useEntitlement().refresh so a successful restore
  // immediately re-derives isPro and unblocks the app.
  const { refresh: refreshEntitlement } = useEntitlement();

  const handleRestorePurchases = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const outcome = await restorePurchases();
      if (wasUnlocked(outcome)) {
        await refreshEntitlement();
        showAlert({
          title: 'Restore',
          message: 'Your subscription was restored. Welcome back to SoulTalk Pro.',
        });
        return;
      }
      if (outcome.kind === 'restored') {
        showAlert({
          title: 'Restore',
          message: "We checked, but no active subscription was found on this Apple ID.",
        });
        return;
      }
      // sdk-inactive or error — surface friendly copy.
      showAlert({
        title: 'Restore',
        message:
          outcome.kind === 'error'
            ? outcome.message
            : "We couldn't open the App Store right now. Please try again in a moment.",
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    const ok = await openManageSubscription();
    if (!ok) {
      showAlert({
        title: 'Manage subscription',
        message: "We couldn't open the App Store right now. Please try from your phone's Settings app.",
      });
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
      showAlert({
        title: 'Logout failed',
        message: "We couldn't sign you out. Please try again.",
      });
    }
  };

  const performDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error: any) {
      // so-fntk: friendly fallback via normalizeError. Retry action is
      // preserved. so-1zn0: themed showAlert renders the same Cancel +
      // destructive Retry pair the native Alert had.
      showAlert({
        title: 'Deletion Failed',
        message: normalizeError(error),
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', style: 'destructive', onPress: performDeleteAccount },
        ],
      });
    }
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: 'Delete your SoulTalk account?',
      message:
        'This permanently removes your journal entries, soul signals, soul shifts, soulsights, mood history, and personality test results. This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            showAlert({
              title: 'Are you absolutely sure?',
              message:
                'Your account and all related data will be permanently deleted.',
              buttons: [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete forever', style: 'destructive', onPress: performDeleteAccount },
              ],
            });
          },
        },
      ],
    });
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
        {/* Header — chevron + 'Settings' title (so-wzq9 pattern) */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Feather name="chevron-left" size={28} color={isDarkMode ? '#FFFFFF' : '#3A0E66'} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Signed in as */}
        <Text style={styles.signedInText}>
          Signed in as <Text style={styles.signedInBold}>{user?.first_name || 'User'}</Text>
        </Text>

        {/* Separator — solid, matches all other field-row dividers (so-lvyt #5) */}
        <View style={styles.separator} />

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

        {/* Name (so-lvyt #4: label added for field-row consistency) */}
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={[styles.fieldInput, displayName ? styles.fieldInputActive : null]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Add a name"
          placeholderTextColor={placeholderColor}
        />
        <View style={styles.separator} />

        {/* Username (so-lvyt #4: label added; #3: placeholder copy) */}
        <Text style={styles.fieldLabel}>Username</Text>
        <View style={styles.usernameRow}>
          <TextInput
            style={[styles.fieldInput, { flex: 1, opacity: usernameIsLocked ? 0.6 : 1 }]}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="Add a username"
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

        {/* Pronouns — empty state shows greyed placeholder (so-lvyt #1) */}
        <Text style={styles.fieldLabel}>Pronouns</Text>
        <Pressable onPress={() => setShowPronounPicker(true)}>
          <Text style={[styles.pronounText, pronoun ? styles.pronounTextActive : null]}>
            {pronoun || 'Add pronouns'}
          </Text>
        </Pressable>
        <View style={styles.separator} />

        {/* so-kff3: AI Insights ON/OFF toggle. ON (default) = consent granted;
            OFF = user explicitly opted out via POST /auth/ai-consent/disable.
            so-k25b opt-out model: status_for() returns consent_required=false
            for everyone by default — new users start with toggle ON.
            so-lvyt #6: replaced ambiguous pill with a Switch for clear on/off UX.
            so-lvyt #2: Push Notification 'Coming Soon' row removed. */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>AI Insights</Text>
          <Switch
            value={aiConsentGranted === true}
            onValueChange={(val) =>
              val ? handleGrantAiConsent() : handleRevokeAiConsent()
            }
            disabled={aiConsentBusy || aiConsentGranted === null}
            trackColor={{
              false: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(58,14,102,0.12)',
              true: colors.primary,
            }}
            thumbColor={colors.white}
            ios_backgroundColor={
              isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(58,14,102,0.12)'
            }
            accessibilityLabel="AI Insights"
            style={(aiConsentBusy || aiConsentGranted === null) ? { opacity: 0.6 } : undefined}
          />
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

        {/* so-fwva: Subscription affordances. Restore is required by
            Apple review (any IAP app must allow restoring purchases on
            a new device); Manage Subscription is the deep link into
            the Apple-managed centre (Adapty has no Customer Center).
            Both live above the data/account rows so they're easy to
            find when the user lands on Settings from the paywall
            gate's "Settings" carve-out. */}
        <View style={styles.separator} />
        {/* so-kgs7: trial-status card — visible only during active trial.
            Self-contained: reads isPro/daysLeft from useEntitlement,
            presents paywall on tap, refreshes on unlock. */}
        <SettingsTrialCard />
        <Pressable
          onPress={handleRestorePurchases}
          disabled={restoring}
          style={styles.resetButton}
          accessibilityRole="button"
          accessibilityLabel="Restore Purchases"
          accessibilityState={{ disabled: restoring, busy: restoring }}
        >
          <Text style={styles.resetButtonText}>
            {restoring ? 'RESTORING…' : 'RESTORE PURCHASES'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleManageSubscription}
          style={styles.resetButton}
          accessibilityRole="button"
          accessibilityLabel="Manage Subscription on App Store"
        >
          <Text style={styles.resetButtonText}>MANAGE SUBSCRIPTION</Text>
        </Pressable>

        {/* Export My Data (so-sjua — CCPA portability).
            so-zrb8: hidden behind DATA_EXPORT_ENABLED until the BE export route
            (so-ruvl) merges — it 404s in prod otherwise. */}
        {DATA_EXPORT_ENABLED && (
          <>
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
          </>
        )}

        {/* Destructive actions — grouped, no float gap (so-lvyt #7) */}
        <View style={styles.separator} />
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </Pressable>
        <Pressable onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>DELETE ACCOUNT</Text>
        </Pressable>

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
    // so-lvyt #8: 'Settings' title on chevron row (so-wzq9 pattern)
    headerTitle: {
      fontFamily: fonts.edensor.bold,
      fontSize: 24,
      color: ink,
      flex: 1,
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
    // so-lvyt #1: active (set) pronoun uses full ink; placeholder stays inkSub
    pronounTextActive: {
      color: ink,
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

    // Destructive link row — so-lvyt #7: aligned treatment.
    // Both underlined; DELETE ACCOUNT uses semiBold to signal permanence.
    logoutText: {
      fontFamily: fonts.outfit.regular,
      fontSize: 15,
      lineHeight: 46,
      color: colors.error,
      textDecorationLine: 'underline',
    },
    deleteAccountText: {
      fontFamily: fonts.outfit.semiBold,
      fontSize: 15,
      lineHeight: 46,
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
