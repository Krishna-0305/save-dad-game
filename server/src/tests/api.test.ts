import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../db/connection.js';
import { User } from '../models/User.js';
import { GameSession } from '../models/GameSession.js';
import { GameResult } from '../models/GameResult.js';

describe('SAVE DAD! API Integration Tests', () => {
  let app: any;
  let authCookie: string;
  let createdSessionId: string;

  beforeAll(async () => {
    await connectDB();
    // Clean up test data
    await User.deleteMany({});
    await GameSession.deleteMany({});
    await GameResult.deleteMany({});
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('rejects registration with invalid parameters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('registers a new user successfully and sets HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'son_rescuer', email: 'son@hostel.edu', password: 'SafePassword123!' });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('son_rescuer');
    expect(res.body.user.email).toBe('son@hostel.edu');
    expect(res.headers['set-cookie']).toBeDefined();

    authCookie = res.headers['set-cookie'][0];
  });

  it('rejects duplicate email and username registration', async () => {
    const resDuplicateEmail = await request(app)
      .post('/api/auth/register')
      .send({ username: 'other_user', email: 'son@hostel.edu', password: 'OtherPassword123!' });
    expect(resDuplicateEmail.status).toBe(409);

    const resDuplicateUser = await request(app)
      .post('/api/auth/register')
      .send({ username: 'son_rescuer', email: 'other@hostel.edu', password: 'OtherPassword123!' });
    expect(resDuplicateUser.status).toBe(409);
  });

  it('authenticates with valid credentials and fails on wrong password', async () => {
    const badLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'son@hostel.edu', password: 'WrongPassword' });
    expect(badLogin.status).toBe(401);

    const goodLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'son@hostel.edu', password: 'SafePassword123!' });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.user.username).toBe('son_rescuer');
  });

  it('retrieves authenticated user profile at /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('son_rescuer');
    expect(res.body.user.stats).toBeDefined();
  });

  it('creates a new server-authoritative game session', async () => {
    const res = await request(app)
      .post('/api/games/sessions')
      .set('Cookie', authCookie);

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.roundDurationSeconds).toBe(60);
    expect(res.body.serverStartTime).toBeDefined();

    createdSessionId = res.body.sessionId;
  });

  it('validates, finishes the round, and records verified results', async () => {
    // Backdate session start time by 25 seconds to simulate real gameplay elapsed duration
    await GameSession.findOneAndUpdate(
      { sessionId: createdSessionId },
      { serverStartTime: new Date(Date.now() - 25000) }
    );

    const events = [
      { eventIndex: 0, reactionTimeMs: 650, pointsAwarded: 145, comboAtRescue: 1.0, timestampOffsetMs: 5000 },
      { eventIndex: 1, reactionTimeMs: 520, pointsAwarded: 178, comboAtRescue: 1.2, timestampOffsetMs: 12000 }
    ];

    const res = await request(app)
      .post(`/api/games/sessions/${createdSessionId}/finish`)
      .set('Cookie', authCookie)
      .send({
        roundNumber: 2,
        score: 323,
        successfulSaves: 2,
        fastestRescueMs: 520,
        survivalTimeSeconds: 20,
        bestCombo: 1.2,
        events
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
    expect(res.body.result.roundNumber).toBe(2);
    expect(res.body.result.score).toBe(323);
    expect(res.body.result.successfulSaves).toBe(2);
    expect(res.body.updatedStats.highScore).toBe(323);
    expect(res.body.updatedStats.fastestRescueMs).toBe(520);
    expect(res.body.updatedStats.highestRound).toBe(2);
  });

  it('handles duplicate submission of the same completed session idempotently', async () => {
    const res = await request(app)
      .post(`/api/games/sessions/${createdSessionId}/finish`)
      .set('Cookie', authCookie)
      .send({
        roundNumber: 2,
        score: 323,
        successfulSaves: 2,
        fastestRescueMs: 520,
        survivalTimeSeconds: 20,
        bestCombo: 1.2,
        events: []
      });

    // Idempotent endpoint returns 200 with previously recorded result and unchanged stats
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('idempotent');
    expect(res.body.result).toBeDefined();
    expect(res.body.updatedStats.highScore).toBe(323);
  });

  it('rejects finishing an invalid or non-existent session with 404', async () => {
    const res = await request(app)
      .post('/api/games/sessions/non-existent-session-id/finish')
      .set('Cookie', authCookie)
      .send({
        roundNumber: 1,
        score: 150,
        successfulSaves: 1,
        survivalTimeSeconds: 5,
        bestCombo: 1.0,
        events: []
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Session not found');
  });

  it('rejects an impossible score with 400', async () => {
    // Create fresh session for validation failure test
    const newSessionRes = await request(app)
      .post('/api/games/sessions')
      .set('Cookie', authCookie)
      .send({ roundNumber: 1 });
    const freshSessionId = newSessionRes.body.sessionId;

    const res = await request(app)
      .post(`/api/games/sessions/${freshSessionId}/finish`)
      .set('Cookie', authCookie)
      .send({
        roundNumber: 1,
        score: 99999, // Impossible injected score
        successfulSaves: 1,
        fastestRescueMs: 500,
        survivalTimeSeconds: 5,
        bestCombo: 1.0,
        events: [
          { eventIndex: 0, reactionTimeMs: 500, pointsAwarded: 150, comboAtRescue: 1.0, timestampOffsetMs: 2000 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Round result was rejected');
  });

  it('retrieves global leaderboards with deterministic ranking for highest round', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=round')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.entries).toBeInstanceOf(Array);
    expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
    expect(res.body.entries[0].username).toBe('son_rescuer');
    expect(res.body.entries[0].metricValue).toBe(2);
    expect(res.body.entries[0].isCurrentUser).toBe(true);
    expect(res.body.currentUserStanding).toBeDefined();
    expect(res.body.currentUserStanding.value).toBe(2);
  });

  it('retrieves global leaderboards with deterministic ranking', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=score')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.entries).toBeInstanceOf(Array);
    expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
    expect(res.body.entries[0].username).toBe('son_rescuer');
    expect(res.body.entries[0].isCurrentUser).toBe(true);
    expect(res.body.currentUserStanding).toBeDefined();
    expect(res.body.currentUserStanding.rank).toBe(1);
  });

  it('retrieves public player profile without leaking sensitive data', async () => {
    const res = await request(app).get('/api/players/son_rescuer');
    expect(res.status).toBe(200);
    expect(res.body.player.username).toBe('son_rescuer');
    expect(res.body.player.email).toBeUndefined(); // No email leak
    expect(res.body.player.passwordHash).toBeUndefined(); // No password leak
    expect(res.body.recentGames).toBeDefined();
  });

  it('logs out and clears session cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toContain('save_dad_token=;');
  });
});
