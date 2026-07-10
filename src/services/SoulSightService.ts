import Constants from 'expo-constants';
import axios from 'axios';

import { installAuthInterceptors } from '../utils/authClient';

export interface EligibilityResponse {
  eligible: boolean;
  // so-9t3d MI-3: present when the user has enough entries but AI consent is
  // disabled (eligible:false, consent_required:true). The FE should offer a
  // "Enable AI Insights in Settings" CTA instead of a generic locked state.
  consent_required?: boolean;
  total_filled: number;
  // so-9t3d MI-5: soulsights_used is dead on the FE; kept in type for BE
  // compatibility but should not be rendered or relied upon.
  soulsights_used?: number;
  entry_count: number;
  active_days: number;
  window_start: string | null;
  window_end: string | null;
  // so-y818: relative label provided by BE when window_start/end are present.
  window_label?: string | null;
  reason: string | null;
  points?: number;
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
  // Optional fields per [ASK] to be_core (so-ry4 companion). FE renders
  // safe fallbacks until the list endpoint surfaces them. Bead spec:
  // id, title, headline, soulpal, window_start, window_end, status,
  // content_preview.
  title?: string | null;
  headline?: string | null;
  soulpal?: 1 | 2 | 3 | 4 | 5 | null;
  content_preview?: string | null;
  // so-y818: relative label ("past week", "this month") from BE.
  window_label?: string | null;
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
  title?: string | null;
  reading_paragraphs?: string[] | null;
  pull_quote?: { text: string; tag: string } | null;
  signals_summary?: string[] | null;
  soulpal_variant?: 1 | 2 | 3 | 4 | 5 | null;
  hero_hint?: string | null;
  archived_at?: string | null;
  // so-y818: relative label ("past week", "this month") from BE.
  window_label?: string | null;
}

export interface StatusResponse {
  id: string;
  status: string;
  error_message: string | null;
  // so-9t3d M-2b: present when arq retry is in progress. Only show terminal
  // "Generation Failed" UI when final===true; keep polling while final===false.
  final?: boolean;
  retries_remaining?: number | null;
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

    // so-605p: shared single-flight refresh — coalesces concurrent 401s
    // across all service clients onto one /auth/refresh round-trip.
    installAuthInterceptors(this.axiosInstance);
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
    // Trailing slash required (so-rnk): FastAPI's auto-redirect for the
    // collection route returns a 307 with an http:// Location because
    // uvicorn isn't honoring X-Forwarded-Proto. Hitting the canonical
    // path directly skips the redirect entirely. The infra-side fix is
    // tracked in so-6dq.
    const response = await this.axiosInstance.get('/soulsights/', {
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

  async setArchived(id: string, archived: boolean): Promise<SoulsightDetail> {
    const response = await this.axiosInstance.patch(`/soulsights/${id}`, { archived });
    return response.data;
  }
}

export default new SoulSightService();
