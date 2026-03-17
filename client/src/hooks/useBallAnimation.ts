import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export type TrajectoryPointData = {
  step: number;
  x: number;
  y: number;
  z: number;
};

export type BallPosition = { x: number; y: number; z: number };

const ANIMATION_DURATION = 4.0; // seconds

/**
 * Interpolates a ball's position along a trajectory path over ~4 seconds.
 * Returns a ref to the current {x, y, z} position (mutated each frame).
 *
 * @param points - Trajectory points sorted by step
 * @param speed - Animation speed multiplier (default 1)
 * @param teePosition - Fallback position when no trajectory exists
 */
export function useBallAnimation(
  points: TrajectoryPointData[],
  speed: number = 1,
  teePosition: BallPosition = { x: 0, y: 0.4, z: 0 },
): React.RefObject<BallPosition> {
  const posRef = useRef<BallPosition>({ ...teePosition });
  const timeRef = useRef(0);
  const prevPointsLenRef = useRef(0);

  useFrame((_state, delta) => {
    // Reset animation when trajectory changes
    if (points.length !== prevPointsLenRef.current) {
      timeRef.current = 0;
      prevPointsLenRef.current = points.length;
    }

    if (points.length === 0) {
      posRef.current.x = teePosition.x;
      posRef.current.y = teePosition.y;
      posRef.current.z = teePosition.z;
      return;
    }

    // Advance time
    timeRef.current += delta * speed;

    // Compute normalized progress [0, 1]
    const progress = Math.min(timeRef.current / ANIMATION_DURATION, 1);

    // Map progress to a float index into the points array
    const floatIndex = progress * (points.length - 1);
    const i = Math.floor(floatIndex);
    const frac = floatIndex - i;

    if (i >= points.length - 1) {
      // At or past end — clamp to last point
      const last = points[points.length - 1];
      posRef.current.x = last.x;
      posRef.current.y = last.y;
      posRef.current.z = last.z;
    } else {
      // Lerp between points[i] and points[i+1]
      const a = points[i];
      const b = points[i + 1];
      posRef.current.x = a.x + (b.x - a.x) * frac;
      posRef.current.y = a.y + (b.y - a.y) * frac;
      posRef.current.z = a.z + (b.z - a.z) * frac;
    }
  });

  return posRef;
}
