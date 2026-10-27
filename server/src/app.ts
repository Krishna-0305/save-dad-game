import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import gameRoutes from './routes/game.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import playerRoutes from './routes/player.routes.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // CORS settings
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        return callback(null, origin);
      },
      credentials: true
    })
  );

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // stricter limit for login/register
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' }
  });

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Health check
  const healthHandler = (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // Mount API endpoints (supports both with and without /api prefix for serverless rewrites)
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/auth', authLimiter, authRoutes);

  app.use('/api/games', apiLimiter, gameRoutes);
  app.use('/games', apiLimiter, gameRoutes);

  app.use('/api/leaderboard', apiLimiter, leaderboardRoutes);
  app.use('/leaderboard', apiLimiter, leaderboardRoutes);

  app.use('/api/players', apiLimiter, playerRoutes);
  app.use('/players', apiLimiter, playerRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Centralized Error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

