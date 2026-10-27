import { Router, Response } from 'express';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

// GET /api/leaderboard?category=score|saves|fastest-rescue|combo|total-saves|round&page=1&limit=20
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const category = (req.query.category as string) || 'score';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    let sortField = 'stats.highScore';
    let sortDirection: 1 | -1 = -1;
    let categoryName = 'High Score';
    let metricUnit = 'pts';

    switch (category) {
      case 'round':
        sortField = 'stats.highestRound';
        categoryName = 'Highest Round Reached';
        metricUnit = 'Round';
        break;
      case 'saves':
        sortField = 'stats.mostSaves';
        categoryName = 'Most Saves in a Round';
        metricUnit = 'saves';
        break;
      case 'fastest-rescue':
        sortField = 'stats.fastestRescueMs';
        sortDirection = 1; // Lowest ms is best
        categoryName = 'Fastest Rescue';
        metricUnit = 'ms';
        break;
      case 'combo':
        sortField = 'stats.bestCombo';
        categoryName = 'Highest Combo';
        metricUnit = 'x';
        break;
      case 'total-saves':
        sortField = 'stats.totalSaves';
        categoryName = 'Lifetime Total Saves';
        metricUnit = 'saves';
        break;
      case 'score':
      default:
        sortField = 'stats.highScore';
        categoryName = 'Highest Score in a Round';
        metricUnit = 'pts';
        break;
    }

    const query: any = {
      accountStatus: 'active'
    };

    if (category === 'fastest-rescue') {
      query['stats.fastestRescueMs'] = { $ne: null, $gt: 0 };
    } else {
      query[sortField] = { $gt: 0 };
    }

    // Deterministic tie-breaking by updatedAt ascending (first to achieve wins tie)
    const sortObj: any = {};
    sortObj[sortField] = sortDirection;
    sortObj['updatedAt'] = 1;

    const [totalEntries, topUsers] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('username stats updatedAt createdAt')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const currentUserId = req.user?._id?.toString();

    // Map ranks with deterministic position
    const entries = topUsers.map((u, idx) => {
      const rank = skip + idx + 1;
      let metricValue = 0;
      if (category === 'round') metricValue = u.stats?.highestRound || 1;
      else if (category === 'saves') metricValue = u.stats?.mostSaves || 0;
      else if (category === 'fastest-rescue') metricValue = u.stats?.fastestRescueMs || 0;
      else if (category === 'combo') metricValue = u.stats?.bestCombo || 1;
      else if (category === 'total-saves') metricValue = u.stats?.totalSaves || 0;
      else metricValue = u.stats?.highScore || 0;

      return {
        rank,
        username: u.username,
        metricValue,
        metricUnit,
        stats: u.stats,
        isCurrentUser: currentUserId ? u._id.toString() === currentUserId : false,
        achievedAt: u.updatedAt
      };
    });

    // If current user is logged in, find their exact rank in this category
    let currentUserRank: number | null = null;
    let currentUserValue: number | null = null;

    if (req.user) {
      let myValue: number | null = null;
      if (category === 'round') myValue = req.user.stats.highestRound || 1;
      else if (category === 'saves') myValue = req.user.stats.mostSaves;
      else if (category === 'fastest-rescue') myValue = req.user.stats.fastestRescueMs;
      else if (category === 'combo') myValue = req.user.stats.bestCombo;
      else if (category === 'total-saves') myValue = req.user.stats.totalSaves;
      else myValue = req.user.stats.highScore;

      currentUserValue = myValue;

      if (myValue && myValue > 0) {
        const higherRankQuery: any = {
          accountStatus: 'active'
        };

        if (sortDirection === -1) {
          higherRankQuery['$or'] = [
            { [sortField]: { $gt: myValue } },
            { [sortField]: myValue, updatedAt: { $lt: req.user.updatedAt } }
          ];
        } else {
          higherRankQuery['$or'] = [
            { [sortField]: { $lt: myValue, $gt: 0 } },
            { [sortField]: myValue, updatedAt: { $lt: req.user.updatedAt } }
          ];
        }

        const countAhead = await User.countDocuments(higherRankQuery);
        currentUserRank = countAhead + 1;
      }
    }

    res.json({
      category,
      categoryName,
      metricUnit,
      page,
      limit,
      totalPages: Math.ceil(totalEntries / limit) || 1,
      totalEntries,
      entries,
      currentUserStanding: currentUserRank
        ? {
            rank: currentUserRank,
            username: req.user?.username,
            value: currentUserValue,
            metricUnit
          }
        : null
    });
  } catch (err: any) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard data' });
  }
});

export default router;
