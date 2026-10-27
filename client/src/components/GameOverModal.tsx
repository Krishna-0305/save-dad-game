import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Shield, Zap, Clock, RotateCcw, Award, CheckCircle, AlertTriangle, ArrowRight, Play } from 'lucide-react';
import { RescueEventSummary, RoundDifficultyConfig } from '../types/game.js';

interface GameOverModalProps {
  outcome: 'GAME_OVER' | 'ROUND_COMPLETE';
  stats: {
    roundNumber: number;
    score: number;
    successfulSaves: number;
    fastestRescueMs: number | null;
    survivalTimeSeconds: number;
    bestCombo: number;
    events: RescueEventSummary[];
    failureReason?: string;
  };
  nextRoundPreview?: RoundDifficultyConfig | null;
  validationStatus: 'idle' | 'submitting' | 'verified' | 'rejected' | 'guest';
  validationMessage?: string;
  onContinueNextRound: () => void;
  onRetryRound: () => void;
  onOpenLeaderboard: () => void;
  onBackToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  outcome,
  stats,
  nextRoundPreview,
  validationStatus,
  validationMessage,
  onContinueNextRound,
  onRetryRound,
  onOpenLeaderboard,
  onBackToMenu
}) => {
  const isVictory = outcome === 'ROUND_COMPLETE';

  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isVictory]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      backgroundColor: 'rgba(10, 15, 26, 0.92)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div className="glass-panel-neon" style={{
        maxWidth: 560,
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: 30,
        textAlign: 'center',
        borderColor: isVictory ? 'rgba(0, 230, 118, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      }}>
        {/* Outcome Header */}
        <span style={{
          fontSize: '0.85rem',
          letterSpacing: 2,
          color: isVictory ? '#00e676' : '#ef4444',
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          {isVictory ? `ROUND ${stats.roundNumber} COMPLETED` : `ROUND ${stats.roundNumber} FAILED`}
        </span>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '3.6rem',
          lineHeight: 1,
          letterSpacing: 2,
          color: isVictory ? '#00e676' : '#ef4444',
          marginTop: 4,
          marginBottom: 8
        }}>
          {isVictory ? 'DAD IS SAFE!' : 'COLLISION!'}
        </h2>

        <p style={{ color: '#cbd5e1', fontSize: '1.05rem', marginBottom: 20 }}>
          {isVictory
            ? `You survived all 60 seconds of traffic and successfully saved Dad ${stats.successfulSaves} times!`
            : (stats.failureReason || 'A motorcycle collided before rescue was completed. Dad needs you!')}
        </p>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 20
        }}>
          {/* Final Score */}
          <div className="glass-panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#f59e0b', marginBottom: 4 }}>
              <Trophy size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ROUND SCORE</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', lineHeight: 1 }}>
              {stats.score.toLocaleString()}
            </div>
          </div>

          {/* Saves */}
          <div className="glass-panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#00e676', marginBottom: 4 }}>
              <Shield size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>SAVES</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', lineHeight: 1, color: '#00e676' }}>
              {stats.successfulSaves}
            </div>
          </div>

          {/* Fastest Rescue */}
          <div className="glass-panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#38bdf8', marginBottom: 4 }}>
              <Zap size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>FASTEST SAVE</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>
              {stats.fastestRescueMs ? `${stats.fastestRescueMs}ms` : '—'}
            </div>
          </div>

          {/* Survival Time & Combo */}
          <div className="glass-panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#a855f7', marginBottom: 4 }}>
              <Clock size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>SURVIVED</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>
              {stats.survivalTimeSeconds}s ({stats.bestCombo.toFixed(1)}x)
            </div>
          </div>
        </div>

        {/* Next Round Difficulty Preview (on Victory) */}
        {isVictory && nextRoundPreview && (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            textAlign: 'left',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1 }}>
                NEXT CHALLENGE: ROUND {nextRoundPreview.round}
              </span>
              <span style={{ fontSize: '0.8rem', background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                {nextRoundPreview.speedName}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 6 }}>
              <div>&bull; Traffic Speed: <strong>{nextRoundPreview.motorcycleSpeed} u/s</strong></div>
              <div>&bull; Warning Time: <strong>{nextRoundPreview.warningDurationSec}s</strong></div>
              <div>&bull; Traffic Density: <strong>{nextRoundPreview.densityName}</strong></div>
              <div>&bull; Rescue Window: <strong>{nextRoundPreview.rescueWindowSec}s</strong></div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
              {nextRoundPreview.description}
            </p>
          </div>
        )}

        {/* Server Validation Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 20,
          background: validationStatus === 'verified'
            ? 'rgba(0, 230, 118, 0.15)'
            : validationStatus === 'rejected'
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(56, 189, 248, 0.15)',
          color: validationStatus === 'verified'
            ? '#00e676'
            : validationStatus === 'rejected'
            ? '#ef4444'
            : '#38bdf8',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: 20
        }}>
          {validationStatus === 'verified' && <CheckCircle size={16} />}
          {validationStatus === 'rejected' && <AlertTriangle size={16} />}
          <span>
            {validationStatus === 'verified' && `Round ${stats.roundNumber} Verified & Recorded to Global Leaderboard`}
            {validationStatus === 'submitting' && 'Server Anti-Cheat Verification in progress...'}
            {validationStatus === 'rejected' && `Verification Rejected: ${validationMessage}`}
            {validationStatus === 'guest' && 'Practice Round (Log in to save high rounds to Leaderboard)'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isVictory ? (
            <button
              onClick={onContinueNextRound}
              className="btn-action"
              style={{
                padding: '14px',
                fontSize: '1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10
              }}
            >
              <span>CONTINUE TO ROUND {stats.roundNumber + 1}</span>
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              onClick={onRetryRound}
              className="btn-action"
              style={{
                padding: '14px',
                fontSize: '1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10
              }}
            >
              <RotateCcw size={20} />
              <span>RETRY ROUND {stats.roundNumber}</span>
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={onOpenLeaderboard}
              className="btn-secondary"
              style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Award size={18} />
              <span>LEADERBOARDS</span>
            </button>

            <button
              onClick={onBackToMenu}
              className="btn-secondary"
              style={{ padding: '12px' }}
            >
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
