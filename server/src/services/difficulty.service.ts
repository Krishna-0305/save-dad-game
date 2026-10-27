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

export interface VehicleHazard {
  laneX: number;
  startZ: number;
  direction: 1 | -1;
  speed: number;
  delaySec: number;
}

export interface HazardScenario {
  scenarioId: string;
  roundNumber: number;
  waveIndex: number;
  dadTargetX: number;
  vehicles: VehicleHazard[];
  rescueWindowSec: number;
  warningDurationSec: number;
  isFair: boolean;
  minTimeNeededSec: number;
  timeToFirstImpactSec: number;
}

export class DeterministicPRNG {
  private s: number;

  constructor(seed: number = 1337) {
    this.s = Math.floor(seed) >>> 0;
  }

  public next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export class ScenarioGenerator {
  private prng: DeterministicPRNG;

  public static readonly PLAYER_SPRINT_SPEED = 10.5; // Units/sec
  public static readonly RESCUE_DURATION = 0.8;     // Seconds to pull Dad to safety
  public static readonly RESCUE_RADIUS = 3.2;       // Range in units
  public static readonly SAFE_MARGIN_SEC = 0.5;     // Extra buffer for player reaction

  constructor(seed: number = Date.now()) {
    this.prng = new DeterministicPRNG(seed);
  }

  public setSeed(seed: number): void {
    this.prng = new DeterministicPRNG(seed);
  }

  public generateScenario(
    config: RoundDifficultyConfig,
    waveIndex: number,
    sonPositionX: number = -11.0,
    crossingZ: number = 0
  ): HazardScenario {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;

      const maxDadX = config.round <= 2 ? 1.0 : config.round <= 5 ? 2.5 : 3.5;
      const minDadX = config.round <= 2 ? -1.0 : -2.5;
      const dadTargetX = minDadX + this.prng.next() * (maxDadX - minDadX);

      const vehicles: VehicleHazard[] = [];
      const primaryDirection: 1 | -1 = this.prng.next() > 0.5 ? 1 : -1;
      const primaryStartZ = primaryDirection === 1 ? -52 : 52;

      switch (config.pattern) {
        case 'SINGLE_CENTER': {
          vehicles.push({
            laneX: dadTargetX,
            startZ: primaryStartZ,
            direction: primaryDirection,
            speed: config.motorcycleSpeed,
            delaySec: 0
          });
          break;
        }

        case 'ALTERNATING_LANES':
        case 'VARIABLE_SPEEDS': {
          const speedVariance = (this.prng.next() - 0.5) * 1.5;
          vehicles.push({
            laneX: dadTargetX,
            startZ: primaryStartZ,
            direction: primaryDirection,
            speed: Math.max(9.0, config.motorcycleSpeed + speedVariance),
            delaySec: 0
          });
          break;
        }

        case 'STAGGERED_DUAL':
        case 'STAGGERED_LANES': {
          vehicles.push({
            laneX: dadTargetX,
            startZ: primaryStartZ,
            direction: primaryDirection,
            speed: config.motorcycleSpeed,
            delaySec: 0
          });

          const secondLaneOffset = this.prng.next() > 0.5 ? 3.0 : -3.0;
          vehicles.push({
            laneX: Math.max(-5, Math.min(5, dadTargetX + secondLaneOffset)),
            startZ: primaryStartZ,
            direction: primaryDirection,
            speed: config.motorcycleSpeed * 1.05,
            delaySec: 1.2
          });
          break;
        }

        case 'PINCER_COORDINATED': {
          vehicles.push({
            laneX: dadTargetX,
            startZ: -54,
            direction: 1,
            speed: config.motorcycleSpeed,
            delaySec: 0
          });

          vehicles.push({
            laneX: dadTargetX > 0 ? dadTargetX - 3.2 : dadTargetX + 3.2,
            startZ: 54,
            direction: -1,
            speed: config.motorcycleSpeed * 0.95,
            delaySec: 0.6
          });
          break;
        }

        case 'FOLLOW_UP_WAVE':
        case 'COMPLEX_STAGGERED':
        case 'EXPERT_MIX':
        default: {
          vehicles.push({
            laneX: dadTargetX,
            startZ: primaryStartZ,
            direction: primaryDirection,
            speed: config.motorcycleSpeed,
            delaySec: 0
          });

          const oppositeDir: 1 | -1 = primaryDirection === 1 ? -1 : 1;
          const oppStartZ = oppositeDir === 1 ? -56 : 56;
          vehicles.push({
            laneX: dadTargetX > 0 ? dadTargetX - 3.5 : dadTargetX + 3.5,
            startZ: oppStartZ,
            direction: oppositeDir,
            speed: config.motorcycleSpeed * 1.05,
            delaySec: 0.9
          });
          break;
        }
      }

      // Check Fairness
      const distanceToDad = Math.abs(dadTargetX - sonPositionX);
      const minTravelTime = Math.max(0, distanceToDad - ScenarioGenerator.RESCUE_RADIUS) / ScenarioGenerator.PLAYER_SPRINT_SPEED;
      const minTimeNeededSec = minTravelTime + ScenarioGenerator.RESCUE_DURATION;

      let firstImpactSec = 999;
      for (const v of vehicles) {
        const timeToCrossing = Math.abs(v.startZ - crossingZ) / v.speed + v.delaySec;
        if (timeToCrossing < firstImpactSec) {
          firstImpactSec = timeToCrossing;
        }
      }

      const isFair = firstImpactSec >= minTimeNeededSec + ScenarioGenerator.SAFE_MARGIN_SEC;

      if (isFair) {
        return {
          scenarioId: `r${config.round}-w${waveIndex}-${attempts}`,
          roundNumber: config.round,
          waveIndex,
          dadTargetX,
          vehicles,
          rescueWindowSec: config.rescueWindowSec,
          warningDurationSec: config.warningDurationSec,
          isFair: true,
          minTimeNeededSec: +minTimeNeededSec.toFixed(2),
          timeToFirstImpactSec: +firstImpactSec.toFixed(2)
        };
      } else {
        const requiredDistance = (minTimeNeededSec + ScenarioGenerator.SAFE_MARGIN_SEC) * config.motorcycleSpeed;
        vehicles[0].startZ = primaryDirection === 1 ? -Math.max(54, requiredDistance) : Math.max(54, requiredDistance);
        const adjustedImpact = Math.abs(vehicles[0].startZ) / vehicles[0].speed;

        return {
          scenarioId: `r${config.round}-w${waveIndex}-adjusted`,
          roundNumber: config.round,
          waveIndex,
          dadTargetX,
          vehicles,
          rescueWindowSec: config.rescueWindowSec,
          warningDurationSec: config.warningDurationSec,
          isFair: true,
          minTimeNeededSec: +minTimeNeededSec.toFixed(2),
          timeToFirstImpactSec: +adjustedImpact.toFixed(2)
        };
      }
    }

    return {
      scenarioId: `r${config.round}-w${waveIndex}-safe`,
      roundNumber: config.round,
      waveIndex,
      dadTargetX: 0,
      vehicles: [
        {
          laneX: 0,
          startZ: -55,
          direction: 1,
          speed: config.motorcycleSpeed,
          delaySec: 0
        }
      ],
      rescueWindowSec: config.rescueWindowSec,
      warningDurationSec: config.warningDurationSec,
      isFair: true,
      minTimeNeededSec: 1.5,
      timeToFirstImpactSec: 55 / config.motorcycleSpeed
    };
  }
}

