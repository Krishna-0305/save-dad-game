export type GameState =
  | 'MENU'
  | 'AUTH'
  | 'STORY'
  | 'PLAYING'
  | 'RESCUING'
  | 'EVENT_TRANSITION'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'ROUND_COMPLETE';

export interface RescueEventSummary {
  eventIndex: number;
  reactionTimeMs: number;
  pointsAwarded: number;
  comboAtRescue: number;
  timestampOffsetMs: number;
}

export interface GameStats {
  score: number;
  successfulSaves: number;
  fastestRescueMs: number | null;
  survivalTimeSeconds: number;
  currentCombo: number;
  bestCombo: number;
  remainingTime: number;
  roundNumber: number;
}

export interface UserStats {
  highScore: number;
  mostSaves: number;
  fastestRescueMs: number | null;
  totalSaves: number;
  bestCombo: number;
  totalRoundsPlayed: number;
  highestRound: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  stats: UserStats;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  metricValue: number;
  metricUnit: string;
  stats: UserStats;
  isCurrentUser: boolean;
  achievedAt: string;
}

export interface DangerWarning {
  active: boolean;
  intensity: number; // 0 to 1
  motorcycleDirection: 'left' | 'right';
  distanceToDad: number;
  warningTimeRemainingSec?: number;
}

export interface DebugMetrics {
  fps: number;
  activeMotorcycles: number;
  distanceSonDad: number;
  distanceBikeDad: number;
  rescueRadius: number;
  difficultyLevel: number;
  bikeSpeed: number;
  roundNumber: number;
  patternName: string;
}

export interface RoundDifficultyConfig {
  round: number;
  speedName: string;
  densityName: string;
  motorcycleSpeed: number;        // Units/sec
  spawnIntervalSec: number;        // Gap between danger events
  rescueWindowSec: number;         // Time player has to pull Dad to safety
  warningDurationSec: number;      // Horn / visual cue lead time before bike reaches crossing
  trafficCount: number;            // How many bikes appear in wave
  pattern: 'SINGLE_CENTER' | 'ALTERNATING_LANES' | 'VARIABLE_SPEEDS' | 'STAGGERED_DUAL' | 'STAGGERED_LANES' | 'PINCER_COORDINATED' | 'FOLLOW_UP_WAVE' | 'COMPLEX_STAGGERED' | 'EXPERT_MIX';
  description: string;
}

export interface RoundSummary {
  roundNumber: number;
  score: number;
  roundScore?: number;
  totalCumulativeSaves?: number;
  successfulSaves: number;
  fastestRescueMs: number | null;
  survivalTimeSeconds: number;
  bestCombo: number;
  events: RescueEventSummary[];
  outcome: 'GAME_OVER' | 'ROUND_COMPLETE';
  failureReason?: string;
}

export interface RoundCompleteData {
  roundNumber: number;
  score: number;
  roundScore: number;
  successfulSaves: number;
  totalCumulativeSaves: number;
  fastestRescueMs: number | null;
  survivalTimeSeconds: number;
  bestCombo: number;
  events: RescueEventSummary[];
  outcome: 'ROUND_COMPLETE';
}
