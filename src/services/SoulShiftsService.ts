import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';
import {
  Shift,
  ShiftDetail,
  ShiftStatus,
  ShiftSuggestionCandidate,
  ShiftSuggestionResponse,
  SoulpalVariant,
} from '../features/soulShifts/types';
import { resolveMood } from '../features/soulShifts/tokens';

export interface ShiftWire {
  id: string;
  title: string;
  cat: string;
  status: ShiftStatus;
  pct: number;
  since: string | null;
  mood: string | null;
  soulpal: SoulpalVariant | null;
  description: string | null;
  // Per [CONTRACT] so-ttk (be_core): additive, nullable until migration 036
  // backfills. Both list and detail responses ship this field.
  practice?: string | null;
  // Per [CONTRACT] so-trc (be_core): additive, nullable. Default GET hides
  // shifts where snoozed_until > now().
  snoozed_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftListResponse {
  shifts: ShiftWire[];
}

export interface CreateShiftBody {
  title: string;
  cat: string;
  description?: string;
  mood?: string;
  soulpal?: SoulpalVariant;
}

export interface PatchShiftBody {
  title?: string;
  cat?: string;
  description?: string;
  status?: ShiftStatus;
  pct?: number;
  mood?: string;
  soulpal?: SoulpalVariant;
  sort_order?: number;
  // Optional reason captured at release time (so-0aa). BE accepts the field
  // but does not persist it on the shift row; safe to send and forget.
  release_reason?: string | null;
  // Per [CONTRACT] so-trc: ISO string sets snooze; explicit null clears it.
  // Pydantic model_fields_set distinguishes "omit" from "set to null"
  // server-side, so the FE must send the field explicitly to clear.
  snoozed_until?: string | null;
}

/**
 * BE currently populates `description` with SoulSight provenance metadata
 * like "From SoulSight 2026-03-07 to 2026-04-06" rather than instructional
 * body. Treat those as null so the title-fallback fires instead of leaking
 * provenance into The Practice card body. (so-1ej)
 */
function isMetadataDescription(desc: string | null | undefined): boolean {
  if (!desc) return true;
  return /^From\s+SoulSight\s+\d{4}-\d{2}-\d{2}/i.test(desc.trim());
}

/**
 * Stage names per so-c0y wire contract; map to the numeric indices the FE
 * uses internally (matches STAGES array order in features/soulShifts/types).
 */
type StageName = 'notice' | 'practice' | 'embody' | 'integrate';
const STAGE_INDEX: Record<StageName, number> = {
  notice: 0,
  practice: 1,
  embody: 2,
  integrate: 3,
};

function normalizeShift(w: ShiftWire): Shift {
  return {
    id: w.id,
    title: w.title,
    cat: w.cat,
    status: w.status,
    pct: w.pct,
    since: w.since,
    mood: resolveMood(w.mood),
    soulpal: (w.soulpal ?? 1) as SoulpalVariant,
    description: w.description,
    practice: w.practice ?? null,
    snoozedUntil: w.snoozed_until ?? null,
  };
}

class SoulShiftsService {
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

  async list(): Promise<Shift[]> {
    const response = await this.axiosInstance.get('/soul-shifts/');
    const data = response.data as ShiftListResponse;
    return (data.shifts ?? []).map(normalizeShift);
  }

  /**
   * Fetch a single shift with detail-modal fields. Tries GET /soul-shifts/{id}
   * first; on 404 / network error, falls back to the list and supplements
   * tend stats with safe defaults. Per [CONTRACT] so-ttk, the wire ships
   * `practice` on both list and detail responses (additive, nullable until
   * backfill 036 runs). Practice resolution order: wire.practice →
   * non-metadata wire.description → null (the modal further falls back to
   * the title for long titles to keep the body slot populated through the
   * rollout window).
   */
  async getDetail(id: string): Promise<ShiftDetail | null> {
    let base: Shift | null = null;
    let detailWire: Partial<ShiftWire & {
      tend_count?: number;
      last_tend?: string | null;
    }> = {};

    try {
      const response = await this.axiosInstance.get(`/soul-shifts/${id}`);
      const wire = response.data as ShiftWire & {
        tend_count?: number;
        last_tend?: string | null;
      };
      base = normalizeShift(wire);
      detailWire = wire;
    } catch {
      const all = await this.list();
      base = all.find((s) => s.id === id) ?? null;
    }

    if (!base) return null;

    const practice =
      base.practice ?? (isMetadataDescription(base.description) ? null : base.description ?? null);

    return {
      ...base,
      practice,
      tendCount: detailWire.tend_count ?? 0,
      lastTend: detailWire.last_tend ?? null,
    };
  }

