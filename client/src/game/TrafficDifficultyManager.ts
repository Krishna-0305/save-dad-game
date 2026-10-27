import { DeterministicPRNG } from './ScenarioGenerator.js';

export type TrafficPattern =
  | 'SINGLE_CENTER'
  | 'ALTERNATING_LANES'
  | 'VARIABLE_SPEEDS'
  | 'STAGGERED_DUAL'
  | 'STAGGERED_LANES'
  | 'PINCER_COORDINATED'
  | 'FOLLOW_UP_WAVE'
  | 'COMPLEX_STAGGERED'
  | 'EXPERT_MIX'
  | 'ADAPTIVE_EXPERT';

export interface TrafficConfig {
  round: number;
  targetActiveMin: number;
  targetActiveMax: number;
  activeCap: number;
  spawnIntervalMinSec: number;
  spawnIntervalMaxSec: number;
  baseIntervalSec: number;
  baseSpeed: number;
  speedVariation: number;
  warningDurationSec: number;
  rescueWindowSec: number;
  pattern: TrafficPattern;
  speedName: string;
  densityName: string;
  trafficBehavior: string;
  availableLanes: number[];
}

export interface VehicleSpawnParameters {
  laneX: number;
  startZ: number;
  direction: 1 | -1;
  speed: number;
  warningTimeSec: number;
}

export class TrafficDifficultyManager {
  private prng: DeterministicPRNG;
  private currentRound: number = 1;

  // Road lane coordinates (Indian urban road layout with 4 lanes)
  public static readonly ROAD_LANES = [-4.5, -1.5, 1.5, 4.5];
  public static readonly HARD_SIMULTANEOUS_CAP = 10;
  public static readonly ABSOLUTE_MIN_SPAWN_INTERVAL = 1.5;

