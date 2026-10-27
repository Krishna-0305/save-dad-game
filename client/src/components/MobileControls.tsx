import React, { useRef, useState, useEffect } from 'react';
import { LifeBuoy, Zap } from 'lucide-react';

interface MobileControlsProps {
  onMoveVector: (x: number, y: number) => void;
  onSprintToggle: (sprint: boolean) => void;
  onRescueTrigger: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMoveVector,
  onSprintToggle,
  onRescueTrigger
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickBaseRef.current) return;
    const touch = e.touches[0];
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist <= maxRadius) {
      setKnobPos({ x: dx, y: dy });
      onMoveVector(dx / maxRadius, dy / maxRadius);
    } else {
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * maxRadius;
      const clampedY = Math.sin(angle) * maxRadius;
      setKnobPos({ x: clampedX, y: clampedY });
      onMoveVector(clampedX / maxRadius, clampedY / maxRadius);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onMoveVector(0, 0);
  };

  const toggleSprint = () => {
    const next = !isSprinting;
    setIsSprinting(next);
    onSprintToggle(next);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
      {/* Virtual Joystick (Bottom Left) */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute',
          bottom: 30,
          left: 30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(30, 41, 59, 0.4)',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          touchAction: 'none'
        }}
      >
        {/* Joystick Knob */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: isDragging ? '#38bdf8' : 'rgba(255, 255, 255, 0.8)',
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            transition: isDragging ? 'none' : 'transform 0.15s ease'
          }}
        />
      </div>

      {/* Action Buttons (Bottom Right) */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        right: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        pointerEvents: 'auto'
      }}>
        {/* Sprint Button */}
        <button
          onClick={toggleSprint}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: isSprinting ? '#f59e0b' : 'rgba(30, 41, 59, 0.7)',
            border: '2px solid rgba(245, 158, 11, 0.6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Zap size={24} />
        </button>

        {/* Big Rescue Button */}
        <button
          onClick={onRescueTrigger}
          className="btn-action"
          style={{
            width: 85,
            height: 85,
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4
          }}
        >
          <LifeBuoy size={28} />
          <span style={{ fontSize: '0.75rem', marginTop: 2 }}>RESCUE</span>
        </button>
      </div>
    </div>
  );
};

