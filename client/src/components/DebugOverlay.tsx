import React from 'react';
import { DebugMetrics } from '../types/game.js';

interface DebugOverlayProps {
  metrics: DebugMetrics | null;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      zIndex: 40,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      fontSize: '0.8rem',
      background: 'rgba(0, 0, 0, 0.75)',
      border: '1px solid #00ffcc',
      padding: '10px 14px',
      borderRadius: 6,
      color: '#00ffcc',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }}>
      <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(0,255,204,0.3)', paddingBottom: 4 }}>
        [DEBUG INSPECTOR — F3]
      </div>
      <div>FPS: {metrics.fps}</div>
      <div>Active Traffic: {metrics.activeMotorcycles}</div>
      <div>Bike Speed: {metrics.bikeSpeed} u/s</div>
      <div>Difficulty Level: {metrics.difficultyLevel}</div>
      <div>Son &bull; Dad Dist: {metrics.distanceSonDad}m</div>
      <div>Bike &bull; Dad Dist: {metrics.distanceBikeDad}m</div>
      <div>Rescue Radius: {metrics.rescueRadius}m</div>
    </div>
  );
};