  // Discrete tuning targets for rounds 1 to 10
  private static readonly ROUND_TUNING: Record<number, Omit<TrafficConfig, 'round' | 'availableLanes' | 'activeCap'>> = {
    1: {
      targetActiveMin: 1,
      targetActiveMax: 2,
      spawnIntervalMinSec: 4.0,
      spawnIntervalMaxSec: 5.0,
      baseIntervalSec: 4.5,
      baseSpeed: 9.0,
      speedVariation: 0.0,
      warningDurationSec: 3.5,
      rescueWindowSec: 5.0,
      pattern: 'SINGLE_CENTER',
      speedName: 'Very Slow',
      densityName: 'Very Low',
      trafficBehavior: 'Slow, predictable traffic'
    },
    2: {
      targetActiveMin: 2,
      targetActiveMax: 3,
      spawnIntervalMinSec: 3.5,
      spawnIntervalMaxSec: 4.5,
      baseIntervalSec: 4.0,
      baseSpeed: 11.0,
      speedVariation: 0.5,
      warningDurationSec: 3.2,
      rescueWindowSec: 4.7,
      pattern: 'SINGLE_CENTER',
      speedName: 'Slow',
      densityName: 'Low',
      trafficBehavior: 'Slightly faster motorcycles'
    },
    3: {
      targetActiveMin: 3,
      targetActiveMax: 4,
      spawnIntervalMinSec: 3.0,
      spawnIntervalMaxSec: 4.0,
      baseIntervalSec: 3.5,
      baseSpeed: 13.0,
      speedVariation: 1.5,
      warningDurationSec: 3.0,
      rescueWindowSec: 4.4,
      pattern: 'VARIABLE_SPEEDS',
      speedName: 'Moderate',
      densityName: 'Low',
      trafficBehavior: 'Mixed speeds'
    },
    4: {
      targetActiveMin: 4,
      targetActiveMax: 5,
      spawnIntervalMinSec: 2.7,
      spawnIntervalMaxSec: 3.5,
      baseIntervalSec: 3.1,
      baseSpeed: 14.5,
      speedVariation: 1.8,
      warningDurationSec: 2.8,
      rescueWindowSec: 4.1,
      pattern: 'ALTERNATING_LANES',
      speedName: 'Moderate',
      densityName: 'Medium',
      trafficBehavior: 'More varied approaches'
    },
    5: {
      targetActiveMin: 5,
      targetActiveMax: 6,
      spawnIntervalMinSec: 2.4,
      spawnIntervalMaxSec: 3.2,
      baseIntervalSec: 2.8,
      baseSpeed: 16.0,
      speedVariation: 2.0,
      warningDurationSec: 2.6,
      rescueWindowSec: 3.8,
      pattern: 'STAGGERED_DUAL',
      speedName: 'Moderately Fast',
      densityName: 'Medium',
      trafficBehavior: 'Staggered traffic'
    },
    6: {
      targetActiveMin: 6,
      targetActiveMax: 7,
      spawnIntervalMinSec: 2.1,
      spawnIntervalMaxSec: 2.9,
      baseIntervalSec: 2.5,
      baseSpeed: 17.5,
      speedVariation: 2.2,
      warningDurationSec: 2.4,
      rescueWindowSec: 3.5,
      pattern: 'STAGGERED_LANES',
      speedName: 'Fast',
      densityName: 'Medium',
      trafficBehavior: 'Multiple approaching motorcycles'
    },
    7: {
      targetActiveMin: 7,
      targetActiveMax: 8,
      spawnIntervalMinSec: 1.9,
      spawnIntervalMaxSec: 2.6,
      baseIntervalSec: 2.25,
      baseSpeed: 19.0,
      speedVariation: 2.5,
      warningDurationSec: 2.2,
      rescueWindowSec: 3.2,
      pattern: 'PINCER_COORDINATED',
      speedName: 'Fast',
      densityName: 'High',
      trafficBehavior: 'More complex traffic patterns'
    },
    8: {
      targetActiveMin: 8,
      targetActiveMax: 9,
      spawnIntervalMinSec: 1.7,
      spawnIntervalMaxSec: 2.4,
      baseIntervalSec: 2.05,
      baseSpeed: 20.5,
      speedVariation: 2.8,
      warningDurationSec: 2.0,
      rescueWindowSec: 3.0,
      pattern: 'FOLLOW_UP_WAVE',
      speedName: 'Very Fast',
      densityName: 'High',
      trafficBehavior: 'Faster, denser traffic'
    },
    9: {
      targetActiveMin: 9,
      targetActiveMax: 10,
      spawnIntervalMinSec: 1.6,
      spawnIntervalMaxSec: 2.2,
      baseIntervalSec: 1.9,
      baseSpeed: 22.0,
      speedVariation: 3.0,
      warningDurationSec: 1.8,
      rescueWindowSec: 2.8,
      pattern: 'COMPLEX_STAGGERED',
      speedName: 'Very Fast',
      densityName: 'Very High',
      trafficBehavior: 'Complex but readable patterns'
    },
    10: {
      targetActiveMin: 10,
      targetActiveMax: 10,
      spawnIntervalMinSec: 1.5,
      spawnIntervalMaxSec: 2.0,
      baseIntervalSec: 1.75,
      baseSpeed: 23.5,
      speedVariation: 3.0,
      warningDurationSec: 1.7,
      rescueWindowSec: 2.6,
      pattern: 'ADAPTIVE_EXPERT',
      speedName: 'Expert',
      densityName: 'High Complex',
      trafficBehavior: 'Adaptive expert traffic'
    }
  };

  constructor(seed: number = 1337) {
    this.prng = new DeterministicPRNG(seed);
  }

  public setSeed(seed: number): void {
    this.prng = new DeterministicPRNG(seed);
  }

  public setRound(round: number): void {
    this.currentRound = Math.max(1, Math.floor(round));
  }

  public getRound(): number {
    return this.currentRound;
  }

  public nextRound(): number {
    this.currentRound++;
    return this.currentRound;
  }

  public reset(): void {
    this.currentRound = 1;
  }

