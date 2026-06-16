import Constants from 'expo-constants';
import axios from 'axios';
import { File } from 'expo-file-system';
import { installAuthInterceptors } from '../utils/authClient';

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
  ai_processing_status: 'none' | 'pending' | 'tagged' | 'complete' | 'failed';
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
  longest_streak: number;
  last_journal_date: string | null;
}

export interface SoulBarResponse {
  points: number;
  total_filled: number;
  is_full: boolean;
}

export interface DailyMoodResponse {
  date: string;
  mood_word: string | null;
  // so-3yb: PUT returns true on the first save of the day (charges SoulBar);
  // GET always returns false. Used by HomeScreen to differentiate the toast.
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

  async getTodayAffirmation(): Promise<{ affirmation_text: string; date_key: string; is_revealed_allowed: boolean; source: string; next_reset_time: string }> {
    const response = await this.axiosInstance.get('/affirmation-mirror/today');
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

    // so-tpwh #8: don't set Content-Type manually — axios/RN's FormData
    // adapter generates the multipart boundary at send-time. A hand-set
    // 'multipart/form-data' header without a boundary parameter is
    // technically malformed and some BE multipart parsers reject it.
    const response = await this.axiosInstance.post('/transcription/', formData, {
      timeout: 60000,
    });
    return response.data;
  }
}

export default new JournalService();
