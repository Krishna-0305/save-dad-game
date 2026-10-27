import { describe, it, expect } from 'vitest';
import { ValidationService } from '../services/validation.service.js';
import { IGameSession } from '../models/GameSession.js';

describe('ValidationService (Server-Authoritative Anti-Cheat)', () => {
  const createMockSession = (startTimeOffsetMs: number = 60000): IGameSession => {
    return {
      sessionId: 'test-session-123',
      serverStartTime: new Date(Date.now() - startTimeOffsetMs),
      status: 'active',
      expectedDurationSeconds: 60
    } as unknown as IGameSession;
  };

  it('accepts a valid round submission with plausible scores and reaction times', () => {
    const session = createMockSession(50000); // 50 seconds ago
    const events = [
      { eventIndex: 0, reactionTimeMs: 800, pointsAwarded: 140, comboAtRescue: 1.0, timestampOffsetMs: 10000 },
      { eventIndex: 1, reactionTimeMs: 650, pointsAwarded: 174, comboAtRescue: 1.2, timestampOffsetMs: 22000 },
      { eventIndex: 2, reactionTimeMs: 500, pointsAwarded: 210, comboAtRescue: 1.4, timestampOffsetMs: 35000 }
    ];

    const outcome = ValidationService.validateRound({
      session,
      score: 524,
      successfulSaves: 3,
      fastestRescueMs: 500,
      survivalTimeSeconds: 45,
      bestCombo: 1.4,
      events
    });

    expect(outcome.isValid).toBe(true);
    expect(outcome.status).toBe('valid');
  });

  it('rejects a submission where survival time exceeds elapsed real time by a large margin', () => {
    const session = createMockSession(5000); // Only 5 seconds elapsed
    const outcome = ValidationService.validateRound({
      session,
      score: 300,
      successfulSaves: 2,
      fastestRescueMs: 600,
      survivalTimeSeconds: 55, // Impossibly claimed 55s in 5s
      bestCombo: 1.2,
      events: [
        { eventIndex: 0, reactionTimeMs: 600, pointsAwarded: 147, comboAtRescue: 1.0, timestampOffsetMs: 2000 },
        { eventIndex: 1, reactionTimeMs: 700, pointsAwarded: 172, comboAtRescue: 1.2, timestampOffsetMs: 4000 }
      ]
    });

    expect(outcome.isValid).toBe(false);
    expect(outcome.status).toBe('rejected');
    expect(outcome.reason).toContain('Submission occurred too fast');
  });

  it('rejects an impossible number of saves for the round duration', () => {
    const session = createMockSession(10000);
    const events = Array.from({ length: 15 }, (_, i) => ({
      eventIndex: i,
      reactionTimeMs: 400,
      pointsAwarded: 150,
      comboAtRescue: 1.5,
      timestampOffsetMs: i * 500
    }));

    const outcome = ValidationService.validateRound({
      session,
      score: 2250,
      successfulSaves: 15,
      fastestRescueMs: 400,
      survivalTimeSeconds: 8, // 15 saves in 8 seconds is physically impossible
      bestCombo: 1.5,
      events
    });

    expect(outcome.isValid).toBe(false);
    expect(outcome.status).toBe('rejected');
    expect(outcome.reason).toContain('Impossible save count');
  });

  it('flags superhuman reaction times (< 100ms)', () => {
    const session = createMockSession(30000);
    const events = [
      { eventIndex: 0, reactionTimeMs: 42, pointsAwarded: 150, comboAtRescue: 1.0, timestampOffsetMs: 5000 }
    ];

    const outcome = ValidationService.validateRound({
      session,
      score: 150,
      successfulSaves: 1,
      fastestRescueMs: 42,
      survivalTimeSeconds: 25,
      bestCombo: 1.0,
      events
    });

    expect(outcome.isValid).toBe(false);
    expect(outcome.status).toBe('flagged');
    expect(outcome.reason).toContain('superhuman reaction time');
  });

  it('flags wild score discrepancies between claimed score and calculated score', () => {
    const session = createMockSession(35000);
    const events = [
      { eventIndex: 0, reactionTimeMs: 900, pointsAwarded: 137, comboAtRescue: 1.0, timestampOffsetMs: 8000 }
    ];

    const outcome = ValidationService.validateRound({
      session,
      score: 99999, // Injected high score
      successfulSaves: 1,
      fastestRescueMs: 900,
      survivalTimeSeconds: 30,
      bestCombo: 1.0,
      events
    });

    expect(outcome.isValid).toBe(false);
    expect(outcome.status).toBe('flagged');
    expect(outcome.reason).toContain('Score discrepancy');
  });

  it('accepts a legitimate fast one-rescue round (e.g., 3s duration, 1 save)', () => {
    const session = createMockSession(4000); // 4 seconds elapsed
    (session as any).roundNumber = 1;

    const events = [
      { eventIndex: 0, reactionTimeMs: 600, pointsAwarded: 147, comboAtRescue: 1.0, timestampOffsetMs: 2500 }
    ];

    const outcome = ValidationService.validateRound({
      session,
      roundNumber: 1,
      score: 147,
      roundScore: 147,
      successfulSaves: 1,
      totalCumulativeSaves: 1,
      fastestRescueMs: 600,
      survivalTimeSeconds: 3,
      bestCombo: 1.0,
      events
    });

    expect(outcome.isValid).toBe(true);
    expect(outcome.status).toBe('valid');
  });

  it('accepts a one-rescue round in later round with cumulative score and distinct roundScore', () => {
    const session = createMockSession(5000); // 5 seconds elapsed
    (session as any).roundNumber = 3;

    const events = [
      { eventIndex: 0, reactionTimeMs: 500, pointsAwarded: 210, comboAtRescue: 1.4, timestampOffsetMs: 3200 }
    ];

    const outcome = ValidationService.validateRound({
      session,
      roundNumber: 3,
      score: 550, // Cumulative score across rounds 1-3
      roundScore: 210, // Round 3 score
      successfulSaves: 1, // 1 save this round
      totalCumulativeSaves: 3,
      fastestRescueMs: 500,
      survivalTimeSeconds: 4,
      bestCombo: 1.4,
      events
    });

    expect(outcome.isValid).toBe(true);
    expect(outcome.status).toBe('valid');
  });

  it('rejects a submission where the roundNumber does not match the session roundNumber', () => {
    const session = createMockSession(10000);
    (session as any).roundNumber = 1; // Server issued session for Round 1

    const events = [
      { eventIndex: 0, reactionTimeMs: 650, pointsAwarded: 145, comboAtRescue: 1.0, timestampOffsetMs: 3000 }
    ];

    const outcome = ValidationService.validateRound({
      session,
      roundNumber: 2, // Client mistakenly submitted Round 2 against Round 1 session
      score: 145,
      successfulSaves: 1,
      fastestRescueMs: 650,
      survivalTimeSeconds: 4,
      bestCombo: 1.0,
      events
    });

    expect(outcome.isValid).toBe(false);
    expect(outcome.status).toBe('rejected');
    expect(outcome.reason).toContain('Session round mismatch');
  });

  it('rejects survival time exceeding 65 seconds', () => {
    const session = createMockSession(80000);
    const outcome = ValidationService.validateRound({
      session,
      roundNumber: 1,
      score: 100,
      successfulSaves: 1,
      fastestRescueMs: 700,
      survivalTimeSeconds: 75, // Over 65s maximum
      bestCombo: 1.0,
      events: [
        { eventIndex: 0, reactionTimeMs: 700, pointsAwarded: 100, comboAtRescue: 1.0, timestampOffsetMs: 70000 }
      ]
    });

    expect(outcome.isValid).toBe(false);
    expect(outcome.status).toBe('rejected');
    expect(outcome.reason).toContain('out of valid round bounds');
  });

  it('rejects mismatch between save count and event log count', () => {
    const session = createMockSession(20000);
    const outcome = ValidationService.validateRound({
      session,
      roundNumber: 1,
      score: 300,
      successfulSaves: 2, // Claimed 2 saves
      fastestRescueMs: 600,
      survivalTimeSeconds: 15,
      bestCombo: 1.0,
      events: [
        // But provided only 1 event
        { eventIndex: 0, reactionTimeMs: 600, pointsAwarded: 150, comboAtRescue: 1.0, timestampOffsetMs: 5000 }
      ]
    });

    expect(outcome.isValid).toBe(false);
    expect(outcome.status).toBe('rejected');
    expect(outcome.reason).toContain('Mismatch between save count');
  });
});

