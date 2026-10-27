import React, { useState, useEffect, useRef } from 'react';
import { ThreeGame } from './game/ThreeGame.js';
import { useAuth } from './context/AuthContext.js';
import { api } from './api/client.js';
import { sound } from './game/audio/SoundEffects.js';
import { GameState, DangerWarning, DebugMetrics, RoundSummary, RoundDifficultyConfig } from './types/game.js';

import { HUD } from './components/HUD.js';
import { StoryIntro } from './components/StoryIntro.js';
import { MobileControls } from './components/MobileControls.js';
import { PauseModal } from './components/PauseModal.js';
import { GameOverModal } from './components/GameOverModal.js';
import { LeaderboardModal } from './components/LeaderboardModal.js';
import { AuthModal } from './components/AuthModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { DebugOverlay } from './components/DebugOverlay.js';

import { Play, Award, User as UserIcon, HelpCircle, Shield, Zap, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ThreeGame | null>(null);

  // State Management
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [isRanked, setIsRanked] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Mutable refs so game callbacks always have access to latest state without re-creating ThreeGame
  const isRankedRef = useRef<boolean>(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const userRef = useRef<any>(null);

  useEffect(() => {
    isRankedRef.current = isRanked;
  }, [isRanked]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // HUD Stats
  const [hudStats, setHudStats] = useState<{
    score: number;
    saves: number;
    combo: number;
    timeLeft: number;
    roundNumber: number;
    speedName: string;
    danger: DangerWarning;
    fastestRescueMs: number | null;
    rescueSuccessFlash: boolean;
  }>({
    score: 0,
    saves: 0,
    combo: 1.0,
    timeLeft: 60,
    roundNumber: 1,
    speedName: 'Very Slow',
    danger: { active: false, intensity: 0, motorcycleDirection: 'left', distanceToDad: 999 },
    fastestRescueMs: null,
    rescueSuccessFlash: false
  });

  // End Round Summary
  const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null);
  const [nextRoundPreview, setNextRoundPreview] = useState<RoundDifficultyConfig | null>(null);

  // Anti-cheat verification state
  const [validationStatus, setValidationStatus] = useState<'idle' | 'submitting' | 'verified' | 'rejected' | 'guest'>('idle');
  const [validationMessage, setValidationMessage] = useState<string>('');

  // Modals
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics | null>(null);

  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const game = new ThreeGame(canvasContainerRef.current, {
      onStateChange: (newState) => setGameState(newState),
      onStatsUpdate: (stats) => setHudStats(stats),
      onDebugUpdate: (metrics) => setDebugMetrics(metrics),
      onRoundAdvance: (info) => {
        // Update current round state on automatic transition
        setCurrentRound(info.nextRound);
      },
      onRoundComplete: async (roundData) => {
        const completedRound = roundData.roundNumber;
        const nextRound = completedRound + 1;
        setCurrentRound(nextRound);

        if (isRankedRef.current && currentSessionIdRef.current && userRef.current) {
          setValidationStatus('submitting');
          try {
            // 1. Finalize the completed round session exactly once
            const finishRes = await api.finishSession(currentSessionIdRef.current, {
              roundNumber: roundData.roundNumber,
              score: roundData.score,
              roundScore: roundData.roundScore,
              totalCumulativeSaves: roundData.totalCumulativeSaves,
              successfulSaves: roundData.successfulSaves,
              fastestRescueMs: roundData.fastestRescueMs,
              survivalTimeSeconds: roundData.survivalTimeSeconds,
              bestCombo: roundData.bestCombo,
              events: roundData.events
            });
            setValidationStatus('verified');
            setValidationMessage(finishRes.message);

            // 2. Obtain session for next round BEFORE starting next round
            const nextSession = await api.startSession(nextRound);
            currentSessionIdRef.current = nextSession.sessionId;
            setCurrentSessionId(nextSession.sessionId);

            // 3. Start Round N+1 with cumulative score & saves preserved
            gameRef.current?.startRound(nextRound, true);
          } catch (err: any) {
            console.error('Failed to finalize/advance round:', err);
            setValidationStatus('rejected');
            setValidationMessage(err.message || 'Round verification failed');
            gameRef.current?.handleRoundVerificationFailure(err.message);
          }
        } else {
          // Unranked / practice mode: short delay (350ms) to let visual effect show, then start next round
          setTimeout(() => {
            gameRef.current?.startRound(nextRound, true);
          }, 350);
        }
      },
      onRoundEnd: async (summary) => {
        setRoundSummary(summary);

        // Server-authoritative validation & score submission
        if (isRankedRef.current && currentSessionIdRef.current && userRef.current) {
          setValidationStatus('submitting');
          try {
            const res = await api.finishSession(currentSessionIdRef.current, {
              roundNumber: summary.roundNumber,
              score: summary.score,
              roundScore: 0,
              totalCumulativeSaves: summary.successfulSaves,
              successfulSaves: 0,
              fastestRescueMs: summary.fastestRescueMs,
              survivalTimeSeconds: summary.survivalTimeSeconds,
              bestCombo: summary.bestCombo,
              events: [],
              failureReason: summary.failureReason
            });
            setValidationStatus('verified');
            setValidationMessage(res.message);
          } catch (err: any) {
            setValidationStatus('rejected');
            setValidationMessage(err.message || 'Verification rejected');
          }
        } else {
          setValidationStatus('guest');
        }
      }
    });

    gameRef.current = game;

    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleStartRanked = async (roundToStart: number = 1) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    try {
      setCurrentRound(roundToStart);
      const session = await api.startSession(roundToStart);
      currentSessionIdRef.current = session.sessionId;
      setCurrentSessionId(session.sessionId);
      isRankedRef.current = true;
      setIsRanked(true);
      setValidationStatus('idle');

      // Only show story cinematic on fresh Round 1
      if (roundToStart === 1) {
        setGameState('STORY');
      } else {
        gameRef.current?.startRound(roundToStart, false);
      }
    } catch (err: any) {
      if (err.status === 401 || err.message?.includes('session') || err.message?.includes('Authentication')) {
        await refreshUser();
        setShowAuth(true);
        return;
      }
      alert(`Could not start ranked round ${roundToStart}: ${err.message}`);
    }
  };

  const handleStartPractice = (roundToStart: number = 1) => {
    setCurrentRound(roundToStart);
    isRankedRef.current = false;
    setIsRanked(false);
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
    setValidationStatus('guest');

    if (roundToStart === 1) {
      setGameState('STORY');
    } else {
      gameRef.current?.startRound(roundToStart, false);
    }
  };

  const handleStoryComplete = () => {
    if (gameRef.current) {
      gameRef.current.startRound(currentRound, false);
    }
  };

  const handleRetryRound = () => {
    if (isRanked) {
      handleStartRanked(currentRound);
    } else {
      handleStartPractice(currentRound);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Three.js 3D Viewport Canvas */}
      <div
        ref={canvasContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1
        }}
      />

      {/* Screen Red Flash Effect on Danger */}
      <div
        className={hudStats.danger.active ? 'danger-active' : ''}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10
        }}
      />

      {/* 1. MAIN MENU */}
      {gameState === 'MENU' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 40,
          backgroundColor: 'rgba(11, 15, 25, 0.88)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          {/* Top Bar with Profile & Leaderboard */}
          <div style={{
            position: 'absolute',
            top: 24,
            left: 24,
            right: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="btn-secondary"
              style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Award size={18} color="#f59e0b" />
              <span>LEADERBOARDS</span>
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowHowToPlay(true)}
                className="btn-secondary"
                style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <HelpCircle size={18} />
                <span>HOW TO PLAY</span>
              </button>

              {user ? (
                <button
                  onClick={() => {
                    setSelectedProfileUsername(null);
                    setShowProfile(true);
                  }}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, borderColor: '#38bdf8' }}
                >
                  <UserIcon size={18} color="#38bdf8" />
                  <span>{user.username} (Round {user.stats?.highestRound || 1})</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <UserIcon size={18} />
                  <span>SIGN IN</span>
                </button>
              )}
            </div>
          </div>

          {/* Title Hero */}
          <div style={{ textAlign: 'center', maxWidth: 640 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#38bdf8', letterSpacing: 3, fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>
              <Sparkles size={16} />
              <span>INSTANT-ADVANCE ROUND PROGRESSION</span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '5.5rem',
              lineHeight: 0.9,
              letterSpacing: 4,
              color: '#ef4444',
              textShadow: '0 0 40px rgba(239, 68, 68, 0.6)',
              marginBottom: 16
            }}>
              SAVE DAD!
            </h1>

            <p style={{ color: '#cbd5e1', fontSize: '1.2rem', lineHeight: 1.6, marginBottom: 36 }}>
              Each successful rescue completes the current round and automatically starts the next round. How far can you take Dad?
            </p>

            {/* Main Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button
                onClick={() => handleStartRanked(1)}
                className="btn-action"
                style={{
                  padding: '16px 36px',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12
                }}
              >
                <Play size={24} />
                <span>{user ? 'START RANKED RUN' : 'LOGIN TO PLAY RANKED'}</span>
              </button>

              <button
                onClick={() => handleStartPractice(1)}
                className="btn-secondary"
                style={{
                  padding: '14px 28px',
                  fontSize: '1.05rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                <Shield size={20} color="#00e676" />
                <span>PRACTICE MODE (UNRANKED)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. STORY INTRO CINEMATIC */}
      {gameState === 'STORY' && (
        <StoryIntro onComplete={handleStoryComplete} />
      )}

      {/* 3. HEADS-UP DISPLAY (HUD) */}
      {(gameState === 'PLAYING' || gameState === 'RESCUING' || gameState === 'EVENT_TRANSITION') && (
        <>
          <HUD
            score={hudStats.score}
            saves={hudStats.saves}
            combo={hudStats.combo}
            timeLeft={hudStats.timeLeft}
            roundNumber={hudStats.roundNumber}
            speedName={hudStats.speedName}
            danger={hudStats.danger}
            isMuted={isMuted}
            rescueSuccessFlash={hudStats.rescueSuccessFlash}
            onToggleMute={toggleMute}
            onPause={() => gameRef.current?.pause()}
            onToggleDebug={() => gameRef.current?.toggleDebug()}
          />

          {isMobile && (
            <MobileControls
              onMoveVector={(x, y) => gameRef.current?.input.setJoystickVector(x, y)}
              onSprintToggle={(sprint) => gameRef.current?.input.setMobileSprint(sprint)}
              onRescueTrigger={() => gameRef.current?.input.triggerMobileRescue()}
            />
          )}
        </>
      )}

      {/* 4. PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={() => gameRef.current?.resume()}
          onRestart={() => gameRef.current?.startRound(currentRound, false)}
          onQuit={() => {
            gameRef.current?.stopLoop();
            setGameState('MENU');
          }}
        />
      )}

      {/* 5. GAME OVER MODAL (Shown only on failure / collision) */}
      {gameState === 'GAME_OVER' && roundSummary && (
        <GameOverModal
          outcome="GAME_OVER"
          stats={roundSummary}
          nextRoundPreview={nextRoundPreview}
          validationStatus={validationStatus}
          validationMessage={validationMessage}
          onContinueNextRound={handleRetryRound}
          onRetryRound={handleRetryRound}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onBackToMenu={() => setGameState('MENU')}
        />
      )}

      {/* MODALS */}
      {showLeaderboard && (
        <LeaderboardModal
          onClose={() => setShowLeaderboard(false)}
          onViewProfile={(name) => {
            setShowLeaderboard(false);
            setSelectedProfileUsername(name);
            setShowProfile(true);
          }}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {}}
        />
      )}

      {showProfile && (
        <ProfileModal
          username={selectedProfileUsername}
          onClose={() => {
            setShowProfile(false);
            setSelectedProfileUsername(null);
          }}
          onOpenAuth={() => setShowAuth(true)}
        />
      )}

      {/* HOW TO PLAY MODAL */}
      {showHowToPlay && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 80,
          backgroundColor: 'rgba(10, 15, 26, 0.92)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div className="glass-panel-neon" style={{ maxWidth: 520, width: '100%', padding: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: 2, marginBottom: 12 }}>
              INSTANT ADVANCEMENT RULES
            </h2>
            <ul style={{ color: '#cbd5e1', lineHeight: 1.8, fontSize: '0.95rem', paddingLeft: 20, marginBottom: 24 }}>
              <li><strong>One Save Per Round:</strong> Successfully pulling Dad to safety immediately completes the current round.</li>
              <li><strong>Instant Transition:</strong> A brief 0.4s celebration flash plays, then Round 2 starts automatically with fresh 60s timer and higher speed!</li>
              <li><strong>Cumulative Progress:</strong> Your total score, saves, and combo multiplier carry over smoothly into every subsequent round.</li>
              <li><strong>Controls:</strong> Hold <code>Shift</code> to sprint, press <code>SPACE</code> or <code>E</code> within 3.2m of Dad to pull him to the safe sidewalk.</li>
              <li><strong>Failure & Retry:</strong> If a motorcycle hits you or Dad, or 60s expires without a save, the run ends with a quick Retry option.</li>
            </ul>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="btn-action"
              style={{ width: '100%', padding: 12 }}
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}

      {/* DEBUG OVERLAY */}
      <DebugOverlay metrics={debugMetrics} />
    </div>
  );
};
