import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';

export interface EligibilityResponse {
  eligible: boolean;
  total_filled: number;
  soulsights_used: number;
  entry_count: number;
  active_days: number;
  window_start: string | null;
  window_end: string | null;
  reason: string | null;
}

export interface GenerateResponse {
  soulsight_id: string;
  status: string;
  window_start: string;
  window_end: string;
  entry_count: number;
  active_days: number;
}

export interface SoulsightSummary {
  id: string;
  window_start: string;
  window_end: string;
  status: string;
  entry_count: number;
  active_days: number;
  created_at: string | null;
}

export interface SoulsightListResponse {
  soulsights: SoulsightSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface AggregateStats {
  emotion_distribution: Record<string, number>;
  avg_emotion_intensity: number | null;
  nervous_system_distribution: Record<string, number>;
  topic_frequency: Record<string, number>;
  coping_frequency: Record<string, number>;
  self_talk_distribution: Record<string, number>;
  cognitive_distortion_frequency: Record<string, number>;
  cognitive_loop_frequency: Record<string, number>;
  insight_overload_risk_distribution: Record<string, number>;
  entry_count: number;
}

export interface SoulsightDetail {
  id: string;
  window_start: string;
  window_end: string;
  status: string;
  content: string | null;
  aggregate_stats: AggregateStats | null;
  entry_count: number;
  active_days: number;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StatusResponse {
  id: string;
  status: string;
  error_message: string | null;
}

class SoulSightService {
  private axiosInstance;

  constructor() {
    const apiConfig = Constants.expoConfig?.extra?.apiConfig || {
      baseUrl: 'https://soultalkapp.com/api',
    };

    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseUrl,
      timeout: 10000,
    });

    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await SecureStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

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

  async checkEligibility(): Promise<EligibilityResponse> {
    const response = await this.axiosInstance.get('/soulsights/eligibility');
    return response.data;
  }

  async generate(): Promise<GenerateResponse> {
    const response = await this.axiosInstance.post('/soulsights/generate');
    return response.data;
  }

  async list(limit: number = 10, offset: number = 0): Promise<SoulsightListResponse> {
    const response = await this.axiosInstance.get('/soulsights', {
      params: { limit, offset },
    });
    return response.data;
  }

  async getLatest(): Promise<SoulsightDetail> {
    const response = await this.axiosInstance.get('/soulsights/latest');
    return response.data;
  }

  async getById(id: string): Promise<SoulsightDetail> {
    const response = await this.axiosInstance.get(`/soulsights/${id}`);
    return response.data;
  }

  async getStatus(id: string): Promise<StatusResponse> {
    const response = await this.axiosInstance.get(`/soulsights/${id}/status`);
    return response.data;
  }
}

export default new SoulSightService();