export class DifficultyManager {
  private currentRound: number = 1;
  private scenarioGenerator: ScenarioGenerator;

  private static readonly ROUND_TUNING: Record<number, Omit<RoundDifficultyConfig, 'round'>> = {
    1: {
      speedName: 'Very Slow',
      densityName: 'Very Low',
      motorcycleSpeed: 9.0,
      spawnIntervalSec: 5.0,
      warningDurationSec: 3.5,
      rescueWindowSec: 5.0,
      trafficCount: 1,
      pattern: 'SINGLE_CENTER',
      description: 'Tutorial & Basic Controls: Slow traffic with ample time to react.'
    },
    2: {
      speedName: 'Slow',
      densityName: 'Low',
      motorcycleSpeed: 11.0,
      spawnIntervalSec: 4.7,
      warningDurationSec: 3.2,
      rescueWindowSec: 4.7,
      trafficCount: 1,
      pattern: 'SINGLE_CENTER',
      description: 'Basic Traffic: Predictable speed to master sprint and grab timing.'
    },
    3: {
      speedName: 'Moderate',
      densityName: 'Low',
      motorcycleSpeed: 13.0,
      spawnIntervalSec: 4.4,
      warningDurationSec: 3.0,
      rescueWindowSec: 4.4,
      trafficCount: 1,
      pattern: 'ALTERNATING_LANES',
      description: 'Directional Variety: Vehicles arrive from North and South crossings.'
    },
    4: {
      speedName: 'Moderate',
      densityName: 'Medium',
      motorcycleSpeed: 14.5,
      spawnIntervalSec: 4.1,
      warningDurationSec: 2.8,
      rescueWindowSec: 4.1,
      trafficCount: 1,
      pattern: 'VARIABLE_SPEEDS',
      description: 'Variable Speeds: Traffic speeds fluctuate slightly between waves.'
    },
    5: {
      speedName: 'Moderately Fast',
      densityName: 'Medium',
      motorcycleSpeed: 16.0,
      spawnIntervalSec: 3.8,
      warningDurationSec: 2.6,
      rescueWindowSec: 3.8,
      trafficCount: 2,
      pattern: 'STAGGERED_DUAL',
      description: 'Staggered Waves: Multiple vehicles approach with spaced delays.'
    },
    6: {
      speedName: 'Fast',
      densityName: 'Medium',
      motorcycleSpeed: 17.5,
      spawnIntervalSec: 3.5,
      warningDurationSec: 2.4,
      rescueWindowSec: 3.5,
      trafficCount: 2,
      pattern: 'STAGGERED_LANES',
      description: 'Dual Lane Hazard: Simultaneous lane pressure demands quick pathing.'
    },
    7: {
      speedName: 'Fast',
      densityName: 'High',
      motorcycleSpeed: 19.0,
      spawnIntervalSec: 3.2,
      warningDurationSec: 2.2,
      rescueWindowSec: 3.2,
      trafficCount: 2,
      pattern: 'PINCER_COORDINATED',
      description: 'Pincer Maneuver: Oncoming traffic from opposite directions.'
    },
    8: {
      speedName: 'Very Fast',
      densityName: 'High',
      motorcycleSpeed: 20.5,
      spawnIntervalSec: 3.0,
      warningDurationSec: 2.0,
      rescueWindowSec: 3.0,
      trafficCount: 2,
      pattern: 'FOLLOW_UP_WAVE',
      description: 'Rapid Follow-Up: Tighter rescue windows and swift follow-up bikes.'
    },
    9: {
      speedName: 'Very Fast',
      densityName: 'Very High',
      motorcycleSpeed: 22.0,
      spawnIntervalSec: 2.8,
      warningDurationSec: 1.8,
      rescueWindowSec: 2.8,
      trafficCount: 2,
      pattern: 'COMPLEX_STAGGERED',
      description: 'High Pressure: Multi-lane staggered waves test peak reflexes.'
    },
    10: {
      speedName: 'Expert',
      densityName: 'High Complex',
      motorcycleSpeed: 23.5,
      spawnIntervalSec: 2.6,
      warningDurationSec: 1.7,
      rescueWindowSec: 2.6,
      trafficCount: 2,
      pattern: 'EXPERT_MIX',
      description: 'Expert Challenge: Master-level coordination across Indian traffic.'
    }
  };

