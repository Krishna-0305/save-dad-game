import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { LeaderboardEntry } from '../types/game.js';
import { Trophy, Shield, Zap, Flame, Award, ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';

interface LeaderboardModalProps {
  onClose: () => void;
  onViewProfile?: (username: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, onViewProfile }) => {
  const [category, setCategory] = useState<string>('score');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentUserStanding, setCurrentUserStanding] = useState<any>(null);

  const categories = [
    { id: 'round', label: 'Highest Round', icon: Compass },
    { id: 'score', label: 'Score', icon: Trophy },
    { id: 'saves', label: 'Most Saves', icon: Shield },
    { id: 'fastest-rescue', label: 'Fastest Save', icon: Zap },
    { id: 'combo', label: 'Highest Combo', icon: Flame },
    { id: 'total-saves', label: 'Lifetime Saves', icon: Award }
  ];

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLeaderboard(category, page, 10);
      setEntries(data.entries);
      setTotalPages(data.totalPages);
      setCurrentUserStanding(data.currentUserStanding);
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [category, page]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 70,
      backgroundColor: 'rgba(10, 15, 26, 0.92)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div className="glass-panel-neon" style={{
        maxWidth: 720,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', lineHeight: 1, letterSpacing: 2 }}>
              GLOBAL LEADERBOARDS
            </h2>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Only server-verified ranked sessions are recorded.
            </span>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: 8 }}>
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 16
        }}>
          {categories.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategory(c.id);
                  setPage(1);
                }}
                className={active ? 'btn-action' : 'btn-secondary'}
                style={{
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current User Standing Banner */}
        {currentUserStanding && (
          <div style={{
            padding: '10px 16px',
            marginBottom: 12,
            borderRadius: 8,
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>
              YOUR RANK: #{currentUserStanding.rank}
            </span>
            <span style={{ fontFamily: 'var(--font-accent)', fontWeight: 700, fontSize: '1.1rem' }}>
              {currentUserStanding.value} {currentUserStanding.metricUnit}
            </span>
          </div>
        )}

        {/* Leaderboard Table / Content */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              Loading global rankings...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              No verified records yet in this category. Be the first to save Dad!
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#64748b', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '8px 12px' }}>RANK</th>
                  <th style={{ padding: '8px 12px' }}>PLAYER</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>RECORD</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.rank}
                    onClick={() => {
                      if (onViewProfile) {
                        onViewProfile(entry.username);
                      }
                    }}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      backgroundColor: entry.isCurrentUser ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      fontWeight: entry.isCurrentUser ? 700 : 500,
                      cursor: onViewProfile ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease'
                    }}
                    title={`View ${entry.username}'s profile`}
                  >
                    <td style={{ padding: '12px', fontFamily: 'var(--font-accent)' }}>
                      {entry.rank === 1 ? '🥇 1' : entry.rank === 2 ? '🥈 2' : entry.rank === 3 ? '🥉 3' : `#${entry.rank}`}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: entry.isCurrentUser ? '#38bdf8' : '#f1f5f9', textDecoration: onViewProfile ? 'underline' : 'none' }}>
                        {entry.username} {entry.isCurrentUser && '(You)'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
                      {entry.metricValue.toLocaleString()}{' '}
                      <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{entry.metricUnit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, opacity: page <= 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={16} />
            <span>PREV</span>
          </button>

          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-secondary"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, opacity: page >= totalPages ? 0.5 : 1 }}
          >
            <span>NEXT</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

