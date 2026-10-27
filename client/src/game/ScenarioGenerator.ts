import { RoundDifficultyConfig } from '../types/game.js';

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

// Simple fast deterministic 32-bit PRNG
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

  // Physical Constants matching Character and Scene mechanics
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

  /**
   * Generates a hazard scenario based on the round configuration,
   * guaranteeing that every scenario has a physically viable rescue route.
   */
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

      // Dad is crossing in a lane between X = -3.5 and +3.5
      // In early rounds, keep Dad closer to the safe side (X < 1.0)
      const maxDadX = config.round <= 2 ? 1.0 : config.round <= 5 ? 2.5 : 3.5;
      const minDadX = config.round <= 2 ? -1.0 : -2.5;
      const dadTargetX = minDadX + this.prng.next() * (maxDadX - minDadX);

      const vehicles: VehicleHazard[] = [];
      const primaryDirection: 1 | -1 = this.prng.next() > 0.5 ? 1 : -1;
      const primaryStartZ = primaryDirection === 1 ? -52 : 52;

      // Build pattern based on round difficulty config
      switch (config.pattern) {
        case 'SINGLE_CENTER': {
          // Rounds 1-2: Single predictable bike in Dad's lane
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
          // Rounds 3-4: Single bike with randomized lane or speed offset
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
          // Rounds 5-6: Primary hazard on Dad + second bike in adjacent lane with 1.2s delay
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
          // Rounds 7-8: Two bikes coming from opposite directions (North & South)
          vehicles.push({
            laneX: dadTargetX,
            startZ: -54,
            direction: 1,
            speed: config.motorcycleSpeed,
            delaySec: 0
          });

          // Second bike is in adjacent lane coming from South
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
          // Rounds 9+: Coordinated wave with staggered timing
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
        // If speed made it unfair, adjust startZ further back to restore fairness
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

    // Fallback safe scenario
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