  constructor(seed?: number) {
    this.scenarioGenerator = new ScenarioGenerator(seed);
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

  public setSeed(seed: number): void {
    this.scenarioGenerator.setSeed(seed);
  }

  public getConfig(roundNumber: number = this.currentRound): RoundDifficultyConfig {
    const round = Math.max(1, Math.floor(roundNumber));

    if (round <= 10) {
      const tuning = DifficultyManager.ROUND_TUNING[round];
      return {
        round,
        ...tuning
      };
    }

    const over10 = round - 10;
    const progress = 1 - Math.exp(-over10 / 15);

    const motorcycleSpeed = +(23.5 + 4.5 * progress).toFixed(1);
    const warningDurationSec = +(1.7 - 0.4 * progress).toFixed(2);
    const rescueWindowSec = +(2.6 - 0.5 * progress).toFixed(2);
    const spawnIntervalSec = +(2.6 - 0.9 * progress).toFixed(2);

    return {
      round,
      speedName: `Master Level ${round}`,
      densityName: 'Endless Rush',
      motorcycleSpeed,
      spawnIntervalSec,
      warningDurationSec,
      rescueWindowSec,
      trafficCount: 2,
      pattern: 'EXPERT_MIX',
      description: `High-Round Challenge: Bounded speed (${motorcycleSpeed} u/s) with verified survivable rescue routes.`
    };
  }

  public generateWaveScenario(waveIndex: number, sonPositionX: number = -11.0): HazardScenario {
    const config = this.getConfig(this.currentRound);
    return this.scenarioGenerator.generateScenario(config, waveIndex, sonPositionX);
  }
}

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

  public static readonly ROAD_LANES = [-4.5, -1.5, 1.5, 4.5];
  public static readonly HARD_SIMULTANEOUS_CAP = 10;
  public static readonly ABSOLUTE_MIN_SPAWN_INTERVAL = 1.5;

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

    const over10 = round - 10;
    const progress = 1 - Math.exp(-over10 / 12);

    const baseSpeed = +(23.5 + 1.5 * progress).toFixed(1);
    const spawnIntervalMinSec = TrafficDifficultyManager.ABSOLUTE_MIN_SPAWN_INTERVAL;
    const spawnIntervalMaxSec = +(2.0 - 0.3 * progress).toFixed(2);
    const baseIntervalSec = +((spawnIntervalMinSec + spawnIntervalMaxSec) / 2).toFixed(2);
    const warningDurationSec = +(1.7 - 0.2 * progress).toFixed(2);
    const rescueWindowSec = +(2.6 - 0.4 * progress).toFixed(2);

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

  public getNextSpawnInterval(roundNumber: number = this.currentRound): number {
    const config = this.getConfig(roundNumber);
    const spread = config.spawnIntervalMaxSec - config.spawnIntervalMinSec;
    return +(config.spawnIntervalMinSec + this.prng.next() * spread).toFixed(2);
  }

  public canSpawnVehicle(currentActiveCount: number, roundNumber: number = this.currentRound): boolean {
    const config = this.getConfig(roundNumber);
    if (currentActiveCount >= config.activeCap) return false;
    return currentActiveCount < config.targetActiveMax;
  }
}

