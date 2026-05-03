import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';
import {
  MuteDuration,
  ResonanceVote,
  Signal,
  SignalDetail,
  SignalKind,
  SignalPatternAggregate,
  SignalSource,
  SoulpalVariant,
} from '../features/soulSignals/types';
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
  // be_core so-c9f: id of the non-released shift fed by this signal, or null.
  linked_shift_id?: string | null;
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

function normalizeSignal(w: SignalWire & {
  is_saved?: boolean;
  muted_until?: string | null;
  muted_forever?: boolean;
}): Signal {
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
    isSaved: w.is_saved ?? false,
    muteUntil: w.muted_until ?? null,
    mutedForever: w.muted_forever ?? false,
    linkedShiftId: w.linked_shift_id ?? null,
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

  async list(opts?: {
    saved?: boolean;
    includeMuted?: boolean;
  }): Promise<Signal[]> {
    const params: Record<string, any> = {};
    if (opts?.saved) params.saved = true;
    if (opts?.includeMuted) params.include_muted = true;
    const response = await this.axiosInstance.get('/soul-signals/', { params });
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

  /**
   * Detail-modal projection (be_core so-711). Sources, save state, and
   * resonance vote come back per-user; pre-existing signals (NULL sources)
   * surface as an empty array.
   */
  async getDetail(id: string): Promise<SignalDetail> {
    const response = await this.axiosInstance.get(`/soul-signals/${id}`);
    const wire = response.data as SignalWire & {
      sources?: { date_label: string; excerpt: string; entry_id?: string }[];
      is_saved?: boolean;
      resonance?: ResonanceVote | null;
      muted_until?: string | null;
      muted_forever?: boolean;
    };
    const base = normalizeSignal(wire);
    const sources: SignalSource[] = (wire.sources ?? []).map((s) => ({
      date: s.date_label,
      excerpt: s.excerpt,
      entry_id: s.entry_id,
    }));
    return {
      ...base,
      sources,
      isSaved: wire.is_saved ?? false,
      muteUntil: wire.muted_until ?? null,
      mutedForever: wire.muted_forever ?? false,
    };
  }

  /**
   * Record a resonance vote ("yes" | "not_quite"). Repeated calls upsert
   * — no need to read the current value first.
   */
  async setResonance(id: string, value: ResonanceVote): Promise<Signal> {
    const response = await this.axiosInstance.post(
      `/soul-signals/${id}/resonance`,
      { value },
    );
    const data = response.data as { signal: SignalWire };
    return normalizeSignal(data.signal);
  }

  /**
   * Toggle save state (be_core so-711). POST adds; DELETE removes. Both
   * idempotent. Returns the refreshed signal so is_saved propagates.
   */
  async setSaved(id: string, saved: boolean): Promise<Signal> {
    const response = saved
      ? await this.axiosInstance.post(`/soul-signals/${id}/save`)
      : await this.axiosInstance.delete(`/soul-signals/${id}/save`);
    const data = response.data as { signal: SignalWire };
    return normalizeSignal(data.signal);
  }

  /**
   * Mute a signal thread for the chosen duration (be_core so-otk).
   * 'week'/'month' set muted_until = now()+7/30 days; 'forever' sets
   * muted_forever = true (server-side, opaque to FE).
   */
  async muteSignal(id: string, duration: MuteDuration): Promise<Signal> {
    const response = await this.axiosInstance.post(
      `/soul-signals/${id}/mute`,
      { duration },
    );
    const data = response.data as { signal: SignalWire };
    return normalizeSignal(data.signal);
  }

  /**
   * Lift a mute (be_core so-otk DELETE companion). Idempotent.
   */
  async unmuteSignal(id: string): Promise<Signal> {
    const response = await this.axiosInstance.delete(
      `/soul-signals/${id}/mute`,
    );
    const data = response.data as { signal: SignalWire };
    return normalizeSignal(data.signal);
  }

  /**
   * Pattern-level aggregation across all of the user's signals tagged
   * `tag` (be_core so-ris). Headline + summary are server-formatted; the
   * noticings list rides through normalizeSignal so downstream consumers
   * see the same Signal shape as the hub list.
   */
  async getPatternByTag(tag: string): Promise<SignalPatternAggregate> {
    const response = await this.axiosInstance.get(
      `/soul-signals/patterns/${encodeURIComponent(tag)}`,
    );
    const data = response.data as Omit<SignalPatternAggregate, 'noticings'> & {
      noticings: SignalWire[];
    };
    return {
      ...data,
      noticings: (data.noticings ?? []).map(normalizeSignal),
    };
  }
}

export default new SoulSignalsService();
