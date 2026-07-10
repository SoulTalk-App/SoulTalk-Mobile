import Constants from 'expo-constants';
import axios from 'axios';

import { installAuthInterceptors } from '../utils/authClient';
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
  // Per be_core so-w4mr FYI: shift-specific tend chips. 0..8 items, each
  // ≤200 chars. Null on legacy rows / empty generator output.
  tend_chips?: string[] | null;
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
    tend_chips: w.tend_chips ?? null,
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

    // so-605p: shared single-flight refresh — coalesces concurrent 401s
    // across all service clients onto one /auth/refresh round-trip.
    installAuthInterceptors(this.axiosInstance);
  }

  async list(opts?: {
    statusFilter?: ShiftStatus;
    includeReleased?: boolean;
  }): Promise<Shift[]> {
    const params: Record<string, any> = {};
    if (opts?.statusFilter) params.status_filter = opts.statusFilter;
    if (opts?.includeReleased) params.include_released = true;
    const response = await this.axiosInstance.get('/soul-shifts/', { params });
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
    // so-cgjr: BE doesn't expose GET /soul-shifts/{id} — only GET /. The
    // previous try-on-{id}-then-fallback-to-list pattern always 404'd and
    // the fallback used this.list() which returns normalized Shifts that
    // drop tend_count/last_tend, so detailWire stayed empty and
    // tendCount/lastTend silently defaulted to 0/null on every detail open.
    // Sam (May 16) + Chelsea (May 15) both flagged the tend count stuck at
    // zero after tending; so-4q8e shipped a list-level progress bar but
    // didn't touch this path.
    //
    // Fix: fetch the list raw with all status includes so any shift
    // (active, released, integrated, snoozed) is findable by id AND the
    // wire's tend_count + last_tend survive into the returned ShiftDetail.
    // One request per detail open — heavier than a GET /{id} would be but
    // the lists are O(dozens). [ASK] to be_core to add GET /{id} sent
    // alongside so this can shrink later.
    let wire:
      | (ShiftWire & { tend_count?: number; last_tend?: string | null })
      | undefined;
    try {
      const response = await this.axiosInstance.get('/soul-shifts/', {
        params: {
          include_released: true,
          include_snoozed: true,
          include_integrated: true,
        },
      });
      const data = response.data as {
        shifts: (ShiftWire & { tend_count?: number; last_tend?: string | null })[];
      };
      wire = (data.shifts ?? []).find((s) => s.id === id);
    } catch {
      return null;
    }

    if (!wire) return null;

    const base = normalizeShift(wire);
    const practice =
      base.practice ?? (isMetadataDescription(base.description) ? null : base.description ?? null);

    return {
      ...base,
      practice,
      tendCount: wire.tend_count ?? 0,
      lastTend: wire.last_tend ?? null,
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
   * Un-release a shift back to active status (so-8wj). Thin wrapper over
   * update() — single canonical write path for state transitions.
   */
  async restore(id: string): Promise<Shift> {
    return this.update(id, { status: 'active' });
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
   * Undo a single tend on the given shift (so-zlvm MI-1). Symmetric DELETE for
   * the POST /soul-shifts/{id}/tend response. The BE stage-reverts pct/status
   * from the delete response, which the FE uses to roll back the local snapshot.
   */
  async undoTend(id: string, tendId: string): Promise<Shift> {
    const response = await this.axiosInstance.delete(
      `/soul-shifts/${id}/tends/${tendId}`,
    );
    return normalizeShift(response.data as ShiftWire);
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
   * write — Signals → Shifts. Provenance is carried by `source_signal_ids`
   * (so-72fx SH-M5 dropped the BE-ignored `from_pattern_tag` + `status`).
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
    // so-72fx SH-M5: dropped status:'active' and from_pattern_tag — the BE
    // schema ignores both (new shifts default to active server-side; provenance
    // is carried by source_signal_ids). `input.tag` is retained on the call
    // signature for the caller's own use but is no longer sent.
    const response = await this.axiosInstance.post('/soul-shifts/', {
      title: input.title,
      practice: input.practice,
      cat: input.cat,
      mood: input.mood,
      soulpal: input.soulpal,
      source_signal_ids: input.sourceSignalIds,
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
      // so-72fx SH-M5: dropped status:'active' — BE assigns it server-side.
      source_signal_ids: candidate.source_signal_ids,
      source_sight_ids: candidate.source_sight_ids,
      from_suggestion_id: suggestionId,
      from_candidate_idx: candidateIdx,
      // so-w4mr: round-trip per-candidate tend chips so BE persists them on
      // the resulting shift row (rather than regenerating generic defaults).
      tend_chips: candidate.tend_chips ?? null,
    });
    return normalizeShift(response.data as ShiftWire);
  }
}

export default new SoulShiftsService();
