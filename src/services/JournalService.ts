import Constants from 'expo-constants';
import axios from 'axios';
import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { installAuthInterceptors } from '../utils/authClient';

// so-v6pr: when the post-naming BE sync of the SoulPal name fails, we stash
// the pending name so the next app open can retry it — avoids a silent,
// permanent desync between the user's local SoulPal name and their AI profile.
//
// so-vpqj: the key is scoped PER USER (mirrors the so-5eu1 settings-draft
// pattern). A global key let user A's pending name sync onto user B's account
// on a shared device (cross-user PII bleed). Always thread user.id.
const PENDING_SOULPAL_NAME_KEY_PREFIX = '@soultalk_pending_soulpal_name_sync';
const pendingSoulPalNameKey = (userId: string) =>
  `${PENDING_SOULPAL_NAME_KEY_PREFIX}:${userId}`;

// so-vpqj: cap retries so a permanently-unsyncable name doesn't retry forever.
const MAX_SOULPAL_NAME_SYNC_ATTEMPTS = 5;

interface PendingSoulPalNameSync {
  name: string;
  attempts: number;
}

export type Mood =
  | 'Normal'
  | 'Happy'
  | 'Mad'
  | 'Sad'
  | 'Chill'
  | 'Vibing'
  | 'Lost'
  | 'Tired'
  | 'Sexy'
  | 'Fire';

export interface TagsSummary {
  emotion_primary: string | null;
  emotion_secondary: string | null;
  emotion_intensity: number | null;
  nervous_system_state: string | null;
  topics: string[] | null;
  coping_mechanisms: string[] | null;
  self_talk_style: string | null;
  crisis_flag: boolean;
}

export interface AIResponseSummary {
  text: string | null;
  mode: string | null;
}

export interface JournalEntry {
  id: string;
  raw_text: string;
  mood: Mood | null;
  // so-por9: 'skipped' is terminal — BE emits it when AI consent is absent.
  // Treat like 'failed' for poll termination but render a calm "insights off"
  // state rather than an error.
  ai_processing_status: 'none' | 'pending' | 'tagged' | 'complete' | 'failed' | 'skipped';
  edit_count: number;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  tags: TagsSummary | null;
  ai_response: AIResponseSummary | null;
}

export interface JournalListResponse {
  entries: JournalEntry[];
  total: number;
  page: number;
  per_page: number;
}

export interface ListEntriesParams {
  year?: number;
  month?: number;
  mood?: string;
  ai_processing_status?: string;
  is_draft?: boolean;
  page?: number;
  per_page?: number;
}

export interface StreakResponse {
  current_streak: number;
  /** Received from BE but not currently rendered on the FE (so-a1lb MI-3). */
  longest_streak: number;
  /** Received from BE but not currently rendered on the FE (so-a1lb MI-3). */
  last_journal_date: string | null;
}

export interface SoulBarResponse {
  points: number;
  /** Received from BE but not currently rendered on the FE (so-a1lb MI-3).
   *  HomeScreen derives fullness from points >= SOUL_BAR_SEGMENTS instead. */
  total_filled: number;
  is_full: boolean;
}

export interface DailyMoodResponse {
  date: string;
  mood_word: string | null;
  // so-3yb: PUT returns true on the first mood save of the day; GET always
  // returns false. Used by HomeScreen only to pick the toast copy (first-save
  // vs update). so-zrb8: this does NOT charge the SoulBar — the bar is
  // journal-entry-driven, not mood-driven (the old "charges SoulBar" note was
  // wrong).
  is_first_fill: boolean;
}

class JournalService {
  private axiosInstance;

