import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { GameResult } from '../models/GameResult.js';

const router = Router();

// GET /api/players/me/stats - Authenticated user's detailed statistics & history
router.get('/me/stats', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // Fetch recent 10 game results
    const recentGames = await GameResult.find({ playerId: user._id })
      .sort({ submittedAt: -1 })
      .limit(10)
      .select('roundNumber score successfulSaves fastestRescueMs survivalTimeSeconds bestCombo validationStatus submittedAt')
      .lean();

    // Longest survival time across all games played
    const maxSurvival = await GameResult.findOne({ playerId: user._id })
      .sort({ survivalTimeSeconds: -1 })
      .select('survivalTimeSeconds')
      .lean();
    const longestSurvivalSeconds = maxSurvival?.survivalTimeSeconds ?? 0;

    // Global leaderboard standing by high score
    let leaderboardRank: number | null = null;
    if (user.stats && user.stats.highScore > 0) {
      const betterCount = await User.countDocuments({
        accountStatus: 'active',
        'stats.highScore': { $gt: user.stats.highScore }
      });
      leaderboardRank = betterCount + 1;
    }

    res.json({
      player: {
        username: user.username,
        email: user.email,
        memberSince: user.createdAt,
        stats: user.stats,
        longestSurvivalSeconds,
        leaderboardRank
      },
      recentGames
    });
  } catch (err: any) {
    console.error('Player stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve player statistics' });
  }
});

// GET /api/players/:username - Public player profile (sanitized)
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawUsername = String(req.params.username || '').trim();
    if (!rawUsername) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    // Safely decode URL component for usernames containing spaces or special characters
    const username = decodeURIComponent(rawUsername);
    const escapedUsername = username.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const user = await User.findOne({
      username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') },
      accountStatus: 'active'
    }).select('username stats createdAt').lean();

    if (!user) {
      res.status(404).json({ error: 'Player profile not found' });
      return;
    }

    // Only public verified game summaries
    const recentGames = await GameResult.find({ playerId: user._id, validationStatus: 'valid' })
      .sort({ submittedAt: -1 })
      .limit(10)
      .select('roundNumber score successfulSaves fastestRescueMs survivalTimeSeconds bestCombo submittedAt')
      .lean();

    // Longest survival time across verified games
    const maxSurvival = await GameResult.findOne({ playerId: user._id, validationStatus: 'valid' })
      .sort({ survivalTimeSeconds: -1 })
      .select('survivalTimeSeconds')
      .lean();
    const longestSurvivalSeconds = maxSurvival?.survivalTimeSeconds ?? 0;

    // Global leaderboard standing by high score
    let leaderboardRank: number | null = null;
    if (user.stats && user.stats.highScore > 0) {
      const betterCount = await User.countDocuments({
        accountStatus: 'active',
        'stats.highScore': { $gt: user.stats.highScore }
      });
      leaderboardRank = betterCount + 1;
    }

    // Public sanitized profile: omit sensitive fields (password, email, session data)
    res.json({
      player: {
        username: user.username,
        memberSince: user.createdAt,
        stats: user.stats,
        longestSurvivalSeconds,
        leaderboardRank
      },
      recentGames
    });
  } catch (err: any) {
    console.error('Public profile error:', err);
    res.status(500).json({ error: 'Failed to retrieve player profile' });
  }
});

export default router;
