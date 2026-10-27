import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { GameSession } from '../models/GameSession.js';
import { GameResult } from '../models/GameResult.js';
import { User } from '../models/User.js';
import { ValidationService } from '../services/validation.service.js';
import { config } from '../config/env.js';

const router = Router();

const createSessionSchema = z.object({
  roundNumber: z.number().min(1).default(1)
}).optional();

const finishSessionSchema = z.object({
  roundNumber: z.number().min(1).default(1),
  score: z.number().min(0),
  roundScore: z.number().min(0).optional(),
  totalCumulativeSaves: z.number().min(0).optional(),
  successfulSaves: z.number().min(0),
  fastestRescueMs: z.number().nullable().optional(),
  survivalTimeSeconds: z.number().min(0).max(120),
  bestCombo: z.number().min(1),
  failureReason: z.string().optional(),
  events: z.array(
    z.object({
      eventIndex: z.number(),
      reactionTimeMs: z.number(),
      pointsAwarded: z.number(),
      comboAtRescue: z.number(),
      timestampOffsetMs: z.number()
    })
  ).default([])
});

// POST /api/games/sessions - Start a ranked game session
router.post('/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const sessionId = uuidv4();
    const serverStartTime = new Date();

    const parsed = createSessionSchema?.safeParse(req.body);
    const roundNumber = parsed && parsed.success && parsed.data ? parsed.data.roundNumber : 1;

    const session = await GameSession.create({
      sessionId,
      playerId: user._id,
      serverStartTime,
      roundNumber,
      status: 'active',
      expectedDurationSeconds: config.GAME_ROUND_SECONDS,
      gameVersion: '1.0.0'
    });

    res.status(201).json({
      sessionId: session.sessionId,
      roundNumber: session.roundNumber,
      serverStartTime: session.serverStartTime,
      roundDurationSeconds: config.GAME_ROUND_SECONDS
    });
  } catch (err: any) {
    console.error('Failed to create game session:', err);
    res.status(500).json({ error: 'Failed to initialize game session' });
  }
});

// POST /api/games/sessions/:id/finish - Validate and record round result
router.post('/sessions/:id/finish', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id: sessionId } = req.params;

    const parseResult = finishSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid round submission data', details: parseResult.error.errors });
      return;
    }

    const submission = parseResult.data;

    // 1. Verify session existence and ownership
    const session = await GameSession.findOne({ sessionId });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.playerId.toString() !== user._id.toString()) {
      res.status(403).json({ error: 'Session does not belong to the current authenticated user' });
      return;
    }

    // 2. Prevent duplicate submission / idempotent completion for retries
    if (session.status === 'completed') {
      const existingResult = await GameResult.findOne({ sessionId: session.sessionId });
      const currentUser = await User.findById(user._id);
      res.status(200).json({
        message: 'Round result accepted and recorded (idempotent)',
        result: existingResult ? {
          id: existingResult._id,
          roundNumber: existingResult.roundNumber,
          score: existingResult.score,
          successfulSaves: existingResult.successfulSaves,
          fastestRescueMs: existingResult.fastestRescueMs,
          survivalTimeSeconds: existingResult.survivalTimeSeconds,
          bestCombo: existingResult.bestCombo,
          validationStatus: existingResult.validationStatus
        } : null,
        updatedStats: currentUser?.stats
      });
      return;
    }

    if (session.status !== 'active') {
      res.status(409).json({ error: 'This game session is not active and cannot be finalized' });
      return;
    }

    // 3. Server-authoritative validation
    const validation = ValidationService.validateRound({
      session,
      roundNumber: submission.roundNumber || session.roundNumber,
      score: submission.score,
      roundScore: submission.roundScore,
      totalCumulativeSaves: submission.totalCumulativeSaves,
      successfulSaves: submission.successfulSaves,
      fastestRescueMs: submission.fastestRescueMs ?? null,
      survivalTimeSeconds: submission.survivalTimeSeconds,
      bestCombo: submission.bestCombo,
      events: submission.events
    });

    if (validation.status === 'rejected') {
      session.status = 'abandoned';
      session.completedAt = new Date();
      session.resultMetadata = { rejectedReason: validation.reason };
      await session.save();

      res.status(400).json({
        error: 'Round result was rejected by server-side verification',
        reason: validation.reason
      });
      return;
    }

    // Mark session as completed
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    const activeRound = submission.roundNumber || session.roundNumber || 1;

    // 4. Record result
    const gameResult = await GameResult.create({
      playerId: user._id,
      sessionId: session.sessionId,
      roundNumber: activeRound,
      score: submission.score,
      successfulSaves: submission.successfulSaves,
      fastestRescueMs: submission.fastestRescueMs ?? null,
      survivalTimeSeconds: submission.survivalTimeSeconds,
      bestCombo: submission.bestCombo,
      validationStatus: validation.status,
      validationReason: validation.reason,
      failureReason: submission.failureReason,
      events: submission.events,
      submittedAt: new Date()
    });

    // 5. Atomic personal best update
    const totalSavesToRecord = submission.totalCumulativeSaves ?? submission.successfulSaves;
    const userUpdate: any = {
      $inc: {
        'stats.totalSaves': submission.successfulSaves,
        'stats.totalRoundsPlayed': 1
      },
      $max: {
        'stats.highScore': submission.score,
        'stats.mostSaves': totalSavesToRecord,
        'stats.bestCombo': submission.bestCombo,
        'stats.highestRound': activeRound
      }
    };

    if (submission.fastestRescueMs && submission.fastestRescueMs > 0) {
      if (user.stats.fastestRescueMs === null || user.stats.fastestRescueMs === undefined) {
        userUpdate.$set = { ...(userUpdate.$set || {}), 'stats.fastestRescueMs': submission.fastestRescueMs };
      } else if (submission.fastestRescueMs < user.stats.fastestRescueMs) {
        userUpdate.$min = { 'stats.fastestRescueMs': submission.fastestRescueMs };
      }
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, userUpdate, { new: true });

    res.status(200).json({
      message: 'Round result accepted and recorded',
      result: {
        id: gameResult._id,
        roundNumber: gameResult.roundNumber,
        score: gameResult.score,
        successfulSaves: gameResult.successfulSaves,
        fastestRescueMs: gameResult.fastestRescueMs,
        survivalTimeSeconds: gameResult.survivalTimeSeconds,
        bestCombo: gameResult.bestCombo,
        validationStatus: gameResult.validationStatus
      },
      updatedStats: updatedUser?.stats
    });
  } catch (err: any) {
    console.error('Session finish error:', err);
    res.status(500).json({ error: 'Failed to process round completion' });
  }
});

export default router;
