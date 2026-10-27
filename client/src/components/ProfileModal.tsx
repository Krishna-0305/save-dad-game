import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { Trophy, Shield, Zap, Flame, Award, Clock, Compass, LogOut, X, RefreshCw, UserCheck } from 'lucide-react';

interface ProfileModalProps {
  username?: string | null;
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ username, onClose, onOpenAuth }) => {
  const { user, logout } = useAuth();

  const isViewingOther = Boolean(username && username.trim().toLowerCase() !== user?.username?.toLowerCase());
  const targetUsername = isViewingOther ? username!.trim() : user?.username;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    // If not viewing another player and not logged in, show guest state without network failure
    if (!isViewingOther && !user) {
      setLoading(false);
      return;
    }

    try {
      if (isViewingOther && targetUsername) {
        const data = await api.getPublicProfile(targetUsername);
        setProfileData(data);
      } else {
        const data = await api.getMyStats();
        setProfileData(data);
      }
    } catch (err: any) {
      console.error('Failed to load player profile:', err);
      setError(err.message || 'Player profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, user]);

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // Helper to extract initials for default avatar
  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/[\s_-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Safe fallback stats to ensure no undefined, null, or NaN ever leaks
  const stats = profileData?.player?.stats || user?.stats || {
    highScore: 0,
    mostSaves: 0,
    fastestRescueMs: null,
    totalSaves: 0,
    bestCombo: 1.0,
    totalRoundsPlayed: 0,
    highestRound: 1
  };

  const displayName = profileData?.player?.username || targetUsername || user?.username || 'Cadet';
  const displayEmail = !isViewingOther && user?.email ? user.email : null;
  const memberSince = profileData?.player?.memberSince
    ? new Date(profileData.player.memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Recent Cadet';
  const longestSurvivalSeconds = profileData?.player?.longestSurvivalSeconds ?? 0;
  const leaderboardRank = profileData?.player?.leaderboardRank ?? null;
  const recentGames = profileData?.recentGames || [];

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
        maxWidth: 640,
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn-secondary"
          style={{ position: 'absolute', top: 20, right: 20, padding: 6, zIndex: 10 }}
          aria-label="Close Profile"
        >
          <X size={18} />
        </button>

        {/* Unauthenticated Guest State */}
        {!isViewingOther && !user && (
          <div style={{ textAlign: 'center', padding: '40px 10px' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '2px dashed #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#38bdf8'
            }}>
              <Shield size={36} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', letterSpacing: 2, marginBottom: 8 }}>
              UNAUTHENTICATED CADET
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
              You are currently playing in Guest Practice Mode. Sign in or register to record verified high scores, track lifetime rescues, and climb the global leaderboard!
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="btn-action"
                style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <UserCheck size={18} />
                <span>SIGN IN / REGISTER</span>
              </button>
              <button onClick={onClose} className="btn-secondary" style={{ padding: '12px 20px' }}>
                CONTINUE AS GUEST
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (isViewingOther || user) && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#38bdf8' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-accent)', letterSpacing: 1 }}>DECRYPTING CADET DOSSIER...</div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
              {error}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>
              The requested cadet profile could not be retrieved from the server.
            </p>
            <button onClick={fetchProfile} className="btn-secondary" style={{ padding: '8px 16px' }}>
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Successful Profile Content */}
        {!loading && !error && (isViewingOther || user) && (
          <>
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              {/* Default Avatar Badge */}
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
                border: '2px solid #38bdf8',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                color: '#ffffff',
                letterSpacing: 1,
                flexShrink: 0
              }}>
                {getInitials(displayName)}
              </div>

              {/* Name & Metadata */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', letterSpacing: 2, fontWeight: 700 }}>
                    {isViewingOther ? 'PUBLIC CADET DOSSIER' : 'AUTHENTICATED CADET DOSSIER'}
                  </span>
                  {leaderboardRank !== null && (
                    <span style={{
                      fontSize: '0.7rem',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#f59e0b',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 700
                    }}>
                      GLOBAL #{leaderboardRank}
                    </span>
                  )}
                </div>

                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.4rem',
                  lineHeight: 1.1,
                  letterSpacing: 1.5,
                  margin: '2px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {displayName}
                </h2>

                <div style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {displayEmail && <span>{displayEmail} &bull;</span>}
                  <span>Cadet since {memberSince}</span>
                </div>
              </div>
            </div>

            {/* Statistics Cards (2x4 Grid) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              marginBottom: 18
            }}>
              {/* 1. High Score */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', marginBottom: 4 }}>
                  <Trophy size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>HIGH SCORE</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1 }}>
                  {Number(stats.highScore || 0).toLocaleString()}
                </div>
              </div>

              {/* 2. Highest Round Reached */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8', marginBottom: 4 }}>
                  <Compass size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>MAX ROUND</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1, color: '#38bdf8' }}>
                  Round {Number(stats.highestRound || 1)}
                </div>
              </div>

              {/* 3. Total Rescues */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ec4899', marginBottom: 4 }}>
                  <Award size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>TOTAL SAVES</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1 }}>
                  {Number(stats.totalSaves || 0).toLocaleString()}
                </div>
              </div>

              {/* 4. Fastest Rescue Time */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#00e676', marginBottom: 4 }}>
                  <Zap size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>FASTEST REACTION</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1, color: '#00e676' }}>
                  {stats.fastestRescueMs ? `${stats.fastestRescueMs}ms` : '—'}
                </div>
              </div>

              {/* 5. Best Combo */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fb923c', marginBottom: 4 }}>
                  <Flame size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>BEST COMBO</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1 }}>
                  {stats.bestCombo ? `${Number(stats.bestCombo).toFixed(1)}x` : '1.0x'}
                </div>
              </div>

              {/* 6. Longest Survival */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#a855f7', marginBottom: 4 }}>
                  <Clock size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>MAX SURVIVAL</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1 }}>
                  {Number(longestSurvivalSeconds || 0)}s
                </div>
              </div>

              {/* 7. Most Saves in Round */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#00e676', marginBottom: 4 }}>
                  <Shield size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>MOST IN ROUND</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1 }}>
                  {Number(stats.mostSaves || 0)}
                </div>
              </div>

              {/* 8. Leaderboard Position */}
              <div className="glass-panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#eab308', marginBottom: 4 }}>
                  <Trophy size={14} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>GLOBAL RANK</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1, color: leaderboardRank ? '#eab308' : '#64748b' }}>
                  {leaderboardRank ? `#${leaderboardRank}` : 'Unranked'}
                </div>
              </div>
            </div>

            {/* Recent Ranked Rounds */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.85rem', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>
                RECENT VERIFIED ROUND RESULTS
              </h3>
              {recentGames.length === 0 ? (
                <div style={{
                  padding: '18px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 6,
                  color: '#64748b',
                  fontSize: '0.85rem',
                  textAlign: 'center'
                }}>
                  No ranked rounds recorded yet. Complete Round 1 to start your verified record!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentGames.map((g: any, idx: number) => (
                    <div
                      key={g._id || `game-${idx}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: '0.75rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 700
                        }}>
                          R{g.roundNumber || 1}
                        </span>
                        <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {Number(g.score || 0).toLocaleString()} pts
                        </span>
                        <span style={{ color: '#64748b' }}>
                          &bull; {g.successfulSaves || 0} {g.successfulSaves === 1 ? 'save' : 'saves'}
                        </span>
                        {g.fastestRescueMs && (
                          <span style={{ color: '#00e676', fontSize: '0.75rem' }}>
                            ({g.fastestRescueMs}ms)
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {g.submittedAt ? new Date(g.submittedAt).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              {!isViewingOther && user && (
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <LogOut size={16} />
                  <span>SIGN OUT</span>
                </button>
              )}
              <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 20px' }}>
                CLOSE
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
