import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';
import { Signal, SignalKind, SoulpalVariant } from '../features/soulSignals/types';
import { resolveTone } from '../features/soulSignals/tokens';

export interface SignalWire {
  id: string;
  kind: SignalKind;
  strength: number | null;
  tag: string | null;
  tone: string | null;
  soulpal: SoulpalVariant | null;
  when: string | null;
  headline: string;
  detail: string;
  quotes: string[];
  fedSight: string | null;
  source_type?: string;
  signal_text?: string;
  category?: string;
  context?: string | null;
  status?: 'new' | 'seen' | 'pinned' | 'archived';
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SignalListResponse {
  signals: SignalWire[];
  period?: Record<string, unknown>;
}

export interface CreateSignalBody {
  signal_text: string;
  category?: string;
  context?: string;
  kind?: SignalKind;
  tag?: string;
  tone?: string;
  soulpal?: SoulpalVariant;
  headline?: string;
  detail?: string;
  quotes?: string[];
  strength?: number;
}

export interface PatchSignalBody {
  signal_text?: string;
  status?: 'new' | 'seen' | 'pinned' | 'archived';
  sort_order?: number;
  headline?: string;
  detail?: string;
  quotes?: string[];
  strength?: number;
  soulpal?: SoulpalVariant;
}

function normalizeSignal(w: SignalWire): Signal {
  return {
    id: w.id,
    kind: w.kind,
    strength: w.strength ?? undefined,
    tag: w.tag ?? undefined,
    tone: resolveTone(w.tone),
    soulpal: (w.soulpal ?? 1) as SoulpalVariant,
    when: w.when ?? 'recently',
    headline: w.headline,
    detail: w.detail,
    quotes: w.quotes ?? [],
    fedSight: w.fedSight,
  };
}

class SoulSignalsService {
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

  async list(): Promise<Signal[]> {
    const response = await this.axiosInstance.get('/soul-signals/');
    const data = response.data as SignalListResponse;
    return (data.signals ?? []).map(normalizeSignal);
  }

  async create(body: CreateSignalBody): Promise<Signal> {
    const response = await this.axiosInstance.post('/soul-signals/', body);
    return normalizeSignal(response.data as SignalWire);
  }

  async update(id: string, body: PatchSignalBody): Promise<Signal> {
    const response = await this.axiosInstance.patch(`/soul-signals/${id}`, body);
    return normalizeSignal(response.data as SignalWire);
  }
}

export default new SoulSignalsService();
