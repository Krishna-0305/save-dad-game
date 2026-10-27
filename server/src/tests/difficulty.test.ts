import { describe, it, expect } from 'vitest';
import { DifficultyManager, ScenarioGenerator } from '../services/difficulty.service.js';

describe('Round-by-Round Difficulty Progression & Scenario Fairness', () => {
  const manager = new DifficultyManager(42);

  describe('Section 2: Rounds 1 to 10 Target Metric Tuning', () => {
    it('verifies Round 1 metrics (Very Slow tutorial pacing)', () => {
      const cfg = manager.getConfig(1);
      expect(cfg.round).toBe(1);
      expect(cfg.motorcycleSpeed).toBe(9.0);
      expect(cfg.warningDurationSec).toBe(3.5);
      expect(cfg.rescueWindowSec).toBe(5.0);
      expect(cfg.spawnIntervalSec).toBe(5.0);
      expect(cfg.pattern).toBe('SINGLE_CENTER');
    });

    it('verifies Round 5 metrics (Moderately Fast with dual staggered traffic)', () => {
      const cfg = manager.getConfig(5);
      expect(cfg.round).toBe(5);
      expect(cfg.motorcycleSpeed).toBe(16.0);
      expect(cfg.warningDurationSec).toBe(2.6);
      expect(cfg.rescueWindowSec).toBe(3.8);
      expect(cfg.spawnIntervalSec).toBe(3.8);
      expect(cfg.pattern).toBe('STAGGERED_DUAL');
      expect(cfg.trafficCount).toBe(2);
    });

    it('verifies Round 10 metrics (Expert level target)', () => {
      const cfg = manager.getConfig(10);
      expect(cfg.round).toBe(10);
      expect(cfg.motorcycleSpeed).toBe(23.5);
      expect(cfg.warningDurationSec).toBe(1.7);
      expect(cfg.rescueWindowSec).toBe(2.6);
      expect(cfg.spawnIntervalSec).toBe(2.6);
      expect(cfg.pattern).toBe('EXPERT_MIX');
    });
  });

  describe('Section 3: Continued Scaling After Round 10 (Bounded & Bounded Caps)', () => {
    it('verifies Round 20 scales smoothly within bounded limits', () => {
      const cfg = manager.getConfig(20);
      expect(cfg.round).toBe(20);

      // Speed must be greater than Round 10, but capped below 28.0
      expect(cfg.motorcycleSpeed).toBeGreaterThan(23.5);
      expect(cfg.motorcycleSpeed).toBeLessThanOrEqual(28.0);

      // Warning duration must remain above safe minimum 1.3s
      expect(cfg.warningDurationSec).toBeLessThan(1.7);
      expect(cfg.warningDurationSec).toBeGreaterThanOrEqual(1.3);

      // Rescue window must remain above human sprint limit 2.1s
      expect(cfg.rescueWindowSec).toBeLessThan(2.6);
      expect(cfg.rescueWindowSec).toBeGreaterThanOrEqual(2.1);

      // Spawn interval must remain bounded above 1.7s
      expect(cfg.spawnIntervalSec).toBeGreaterThanOrEqual(1.7);
    });

    it('verifies Round 50 scales smoothly without exceeding physical safety bounds', () => {
      const cfg = manager.getConfig(50);
      expect(cfg.round).toBe(50);

      // Speed is strictly bounded <= 28.0
      expect(cfg.motorcycleSpeed).toBeLessThanOrEqual(28.0);
      expect(cfg.motorcycleSpeed).toBeGreaterThan(27.0);

      // Warning duration is safely capped >= 1.3
      expect(cfg.warningDurationSec).toBeGreaterThanOrEqual(1.3);

      // Rescue window is safely capped >= 2.1
      expect(cfg.rescueWindowSec).toBeGreaterThanOrEqual(2.1);

      // Spawn interval is safely capped >= 1.7
      expect(cfg.spawnIntervalSec).toBeGreaterThanOrEqual(1.7);
    });
  });

  describe('Section 5: Guaranteed Fairness and Valid Rescue Routes', () => {
    const testRounds = [1, 5, 10, 20, 50];

    testRounds.forEach((round) => {
      it(`guarantees mathematically viable rescue routes for Round ${round} scenarios`, () => {
        const gen = new ScenarioGenerator(round * 100);
        const config = manager.getConfig(round);

        for (let wave = 1; wave <= 5; wave++) {
          const scenario = gen.generateScenario(config, wave, -11.0);

          expect(scenario.isFair).toBe(true);
          // Vehicles must never spawn directly on the crossing (Z=0)
          scenario.vehicles.forEach((v) => {
            expect(Math.abs(v.startZ)).toBeGreaterThanOrEqual(35);
            expect(v.speed).toBeGreaterThan(0);
          });

          // Time to impact must be >= player time needed + safety margin
          expect(scenario.timeToFirstImpactSec).toBeGreaterThanOrEqual(
            scenario.minTimeNeededSec + 0.4
          );
        }
      });
    });
  });

  describe('Section 7: Deterministic Seeds for Testing & Debugging', () => {
    it('produces identical scenario sequences with the same seed', () => {
      const genA = new ScenarioGenerator(9999);
      const genB = new ScenarioGenerator(9999);
      const cfg = manager.getConfig(3);

      const scenarioA = genA.generateScenario(cfg, 1);
      const scenarioB = genB.generateScenario(cfg, 1);

      expect(scenarioA.dadTargetX).toBe(scenarioB.dadTargetX);
      expect(scenarioA.vehicles[0].startZ).toBe(scenarioB.vehicles[0].startZ);
      expect(scenarioA.vehicles[0].direction).toBe(scenarioB.vehicles[0].direction);
      expect(scenarioA.timeToFirstImpactSec).toBe(scenarioB.timeToFirstImpactSec);
    });
  });

  describe('Section 8: One-Save Instant Round Progression Flow', () => {
    it('advances exactly one round per successful rescue and updates difficulty settings', () => {
      const progression = new DifficultyManager(1234);
      progression.setRound(1);
      expect(progression.getRound()).toBe(1);

      // Simulate 1st successful rescue
      const r2 = progression.nextRound();
      expect(r2).toBe(2);
      expect(progression.getRound()).toBe(2);
      const cfgR2 = progression.getConfig();
      expect(cfgR2.motorcycleSpeed).toBe(11.0);
      expect(cfgR2.warningDurationSec).toBe(3.2);

      // Simulate 2nd successful rescue
      const r3 = progression.nextRound();
      expect(r3).toBe(3);
      expect(progression.getRound()).toBe(3);
      const cfgR3 = progression.getConfig();
      expect(cfgR3.motorcycleSpeed).toBe(13.0);
      expect(cfgR3.pattern).toBe('ALTERNATING_LANES');

      // Simulate 3rd successful rescue
      const r4 = progression.nextRound();
      expect(r4).toBe(4);
      expect(progression.getRound()).toBe(4);
    });

    it('preserves cumulative totals and allows resets only on explicit game reset', () => {
      const progression = new DifficultyManager(5678);
      progression.setRound(7);
      expect(progression.getRound()).toBe(7);

      progression.nextRound();
      expect(progression.getRound()).toBe(8);

      // Reset brings back to Round 1
      progression.reset();
      expect(progression.getRound()).toBe(1);
    });
  });
});
