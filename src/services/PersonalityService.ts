import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';

import { TestType } from '../data/personalityTests/types';

export interface PersonalityTestResult {
  id: string;
  test_type: TestType;
  version: string;
  answers: Record<string, number>;
  scores: Record<string, number>;
  dominant_type: string;   // "Visionary" or "Visionary+Analytical" on tie
  is_tie: boolean;
  completed_at: string;
}

export interface SubmitPayload {
  test_type: TestType;
  version: string;
  answers: Record<string, number>;
}

class PersonalityService {
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

  async submit(payload: SubmitPayload): Promise<PersonalityTestResult> {
    const response = await this.axiosInstance.post('/personality/submit', payload);
    return response.data;
  }

  async getLatest(testType: TestType): Promise<PersonalityTestResult | null> {
    const response = await this.axiosInstance.get('/personality/latest', {
      params: { test_type: testType },
    });
    return response.data ?? null;
  }

  async getHistory(testType?: TestType): Promise<PersonalityTestResult[]> {
    const response = await this.axiosInstance.get('/personality/history', {
      params: testType ? { test_type: testType } : undefined,
    });
    return response.data;
  }

  async getById(resultId: string): Promise<PersonalityTestResult> {
    const response = await this.axiosInstance.get(`/personality/result/${resultId}`);
    return response.data;
  }
}

export default new PersonalityService();
