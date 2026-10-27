import { IGameSession } from '../models/GameSession.js';
import { IRescueEvent } from '../models/GameResult.js';

export interface ValidationInput {
  session: IGameSession;
  roundNumber?: number;
  score: number;
  roundScore?: number;
  totalCumulativeSaves?: number;
  successfulSaves: number;
  fastestRescueMs: number | null;
  survivalTimeSeconds: number;
  bestCombo: number;
  events: IRescueEvent[];
}

export interface ValidationOutcome {
  isValid: boolean;
  status: 'valid' | 'flagged' | 'rejected';
  reason?: string;
  calculatedScore: number;
}

export class ValidationService {
  /**
   * Validates game round results against physical, temporal, and round-progression constraints.
   */
  static validateRound(input: ValidationInput): ValidationOutcome {
    const { session, roundNumber, score, roundScore, successfulSaves, fastestRescueMs, survivalTimeSeconds, bestCombo, events } = input;

    // 1. Validate round number and check session match
    const activeRound = roundNumber || session.roundNumber || 1;
    if (activeRound < 1 || !Number.isInteger(activeRound)) {
      return {
        isValid: false,
        status: 'rejected',
        reason: `Invalid round number: ${activeRound}`,
        calculatedScore: 0
      };
    }

    if (session.roundNumber && roundNumber && roundNumber !== session.roundNumber) {
      return {
        isValid: false,
        status: 'rejected',
        reason: `Session round mismatch: session was issued for round ${session.roundNumber}, but submission received round ${roundNumber}`,
        calculatedScore: 0
      };
    }

    // 2. Check elapsed real time since session started
    const now = Date.now();
    const elapsedRealTimeSeconds = (now - session.serverStartTime.getTime()) / 1000;

    // Reject if submission occurs impossibly early compared to reported survival time (with 3s network grace)
    if (elapsedRealTimeSeconds < survivalTimeSeconds - 3) {
      return {
        isValid: false,
        status: 'rejected',
        reason: `Submission occurred too fast (${elapsedRealTimeSeconds.toFixed(1)}s elapsed vs ${survivalTimeSeconds}s survival reported)`,
        calculatedScore: 0
      };
    }

    // Reject if session is submitted way past expiration (5 minutes late)
    if (elapsedRealTimeSeconds > 300) {
      return {
        isValid: false,
        status: 'rejected',
        reason: 'Session expired before submission',
        calculatedScore: 0
      };
    }

    // 3. Validate survival time bounds (0 to 60 + grace period)
    if (survivalTimeSeconds < 0 || survivalTimeSeconds > 65) {
      return {
        isValid: false,
        status: 'rejected',
        reason: `Survival time ${survivalTimeSeconds} is out of valid round bounds`,
        calculatedScore: 0
      };
    }

    // 4. Validate saves count vs duration
    // A single rescue event takes at least 1.0 seconds (approach + rescue animation + transition)
    const minTimePerSave = 1.0;
    if (successfulSaves * minTimePerSave > survivalTimeSeconds + 2) {
      return {
        isValid: false,
        status: 'rejected',
        reason: `Impossible save count (${successfulSaves}) for duration of ${survivalTimeSeconds}s`,
        calculatedScore: 0
      };
    }

    // 5. Validate events array matches reported saves
    if (events.length !== successfulSaves) {
      return {
        isValid: false,
        status: 'rejected',
        reason: `Mismatch between save count (${successfulSaves}) and event log count (${events.length})`,
        calculatedScore: 0
      };
    }

    // 6. Recompute score and fastest reaction time from events
    let calculatedScore = 0;
    let minObservedReactionMs = Number.MAX_SAFE_INTEGER;
    let computedMaxCombo = 1;
    let currentCombo = 1;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      // Reaction time bounds (human minimum is typically ~120ms, flag if < 100ms)
      if (ev.reactionTimeMs < 100) {
        return {
          isValid: false,
          status: 'flagged',
          reason: `Implausible superhuman reaction time: ${ev.reactionTimeMs}ms`,
          calculatedScore: 0
        };
      }

      if (ev.reactionTimeMs < minObservedReactionMs) {
        minObservedReactionMs = ev.reactionTimeMs;
      }

      // Combo progression: 1 -> 1.2 -> 1.4 -> 1.6 -> 1.8 -> max 2.0
      const comboMultiplier = ev.comboAtRescue || Math.min(2.0, 1.0 + (i * 0.2));
      currentCombo = comboMultiplier;
      if (currentCombo > computedMaxCombo) {
        computedMaxCombo = currentCombo;
      }

      // Reaction bonus formula: up to 50 points based on speed
      const reactionBonus = Math.max(0, Math.min(50, Math.round((2000 - ev.reactionTimeMs) / 30)));
      const basePoints = 100;
      const eventPoints = Math.round((basePoints + reactionBonus) * comboMultiplier);

      calculatedScore += eventPoints;
    }

    if (successfulSaves === 0) {
      minObservedReactionMs = 0;
      calculatedScore = 0;
    }

    // Allow a reasonable rounding tolerance of 20% or 30 points.
    // If roundScore is explicitly provided, validate calculated round score against roundScore;
    // otherwise compare directly against score.
    const targetScore = roundScore !== undefined ? roundScore : score;
    const scoreDiff = Math.abs(calculatedScore - targetScore);
    if (targetScore > 0 && scoreDiff > Math.max(30, calculatedScore * 0.20)) {
      return {
        isValid: false,
        status: 'flagged',
        reason: `Score discrepancy: claimed ${targetScore}, server calculated ${calculatedScore}`,
        calculatedScore
      };
    }

    return {
      isValid: true,
      status: 'valid',
      calculatedScore: score
    };
  }
}
