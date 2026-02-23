import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';
import { File } from 'expo-file-system';

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

export interface JournalEntry {
  id: string;
  raw_text: string;
  mood: Mood | null;
  emotion_primary: string | null;
  emotion_secondary: string | null;
  emotion_intensity: number | null;
  nervous_system_state: string | null;
  topics: string[] | null;
  coping_mechanisms: string[] | null;
  self_talk_style: string | null;
  time_focus: string | null;
  ai_response: string | null;
  is_ai_processed: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
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
  is_ai_processed?: boolean;
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

    // Request interceptor — attach auth token
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await SecureStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor — handle 401 with token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = await SecureStorage.getItem('refresh_token');
            if (!refreshToken) return Promise.reject(error);

            const resp = await axios.post(
              `${this.axiosInstance.defaults.baseURL}/auth/refresh`,
              { refresh_token: refreshToken },
            );
            const { access_token, refresh_token: newRefresh } = resp.data;
            await SecureStorage.setItem('access_token', access_token);
            await SecureStorage.setItem('refresh_token', newRefresh);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.axiosInstance.request(originalRequest);
          } catch {
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      },
    );
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

  async getPrompts(): Promise<string[]> {
    const response = await this.axiosInstance.get('/prompts/');
    return response.data.prompts;
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
