import { describe, it, expect } from 'vitest';
import { TrafficDifficultyManager } from '../services/difficulty.service.js';

describe('TrafficDifficultyManager — Progressive Traffic & Pacing', () => {
  const traffic = new TrafficDifficultyManager(42);

  describe('Round-by-Round Active Vehicle Targets & Spawn Intervals', () => {
    const expectedTargets = [
      { round: 1, minActive: 1, maxActive: 2, minInterval: 4.0, maxInterval: 5.0, behavior: 'Slow, predictable' },
      { round: 2, minActive: 2, maxActive: 3, minInterval: 3.5, maxInterval: 4.5, behavior: 'Slightly faster' },
      { round: 3, minActive: 3, maxActive: 4, minInterval: 3.0, maxInterval: 4.0, behavior: 'Mixed speeds' },
      { round: 4, minActive: 4, maxActive: 5, minInterval: 2.7, maxInterval: 3.5, behavior: 'More varied approaches' },
      { round: 5, minActive: 5, maxActive: 6, minInterval: 2.4, maxInterval: 3.2, behavior: 'Staggered traffic' },
      { round: 6, minActive: 6, maxActive: 7, minInterval: 2.1, maxInterval: 2.9, behavior: 'Multiple approaching' },
      { round: 7, minActive: 7, maxActive: 8, minInterval: 1.9, maxInterval: 2.6, behavior: 'More complex' },
      { round: 8, minActive: 8, maxActive: 9, minInterval: 1.7, maxInterval: 2.4, behavior: 'Faster, denser' },
      { round: 9, minActive: 9, maxActive: 10, minInterval: 1.6, maxInterval: 2.2, behavior: 'Complex but readable' },
      { round: 10, minActive: 10, maxActive: 10, minInterval: 1.5, maxInterval: 2.0, behavior: 'Adaptive expert' }
    ];

    expectedTargets.forEach(({ round, minActive, maxActive, minInterval, maxInterval }) => {
      it(`verifies Round ${round} targets: ${minActive}–${maxActive} active motorcycles, ${minInterval}–${maxInterval}s interval`, () => {
        const config = traffic.getConfig(round);
        expect(config.round).toBe(round);
        expect(config.targetActiveMin).toBe(minActive);
        expect(config.targetActiveMax).toBe(maxActive);
        expect(config.spawnIntervalMinSec).toBe(minInterval);
        expect(config.spawnIntervalMaxSec).toBe(maxInterval);
      });
    });
  });

  describe('Simultaneous Cap & Spawn Constraint Enforcement', () => {
    it('strictly caps simultaneous active motorcycles at 10', () => {
      for (let r = 1; r <= 30; r++) {
        const config = traffic.getConfig(r);
        expect(config.activeCap).toBeLessThanOrEqual(10);
        expect(config.targetActiveMax).toBeLessThanOrEqual(10);
      }
    });

    it('canSpawnVehicle returns false when active count reaches target or cap', () => {
      // In Round 1, target is 1-2
      expect(traffic.canSpawnVehicle(0, 1)).toBe(true);
      expect(traffic.canSpawnVehicle(1, 1)).toBe(true);
      expect(traffic.canSpawnVehicle(2, 1)).toBe(false);

      // In Round 5, target is 5-6
      expect(traffic.canSpawnVehicle(4, 5)).toBe(true);
      expect(traffic.canSpawnVehicle(5, 5)).toBe(true);
      expect(traffic.canSpawnVehicle(6, 5)).toBe(false);

      // In Round 10+, max is 10
      expect(traffic.canSpawnVehicle(9, 10)).toBe(true);
      expect(traffic.canSpawnVehicle(10, 10)).toBe(false);
      expect(traffic.canSpawnVehicle(15, 10)).toBe(false);
    });

    it('guarantees randomized spawn interval stays strictly within bounds', () => {
      for (let r = 1; r <= 10; r++) {
        const cfg = traffic.getConfig(r);
        for (let i = 0; i < 20; i++) {
          const interval = traffic.getNextSpawnInterval(r);
          expect(interval).toBeGreaterThanOrEqual(cfg.spawnIntervalMinSec);
          expect(interval).toBeLessThanOrEqual(cfg.spawnIntervalMaxSec);
        }
      }
    });
  });

  describe('Post-Round 10 Difficulty Scaling', () => {
    it('bounds motorcycle speed reasonably without endless exponential spikes', () => {
      const cfg10 = traffic.getConfig(10);
      const cfg20 = traffic.getConfig(20);
      const cfg50 = traffic.getConfig(50);

      expect(cfg10.baseSpeed).toBe(23.5);
      // Speed scales gradually, capped below 25.5 u/s
      expect(cfg20.baseSpeed).toBeGreaterThanOrEqual(cfg10.baseSpeed);
      expect(cfg20.baseSpeed).toBeLessThanOrEqual(25.5);
      expect(cfg50.baseSpeed).toBeLessThanOrEqual(25.5);

      // Minimum spawn interval never drops below physical safety minimum 1.5s
      expect(cfg20.spawnIntervalMinSec).toBeGreaterThanOrEqual(1.5);
      expect(cfg50.spawnIntervalMinSec).toBeGreaterThanOrEqual(1.5);
    });

    it('maintains valid safe warning duration and rescue window at high rounds', () => {
      const cfg25 = traffic.getConfig(25);
      expect(cfg25.warningDurationSec).toBeGreaterThanOrEqual(1.5);
      expect(cfg25.rescueWindowSec).toBeGreaterThanOrEqual(2.2);
    });
  });
});