  /**
   * Retrieves full traffic configuration for any round.
   * Rounds 1–10 follow the explicit tuning table.
   * Rounds 11+ scale smoothly with bounded speed and a hard cap of 10 simultaneous motorcycles.
   */
  public getConfig(roundNumber: number = this.currentRound): TrafficConfig {
    const round = Math.max(1, Math.floor(roundNumber));

    if (round <= 10) {
      const tuning = TrafficDifficultyManager.ROUND_TUNING[round];
      return {
        round,
        activeCap: TrafficDifficultyManager.HARD_SIMULTANEOUS_CAP,
        availableLanes: [...TrafficDifficultyManager.ROAD_LANES],
        ...tuning
      };
    }

    // Post-round 10 scaling:
    // Capped at 10 simultaneous motorcycles, 1.5s minimum spawn interval,
    // and speed bounded asymptotically below 25.0 u/s to avoid impossible gameplay.
    const over10 = round - 10;
    const progress = 1 - Math.exp(-over10 / 12);

    const baseSpeed = +(23.5 + 1.5 * progress).toFixed(1); // Capped at 25.0
    const spawnIntervalMinSec = TrafficDifficultyManager.ABSOLUTE_MIN_SPAWN_INTERVAL;
    const spawnIntervalMaxSec = +(2.0 - 0.3 * progress).toFixed(2);
    const baseIntervalSec = +((spawnIntervalMinSec + spawnIntervalMaxSec) / 2).toFixed(2);
    const warningDurationSec = +(1.7 - 0.2 * progress).toFixed(2); // Floor at 1.5s
    const rescueWindowSec = +(2.6 - 0.4 * progress).toFixed(2); // Floor at 2.2s

    return {
      round,
      targetActiveMin: 10,
      targetActiveMax: 10,
      activeCap: TrafficDifficultyManager.HARD_SIMULTANEOUS_CAP,
      spawnIntervalMinSec,
      spawnIntervalMaxSec,
      baseIntervalSec,
      baseSpeed,
      speedVariation: 3.0,
      warningDurationSec,
      rescueWindowSec,
      pattern: 'ADAPTIVE_EXPERT',
      speedName: `Master Level ${round}`,
      densityName: 'Endless Dense Rush',
      trafficBehavior: 'Adaptive expert traffic (Speed capped, complex staggered flow)',
      availableLanes: [...TrafficDifficultyManager.ROAD_LANES]
    };
  }

  /**
   * Calculates a randomized spawn delay within the round's interval range.
   */
  public getNextSpawnInterval(roundNumber: number = this.currentRound): number {
    const config = this.getConfig(roundNumber);
    const spread = config.spawnIntervalMaxSec - config.spawnIntervalMinSec;
    return +(config.spawnIntervalMinSec + this.prng.next() * spread).toFixed(2);
  }

  /**
   * Determines if additional motorcycles can be spawned without exceeding the active cap or target.
   */
  public canSpawnVehicle(currentActiveCount: number, roundNumber: number = this.currentRound): boolean {
    const config = this.getConfig(roundNumber);
    if (currentActiveCount >= config.activeCap) return false;
    return currentActiveCount < config.targetActiveMax;
  }

  /**
   * Generates next motorcycle spawn parameters ensuring fairness:
   * - Never spawns directly on player or Dad (start Z is at map boundaries: -52 or +52).
   * - Uses varied lanes and alternating directions to maintain accessible escape gaps.
   */
  public generateNextSpawn(
    roundNumber: number = this.currentRound,
    dadLaneX: number = 0,
    activeLanes: number[] = []
  ): VehicleSpawnParameters {
    const config = this.getConfig(roundNumber);

    // Pick lane with lowest active density, or Dad's lane if clear
    let targetLane: number;
    const availableLanes = config.availableLanes;

    if (roundNumber <= 2) {
      // In early rounds, vehicle targets Dad's general area predictably
      targetLane = dadLaneX;
    } else {
      // Find lanes that don't already have an active vehicle near the crossing
      const openLanes = availableLanes.filter((lane) => !activeLanes.includes(lane));
      if (openLanes.length > 0) {
        targetLane = openLanes[Math.floor(this.prng.next() * openLanes.length)];
      } else {
        targetLane = availableLanes[Math.floor(this.prng.next() * availableLanes.length)];
      }
    }

    // Direction: Northbound (+Z, start at -52) or Southbound (-Z, start at +52)
    // Negative X lanes drive North (+Z), positive X lanes drive South (-Z) by convention,
    // with occasional contra-flow in higher rounds
    let direction: 1 | -1;
    if (roundNumber <= 3) {
      direction = targetLane < 0 ? 1 : -1;
    } else {
      direction = this.prng.next() > 0.5 ? 1 : -1;
    }

    const startZ = direction === 1 ? -52 : 52;

    // Speed variation based on round difficulty
    const speedVariationDelta = (this.prng.next() * 2 - 1) * config.speedVariation;
    const speed = Math.max(8.0, +(config.baseSpeed + speedVariationDelta).toFixed(1));

    return {
      laneX: targetLane,
      startZ,
      direction,
      speed,
      warningTimeSec: config.warningDurationSec
    };
  }
}

