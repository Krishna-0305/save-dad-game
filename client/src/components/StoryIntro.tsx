import React, { useState, useEffect } from 'react';
import { sound } from '../game/audio/SoundEffects.js';
import { FastForward, AlertTriangle } from 'lucide-react';

interface StoryIntroProps {
  onComplete: () => void;
}

export const StoryIntro: React.FC<StoryIntroProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(0);
  const [warningFlash, setWarningFlash] = useState<boolean>(false);

  useEffect(() => {
    // Sequence cinematic steps
    sound.playVisionDrone();

    const timers = [
      setTimeout(() => setStep(1), 2200), // Hostel study scene
      setTimeout(() => {
        setStep(2); // Premonition begins
        setWarningFlash(true);
        sound.playWarningFlash();
        sound.playHornHonk();
        setTimeout(() => setWarningFlash(false), 500);
      }, 5000),
      setTimeout(() => {
        setStep(3); // Motorcycle speeding toward Dad
        setWarningFlash(true);
        sound.playWarningFlash();
        setTimeout(() => setWarningFlash(false), 400);
      }, 8000),
      setTimeout(() => setStep(4), 11000), // Son rushes out!
      setTimeout(() => onComplete(), 13800) // Transition to 3D road
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      backgroundColor: '#0a0d14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Warning Flash Overlay */}
      {warningFlash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(239, 68, 68, 0.45)',
          zIndex: 60,
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease'
        }} />
      )}

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="btn-secondary"
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.9rem',
          zIndex: 70
        }}
      >
        <span>SKIP INTRO</span>
        <FastForward size={16} />
      </button>

      {/* Cinematic Frame */}
      <div style={{
        maxWidth: 720,
        width: '90%',
        textAlign: 'center',
        padding: 32,
        borderRadius: 16,
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>
        {step === 0 && (
          <div style={{ animation: 'fadeIn 0.8s ease' }}>
            <span style={{ color: '#38bdf8', fontSize: '1rem', letterSpacing: 3, fontWeight: 700 }}>
              ACT I: THE PREMONITION
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', margin: '16px 0', letterSpacing: 2 }}>
              ROOM 304, BOYS HOSTEL
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Far away from home, late into the night. Textbooks scattered across the study desk, ceiling fan whirling slowly above...
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.8s ease' }}>
            <span style={{ color: '#fbbf24', fontSize: '0.95rem', letterSpacing: 3, fontWeight: 700 }}>
              11:42 PM — 650 KM FROM HOME
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', margin: '16px 0', color: '#f8fafc' }}>
              AN UNSETTLING CHILL
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '1.15rem', lineHeight: 1.6 }}>
              A sudden overwhelming dread grips your chest. The room begins to fade as a terrifying psychic vision opens before your eyes...
            </p>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'pulse 1s infinite ease' }}>
            <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', marginBottom: 16 }}>
              <AlertTriangle size={48} color="#ef4444" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: '#ef4444', letterSpacing: 2 }}>
              DAD IS CROSSING THE ROAD!
            </h2>
            <p style={{ color: '#fca5a5', fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.6 }}>
              You see him walking across the zebra crossing outside the railway junction... oblivious to oncoming danger.
            </p>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3.2rem', color: '#ff2a2a', letterSpacing: 3 }}>
              SPEEDING MOTORCYCLE APPROACHING!
            </h2>
            <p style={{ color: '#f87171', fontSize: '1.2rem', lineHeight: 1.6 }}>
              A high-speed motorcycle is bearing down straight into his path. The collision will happen in mere seconds!
            </p>
          </div>
        )}

        {step === 4 && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', color: '#38bdf8', letterSpacing: 2 }}>
              RUN! SAVE DAD!
            </h2>
            <p style={{ color: '#e2e8f0', fontSize: '1.25rem', lineHeight: 1.6 }}>
              Sprinting across the tarmac, throwing yourself between oncoming traffic and Dad. You must pull him to the safe zone!
            </p>
          </div>
        )}

        {/* Progress Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: step === i ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: step === i ? '#ef4444' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

