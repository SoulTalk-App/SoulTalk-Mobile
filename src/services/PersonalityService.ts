import Constants from 'expo-constants';
import axios from 'axios';

import { installAuthInterceptors } from '../utils/authClient';
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

    // so-605p: shared single-flight refresh — coalesces concurrent 401s
    // across all service clients onto one /auth/refresh round-trip.
    installAuthInterceptors(this.axiosInstance);
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
