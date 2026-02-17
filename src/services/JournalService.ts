import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';

export type Mood = 'Normal' | 'Happy' | 'Mad' | 'Sad';

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
  page?: number;
  per_page?: number;
}

class JournalService {
  private axiosInstance;

  constructor() {
    const apiConfig = Constants.expoConfig?.extra?.apiConfig || {
      baseUrl: 'http://localhost:8000/api',
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

  async createEntry(rawText: string, mood?: Mood): Promise<JournalEntry> {
    const body: { raw_text: string; mood?: Mood } = { raw_text: rawText };
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
    data: { raw_text?: string; mood?: Mood },
  ): Promise<JournalEntry> {
    const response = await this.axiosInstance.put(`/journal/${id}`, data);
    return response.data;
  }

  async deleteEntry(id: string): Promise<void> {
    await this.axiosInstance.delete(`/journal/${id}`);
  }
}

export default new JournalService();
