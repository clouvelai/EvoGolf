import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BALL_RADIUS = 0.4;
const ANIMATION_DURATION = 4.0;
const PAUSE_DURATION = 1.0;

type TrajectoryPoint = { step: number; x: number; y: number; z: number };

type HofBallReplayProps = {
  trajectoryJson: string;
  isHoleInOne: boolean;
};

export default function HofBallReplay({ trajectoryJson, isHoleInOne }: HofBallReplayProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  const points = useMemo<TrajectoryPoint[]>(() => {
    try {
      return JSON.parse(trajectoryJson);
    } catch {
      return [];
    }
  }, [trajectoryJson]);

  const totalCycle = ANIMATION_DURATION + PAUSE_DURATION;

  useFrame((_state, delta) => {
    if (!meshRef.current || points.length === 0) return;

    timeRef.current += delta;
    if (timeRef.current > totalCycle) {
      timeRef.current -= totalCycle;
    }

    const progress = Math.min(timeRef.current / ANIMATION_DURATION, 1);
    const floatIdx = progress * (points.length - 1);
    const idx = Math.floor(floatIdx);
    const frac = floatIdx - idx;

    let x: number, y: number, z: number;
    if (idx >= points.length - 1) {
      const last = points[points.length - 1];
      x = last.x; y = last.y; z = last.z;
    } else {
      const a = points[idx];
      const b = points[idx + 1];
      x = a.x + (b.x - a.x) * frac;
      y = a.y + (b.y - a.y) * frac;
      z = a.z + (b.z - a.z) * frac;
    }

    if (y < BALL_RADIUS) y = BALL_RADIUS;
    meshRef.current.position.set(x, y, z);
  });

  if (points.length === 0) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
      <meshStandardMaterial
        color={isHoleInOne ? '#ffd700' : '#66ccff'}
        emissive={isHoleInOne ? '#ffd700' : '#66ccff'}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}
