import { RoundDifficultyConfig } from '../types/game.js';
import { ScenarioGenerator, HazardScenario } from './ScenarioGenerator.js';

export class DifficultyManager {
  private currentRound: number = 1;
  private scenarioGenerator: ScenarioGenerator;

  // Discrete tuning table for rounds 1 to 10 as specified
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

  /**
   * Calculates difficulty configuration for any round number.
   * Rounds 1-10 use the explicit progression table.
   * Rounds 11+ scale smoothly with bounded asymptotic caps.
   */
  public getConfig(roundNumber: number = this.currentRound): RoundDifficultyConfig {
    const round = Math.max(1, Math.floor(roundNumber));

    if (round <= 10) {
      const tuning = DifficultyManager.ROUND_TUNING[round];
      return {
        round,
        ...tuning
      };
    }

    // Smooth bounded scaling beyond Round 10
    // Uses asymptotic exponential decay toward hard physical safety caps:
    // - Speed cap: 28.0 u/s max
    // - Warning cap: 1.3s min
    // - Rescue window cap: 2.1s min (leaves ample margin for player 10.5u/s sprint)
    // - Spawn interval cap: 1.7s min
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

  /**
   * Generates a verified fair hazard scenario for the given wave index.
   */
  public generateWaveScenario(waveIndex: number, sonPositionX: number = -11.0): HazardScenario {
    const config = this.getConfig(this.currentRound);
    return this.scenarioGenerator.generateScenario(config, waveIndex, sonPositionX);
  }
}
