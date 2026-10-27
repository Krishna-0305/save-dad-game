import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onQuit }) => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      backgroundColor: 'rgba(10, 15, 26, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="glass-panel-neon" style={{
        maxWidth: 420,
        width: '90%',
        padding: 32,
        textAlign: 'center'
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', letterSpacing: 2, marginBottom: 8 }}>
          GAME PAUSED
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: 28 }}>
          Traffic is frozen. Catch your breath!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={onResume}
            className="btn-action"
            style={{ padding: '14px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <Play size={20} />
            <span>RESUME</span>
          </button>

          <button
            onClick={onRestart}
            className="btn-secondary"
            style={{ padding: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <RotateCcw size={18} />
            <span>RESTART ROUND</span>
          </button>

          <button
            onClick={onQuit}
            className="btn-secondary"
            style={{ padding: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <Home size={18} />
            <span>QUIT TO MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};

