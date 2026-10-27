import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/save-dad',
  JWT_SECRET: process.env.JWT_SECRET || 'save-dad-super-secret-key-3d-runner-2026',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  COOKIE_NAME: 'save_dad_token',
  SESSION_DURATION_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  GAME_ROUND_SECONDS: 60,
  GRACE_PERIOD_SECONDS: 15 // Network latency buffer
};
