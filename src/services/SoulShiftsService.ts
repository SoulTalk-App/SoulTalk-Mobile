import SecureStorage from '../utils/SecureStorage';
import Constants from 'expo-constants';
import axios from 'axios';
import { Shift, ShiftStatus, SoulpalVariant } from '../features/soulShifts/types';
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
}

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

  async create(body: CreateShiftBody): Promise<Shift> {
    const response = await this.axiosInstance.post('/soul-shifts/', body);
    return normalizeShift(response.data as ShiftWire);
  }

  async update(id: string, body: PatchShiftBody): Promise<Shift> {
    const response = await this.axiosInstance.patch(`/soul-shifts/${id}`, body);
    return normalizeShift(response.data as ShiftWire);
  }
}

export default new SoulShiftsService();
