import React from 'react';
import { Volume2, VolumeX, Pause, Shield, Zap, Flame, AlertCircle } from 'lucide-react';
import { DangerWarning } from '../types/game.js';

interface HUDProps {
  score: number;
  saves: number;
  combo: number;
  timeLeft: number;
  roundNumber: number;
  speedName: string;
  danger: DangerWarning;
  isMuted: boolean;
  rescueSuccessFlash: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onToggleDebug: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  saves,
  combo,
  timeLeft,
  roundNumber,
  speedName,
  danger,
  isMuted,
  rescueSuccessFlash,
  onToggleMute,
  onPause,
  onToggleDebug
}) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {/* Top Bar */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        {/* Left: Round & Score & Saves & Combo */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Round & Difficulty Level Card */}
          <div className="glass-panel" style={{
            padding: '10px 18px',
            pointerEvents: 'auto',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)',
            borderColor: 'rgba(56, 189, 248, 0.5)'
          }}>
            <span style={{ fontSize: '0.75rem', letterSpacing: 2, color: '#38bdf8', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              ROUND {roundNumber}
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', lineHeight: 1, color: '#f8fafc' }}>
              {speedName}
            </div>
          </div>

          {/* Score Card */}
          <div className="glass-panel" style={{ padding: '10px 18px', pointerEvents: 'auto' }}>
            <span style={{ fontSize: '0.75rem', letterSpacing: 2, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
              SCORE
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', lineHeight: 1, color: '#f8fafc' }}>
              {score.toLocaleString()}
            </div>
          </div>

          {/* Saves Card */}
          <div className="glass-panel" style={{ padding: '10px 18px', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color="#00e676" />
            <div>
              <span style={{ fontSize: '0.75rem', letterSpacing: 2, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                SAVES
              </span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', lineHeight: 1, color: '#00e676' }}>
                {saves}
              </div>
            </div>
          </div>

          {/* Combo Multiplier */}
          {combo > 1 && (
            <div className="glass-panel" style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.15)',
              animation: 'bounce 0.8s infinite alternate'
            }}>
              <Flame size={20} color="#f59e0b" />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: '#fbbf24' }}>
                {combo.toFixed(1)}x COMBO
              </div>
            </div>
          )}
        </div>

        {/* Center: 60s Countdown Timer */}
        <div className="glass-panel-neon" style={{
          padding: '8px 24px',
          textAlign: 'center',
          borderColor: timeLeft <= 10 ? '#ef4444' : 'rgba(56, 189, 248, 0.4)',
          background: timeLeft <= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.8)'
        }}>
          <span style={{ fontSize: '0.75rem', letterSpacing: 2, color: timeLeft <= 10 ? '#fca5a5' : '#38bdf8', textTransform: 'uppercase' }}>
            ROUND TIMER
          </span>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3rem',
            lineHeight: 1,
            color: timeLeft <= 10 ? '#ef4444' : '#f8fafc',
            fontWeight: 700
          }}>
            {timeLeft}s
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
          <button
            onClick={onToggleDebug}
            className="btn-secondary"
            title="Toggle Debug (F3)"
            style={{ padding: '10px 14px', fontSize: '0.85rem' }}
          >
            F3
          </button>
          <button
            onClick={onToggleMute}
            className="btn-secondary"
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{ padding: '10px' }}
          >
            {isMuted ? <VolumeX size={20} color="#ef4444" /> : <Volume2 size={20} color="#38bdf8" />}
          </button>
          <button
            onClick={onPause}
            className="btn-secondary"
            title="Pause (Esc)"
            style={{ padding: '10px' }}
          >
            <Pause size={20} />
          </button>
        </div>
      </div>

      {/* Brief Rescue Success Effect Banner (<= 0.5s) */}
      {rescueSuccessFlash && (
        <div style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          padding: '14px 34px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #00e676 0%, #059669 100%)',
          boxShadow: '0 0 50px rgba(0, 230, 118, 0.9)',
          color: '#064e3b',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3.2rem', lineHeight: 1, letterSpacing: 2, fontWeight: 700 }}>
            DAD SAVED!
          </div>
          <div style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: 1, color: '#ecfdf5' }}>
            STARTING ROUND {roundNumber + 1}...
          </div>
        </div>
      )}

      {/* Danger Warning Alert Bar */}
      {!rescueSuccessFlash && danger.active && (
        <div style={{
          position: 'absolute',
          top: 110,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 24px',
          borderRadius: 30,
          background: 'rgba(220, 38, 38, 0.9)',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.8)',
          animation: 'pulse 0.5s infinite'
        }}>
          <AlertCircle size={24} color="#ffffff" />
          <span style={{ fontFamily: 'var(--font-accent)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: 1 }}>
            WARNING: MOTORCYCLE {danger.motorcycleDirection === 'left' ? 'FROM NORTH' : 'FROM SOUTH'} — {Math.round(danger.distanceToDad)}m AWAY!
          </span>
        </div>
      )}

      {/* Desktop Controls Quick Reminder */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 20,
        display: 'none',
        pointerEvents: 'none',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.85rem',
        fontFamily: 'var(--font-accent)'
      }} className="desktop-hints">
        WASD to Run &bull; SHIFT to Sprint &bull; SPACE / E to Rescue Dad
      </div>
    </div>
  );
};
