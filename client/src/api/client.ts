import { User, LeaderboardEntry, RescueEventSummary } from '../types/game.js';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include' // Send and receive HTTP-only cookies
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status);
  }

  return data;
}

export const api = {
  // Auth
  async register(username: string, email: string, password: string): Promise<{ user: User }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  },

  async login(email: string, password: string): Promise<{ user: User }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async logout(): Promise<void> {
    return request('/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },

  // Game Sessions
  async startSession(roundNumber: number = 1): Promise<{ sessionId: string; serverStartTime: string; roundDurationSeconds: number }> {
    return request('/games/sessions', {
      method: 'POST',
      body: JSON.stringify({ roundNumber })
    });
  },

  async finishSession(
    sessionId: string,
    data: {
      roundNumber: number;
      score: number;
      roundScore?: number;
      totalCumulativeSaves?: number;
      successfulSaves: number;
      fastestRescueMs: number | null;
      survivalTimeSeconds: number;
      bestCombo: number;
      events: RescueEventSummary[];
      failureReason?: string;
    }
  ): Promise<{ message: string; result: any; updatedStats: any }> {
    return request(`/games/sessions/${sessionId}/finish`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Leaderboard
  async getLeaderboard(
    category: string = 'score',
    page: number = 1,
    limit: number = 10
  ): Promise<{
    category: string;
    categoryName: string;
    metricUnit: string;
    page: number;
    totalPages: number;
    totalEntries: number;
    entries: LeaderboardEntry[];
    currentUserStanding?: {
      rank: number;
      username: string;
      value: number;
      metricUnit: string;
    };
  }> {
    return request(`/leaderboard?category=${category}&page=${page}&limit=${limit}`);
  },

  // Player Stats
  async getMyStats(): Promise<{ player: any; recentGames: any[] }> {
    return request('/players/me/stats');
  },

  async getPublicProfile(username: string): Promise<{ player: any; recentGames: any[] }> {
    return request(`/players/${encodeURIComponent(username.trim())}`);
  }
};

