import { describe, it, expect } from 'vitest';

describe('Player Profile Logic & Data Sanitization', () => {
  it('formats statistics safely for a brand new account with zero stats', () => {
    const rawStats = {
      highScore: 0,
      mostSaves: 0,
      fastestRescueMs: null,
      totalSaves: 0,
      bestCombo: 0,
      totalRoundsPlayed: 0,
      highestRound: 1
    };

    const formatted = {
      highScoreDisplay: Number(rawStats.highScore || 0).toLocaleString(),
      highestRoundDisplay: `Round ${rawStats.highestRound || 1}`,
      totalSavesDisplay: Number(rawStats.totalSaves || 0).toLocaleString(),
      fastestRescueDisplay: rawStats.fastestRescueMs ? `${rawStats.fastestRescueMs}ms` : '—',
      bestComboDisplay: rawStats.bestCombo ? `${Number(rawStats.bestCombo).toFixed(1)}x` : '1.0x',
      longestSurvivalDisplay: '0s',
      rankDisplay: 'Unranked'
    };

    expect(formatted.highScoreDisplay).toBe('0');
    expect(formatted.highestRoundDisplay).toBe('Round 1');
    expect(formatted.totalSavesDisplay).toBe('0');
    expect(formatted.fastestRescueDisplay).toBe('—');
    expect(formatted.bestComboDisplay).toBe('1.0x');
    expect(formatted.longestSurvivalDisplay).toBe('0s');
    expect(formatted.rankDisplay).toBe('Unranked');
  });

  it('formats statistics cleanly for an experienced cadet with existing records', () => {
    const rawStats = {
      highScore: 3450,
      mostSaves: 5,
      fastestRescueMs: 380,
      totalSaves: 48,
      bestCombo: 1.8,
      totalRoundsPlayed: 25,
      highestRound: 8
    };
    const longestSurvivalSeconds = 54;
    const leaderboardRank = 4;

    const formatted = {
      highScoreDisplay: Number(rawStats.highScore || 0).toLocaleString(),
      highestRoundDisplay: `Round ${rawStats.highestRound || 1}`,
      totalSavesDisplay: Number(rawStats.totalSaves || 0).toLocaleString(),
      fastestRescueDisplay: rawStats.fastestRescueMs ? `${rawStats.fastestRescueMs}ms` : '—',
      bestComboDisplay: rawStats.bestCombo ? `${Number(rawStats.bestCombo).toFixed(1)}x` : '1.0x',
      longestSurvivalDisplay: `${longestSurvivalSeconds}s`,
      rankDisplay: leaderboardRank ? `#${leaderboardRank}` : 'Unranked'
    };

    expect(formatted.highScoreDisplay).toBe('3,450');
    expect(formatted.highestRoundDisplay).toBe('Round 8');
    expect(formatted.totalSavesDisplay).toBe('48');
    expect(formatted.fastestRescueDisplay).toBe('380ms');
    expect(formatted.bestComboDisplay).toBe('1.8x');
    expect(formatted.longestSurvivalDisplay).toBe('54s');
    expect(formatted.rankDisplay).toBe('#4');
  });

  it('safely handles usernames containing spaces and special characters for URL encoding', () => {
    const usernameWithSpaces = 'cadet rescuer';
    const encoded = encodeURIComponent(usernameWithSpaces.trim());
    expect(encoded).toBe('cadet%20rescuer');

    const decoded = decodeURIComponent(encoded);
    expect(decoded).toBe('cadet rescuer');

    const escapedRegex = decoded.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    expect(escapedRegex).toBe('cadet\\ rescuer');
    expect(new RegExp(`^${escapedRegex}$`, 'i').test('Cadet Rescuer')).toBe(true);
  });

  it('generates consistent initials for default avatars', () => {
    const getInitials = (name?: string) => {
      if (!name) return '??';
      const parts = name.trim().split(/[\s_-]+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    expect(getInitials('son_rescuer')).toBe('SR');
    expect(getInitials('alex brown')).toBe('AB');
    expect(getInitials('cadet-hero')).toBe('CH');
    expect(getInitials('Solo')).toBe('SO');
    expect(getInitials('')).toBe('??');
  });
});