  constructor() {
    const apiConfig = Constants.expoConfig?.extra?.apiConfig || {
      baseUrl: 'https://soultalkapp.com/api',
    };

    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseUrl,
      timeout: 10000,
    });

    // so-605p: shared single-flight refresh — coalesces concurrent 401s
    // across all service clients onto one /auth/refresh round-trip.
    installAuthInterceptors(this.axiosInstance);
  }

  async createEntry(
    rawText: string,
    mood?: Mood,
    isDraft: boolean = false,
  ): Promise<JournalEntry> {
    const body: { raw_text: string; mood?: Mood; is_draft: boolean } = {
      raw_text: rawText,
      is_draft: isDraft,
    };
    if (mood) body.mood = mood;
    const response = await this.axiosInstance.post('/journal/', body);
    return response.data;
  }

  async listEntries(params?: ListEntriesParams): Promise<JournalListResponse> {
    const response = await this.axiosInstance.get('/journal/', { params });
    return response.data;
  }

  async getEntry(id: string): Promise<JournalEntry> {
    const response = await this.axiosInstance.get(`/journal/${id}`);
    return response.data;
  }

  async updateEntry(
    id: string,
    data: { raw_text?: string; mood?: Mood; is_draft?: boolean },
  ): Promise<JournalEntry> {
    const response = await this.axiosInstance.put(`/journal/${id}`, data);
    return response.data;
  }

  async deleteEntry(id: string): Promise<void> {
    await this.axiosInstance.delete(`/journal/${id}`);
  }

  async getStreak(): Promise<StreakResponse> {
    const response = await this.axiosInstance.get('/streak/');
    return response.data;
  }

  async getSoulBar(): Promise<SoulBarResponse> {
    const response = await this.axiosInstance.get('/soul-bar/');
    return response.data;
  }

  async getTodayMood(): Promise<DailyMoodResponse> {
    const response = await this.axiosInstance.get('/mood/today');
    return response.data;
  }

  async upsertTodayMood(moodWord: string): Promise<DailyMoodResponse> {
    const response = await this.axiosInstance.put('/mood/today', { mood_word: moodWord });
    return response.data;
  }

  async getCrisisResources(): Promise<{
    country_code: string;
    resources: Array<{
      id: string;
      country_code: string;
      country_name: string;
      resource_name: string;
      contact_type: string;
      contact_value: string;
      description: string;
      display_order: number;
    }>;
  }> {
    const response = await this.axiosInstance.get('/crisis-resources');
    return response.data;
  }

  async getAIPreferences(): Promise<{
    main_focus: string | null;
    tone_preference: string;
    spiritual_metadata: Record<string, any> | null;
    soulpal_name: string | null;
  }> {
    const response = await this.axiosInstance.get('/profile/ai-preferences/');
    return response.data;
  }

  async updateAIPreferences(data: {
    main_focus?: string | null;
    tone_preference?: string;
    spiritual_metadata?: Record<string, any> | null;
    soulpal_name?: string | null;
  }): Promise<void> {
    await this.axiosInstance.put('/profile/ai-preferences/', data);
  }

  // so-v6pr: best-effort sync of the chosen SoulPal name to the BE AI profile.
  // Callers fire-and-forget this right after navigating so the onboarding
  // finishing move stays instant. On a retryable failure we persist the name
  // (per-user) so flushPendingSoulPalName() can retry on the next app open.
  // so-vpqj: requires userId for the per-user key; no-ops without it (there is
  // no user-safe key to write, and syncing to "whoever is logged in" is the
  // bleed we are preventing).
  async syncSoulPalName(name: string, userId: string): Promise<void> {
    if (!userId) return;
    await this.trySoulPalNameSync(userId, { name, attempts: 0 });
  }

  // so-v6pr/so-vpqj: retry a previously-failed SoulPal-name sync for this user.
  // Safe to call on every app open — no-ops when nothing is pending.
  async flushPendingSoulPalName(userId: string): Promise<void> {
    if (!userId) return;
    let pending: PendingSoulPalNameSync | null = null;
    try {
      const raw = await AsyncStorage.getItem(pendingSoulPalNameKey(userId));
      if (raw) pending = JSON.parse(raw);
    } catch {
      return;
    }
    if (!pending?.name) return;
    await this.trySoulPalNameSync(userId, pending);
  }

  // so-vpqj: drop this user's pending name (e.g. on logout) so it can't linger
  // on a shared device.
  async clearPendingSoulPalName(userId: string): Promise<void> {
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(pendingSoulPalNameKey(userId));
    } catch {
      // best-effort
    }
  }

  // so-vpqj: shared sync attempt. On success clears the pending key. On a
  // permanent client error (4xx except 429) it gives up immediately — retrying
  // a 400 bad-name / 401 won't succeed. Transient errors (network / 5xx / 429)
  // are re-queued until MAX_SOULPAL_NAME_SYNC_ATTEMPTS, then dropped.
  private async trySoulPalNameSync(
    userId: string,
    pending: PendingSoulPalNameSync,
  ): Promise<void> {
    const key = pendingSoulPalNameKey(userId);
    try {
      await this.updateAIPreferences({ soulpal_name: pending.name });
      await AsyncStorage.removeItem(key);
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      const isPermanent4xx =
        typeof status === 'number' && status >= 400 && status < 500 && status !== 429;
      if (isPermanent4xx) {
        console.warn(
          `[SoulPalName] BE sync failed (${status}) — permanent, not retrying:`,
          err?.message,
        );
        await AsyncStorage.removeItem(key).catch(() => {});
        return;
      }
      const attempts = pending.attempts + 1;
      if (attempts >= MAX_SOULPAL_NAME_SYNC_ATTEMPTS) {
        console.warn(
          `[SoulPalName] BE sync gave up after ${attempts} attempts:`,
          err?.message,
        );
        await AsyncStorage.removeItem(key).catch(() => {});
        return;
      }
      console.warn(
        `[SoulPalName] BE sync failed (attempt ${attempts}), queued for retry:`,
        err?.message,
      );
      try {
        await AsyncStorage.setItem(key, JSON.stringify({ name: pending.name, attempts }));
      } catch {
        // If even the local stash fails there is nothing more we can do here.
      }
    }
  }

  async getTodayAffirmation(): Promise<{ affirmation_text: string; date_key: string; is_revealed_allowed: boolean; source: string; next_reset_time: string }> {
    // so-lt40 M-1: override the shared 10s client timeout for this call only.
    // The BE was explicitly tuned for patience (so-liyt AM-m3: loser-poll raised
    // 15s→45s because Sonnet p99 exceeds 15s); a 10s client timeout makes the
    // p99 first-reveal always error-toast while the winner finishes. 60s gives
    // the LLM comfortable headroom without impacting any other endpoint.
    const response = await this.axiosInstance.get('/affirmation-mirror/today', {
      timeout: 60000,
    });
    return response.data;
  }

  // so-atde: history feed for the new list-first AffirmationMirror hub.
  // BE [CONTRACT] confirmed by be_core: GET /api/affirmation-mirror/history,
  // ORDER BY generated_at DESC, includes today's row at index 0 once /today
  // has been called. `source` is the raw column ("ai" for all current rows).
  async listAffirmations(limit: number = 30, offset: number = 0): Promise<{
    items: { date_key: string; affirmation_text: string; source: string; generated_at: string }[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const response = await this.axiosInstance.get('/affirmation-mirror/history', {
      params: { limit, offset },
    });
    return response.data;
  }

  async transcribeAudio(audioUri: string): Promise<{ text: string; duration_seconds: number | null }> {
    const file = new File(audioUri);
    if (!file.exists) throw new Error('Audio file not found');

    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      name: filename,
      type: 'audio/m4a',
    } as any);

    const response = await this.axiosInstance.post('/transcription/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  }
}

export default new JournalService();