  /**
   * Log a tend on the given shift. Hits the canonical
   * POST /soul-shifts/{id}/tend (be_core so-c0y, tip 6eed7bb). Backend owns
   * pct increment, stage transitions, and tend_count/last_tend bookkeeping.
   * Returns the canonical post-tend snapshot plus the inserted tend record's
   * id so an Undo affordance can later DELETE it.
   */
  async tend(
    id: string,
    body: { chips: string[]; note?: string },
  ): Promise<{
    shift: Shift;
    tendCount: number;
    lastTend: string | null;
    tendId: string;
    stageAdvanced: boolean;
    prevStage: number;
    nextStage: number;
  }> {
    const response = await this.axiosInstance.post(
      `/soul-shifts/${id}/tend`,
      body,
    );

    const data = response.data as {
      shift: ShiftWire & { tend_count?: number; last_tend?: string | null };
      tend: { id: string; created_at: string };
      stage_advanced: boolean;
      prev_stage: StageName;
      next_stage: StageName;
    };

    return {
      shift: normalizeShift(data.shift),
      tendCount: data.shift.tend_count ?? 0,
      lastTend: data.shift.last_tend ?? null,
      tendId: data.tend.id,
      stageAdvanced: data.stage_advanced,
      prevStage: STAGE_INDEX[data.prev_stage] ?? 0,
      nextStage: STAGE_INDEX[data.next_stage] ?? 0,
    };
  }

  async create(body: CreateShiftBody): Promise<Shift> {
    const response = await this.axiosInstance.post('/soul-shifts/', body);
    return normalizeShift(response.data as ShiftWire);
  }

  async update(id: string, body: PatchShiftBody): Promise<Shift> {
    const response = await this.axiosInstance.patch(`/soul-shifts/${id}`, body);
    return normalizeShift(response.data as ShiftWire);
  }

  /**
   * Archive a shift to the user's Released list (so-0aa). Thin wrapper over
   * update() so there's a single canonical write path for state transitions.
   * Reason is optional; BE accepts but does not currently persist it.
   */
  async release(id: string, reason?: string): Promise<Shift> {
    return this.update(id, {
      status: 'released',
      release_reason: reason?.trim() || null,
    });
  }

  /**
   * Mark a shift as manually integrated (so-wul). Short-circuits the tend
   * ladder regardless of pct. Thin wrapper over update() — single canonical
   * write path. Pct is left where it was; canonical "done" state is the
   * 'integrated' status per the so-bkx enum.
   */
  async markIntegrated(id: string): Promise<Shift> {
    return this.update(id, { status: 'integrated' });
  }

  /**
   * Snooze a shift until the given timestamp, or pass `null` to clear an
   * existing snooze (so-trc). Pydantic on the BE side distinguishes "omit"
   * from "set to null" via model_fields_set, so explicit null is required
   * to clear; the field must always be in the body when this method runs.
   */
  async snooze(id: string, until: Date | null): Promise<Shift> {
    return this.update(id, {
      snoozed_until: until ? until.toISOString() : null,
    });
  }

  /**
   * Fetch the active SoulPal suggestion row for the current user
   * (be_core so-q9w). When the cooldown is open BE may return an empty
   * candidates array — empty is a valid product state, not an error.
   */
  async getSuggestions(): Promise<ShiftSuggestionResponse> {
    const response = await this.axiosInstance.get('/soul-shifts/suggestions');
    const data = response.data as Partial<ShiftSuggestionResponse>;
    return {
      id: data.id ?? null,
      candidates: data.candidates ?? [],
      generated_at: data.generated_at ?? null,
      next_eligible_at: data.next_eligible_at ?? null,
    };
  }

  /**
   * Mark a suggestion as shown (idempotent server-side). Fired once per
   * suggestion id when the SuggestModal mounts with non-empty candidates.
   */
  async markSuggestionShown(suggestionId: string): Promise<void> {
    await this.axiosInstance.post(
      `/soul-shifts/suggestions/${suggestionId}/show`,
    );
  }

  /**
   * Materialize a signal pattern as an active shift (so-axs). Cross-feature
   * write — Signals → Shifts. Provenance fields (`from_pattern_tag` +
   * `source_signal_ids`) attribute the new shift back to the originating
   * pattern; mirrors the so-pjv naming for consistency.
   *
   * [ASK] be_core: confirm `from_pattern_tag` field name; falls back to
   * the same source_*_ids contract that acceptSuggestion uses.
   */
  async createFromSignalPattern(input: {
    tag: string;
    title: string;
    practice: string;
    cat: string;
    mood: string;
    soulpal: SoulpalVariant;
    sourceSignalIds: string[];
  }): Promise<Shift> {
    const response = await this.axiosInstance.post('/soul-shifts/', {
      title: input.title,
      practice: input.practice,
      cat: input.cat,
      mood: input.mood,
      soulpal: input.soulpal,
      status: 'active' as ShiftStatus,
      source_signal_ids: input.sourceSignalIds,
      from_pattern_tag: input.tag,
    });
    return normalizeShift(response.data as ShiftWire);
  }

  /**
   * Materialize the chosen candidate as an active shift (so-pjv). The
   * provenance fields round-trip so BE can attribute the new shift back to
   * the originating signals/sights and mark `chosen_candidate_idx` on the
   * suggestion row.
   */
  async acceptSuggestion(
    suggestionId: string,
    candidateIdx: number,
    candidate: ShiftSuggestionCandidate,
  ): Promise<Shift> {
    const response = await this.axiosInstance.post('/soul-shifts/', {
      title: candidate.title,
      practice: candidate.practice,
      cat: candidate.cat,
      mood: candidate.tone,
      soulpal: candidate.soulpal,
      status: 'active' as ShiftStatus,
      source_signal_ids: candidate.source_signal_ids,
      source_sight_ids: candidate.source_sight_ids,
      from_suggestion_id: suggestionId,
      from_candidate_idx: candidateIdx,
    });
    return normalizeShift(response.data as ShiftWire);
  }
}

export default new SoulShiftsService();
