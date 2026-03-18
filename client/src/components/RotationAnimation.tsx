import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type RotationAnimationProps = {
  isRotating: boolean;
  children: React.ReactNode;
};

const SPIN_DURATION = 2.0;

/**
 * Wraps CourseGround and spins it around Y-axis during course rotation.
 * Uses smoothstep easing for a satisfying spin-up and spin-down.
 */
export default function RotationAnimation({ isRotating, children }: RotationAnimationProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const spinTimeRef = useRef(0);
  const spinActiveRef = useRef(false);
  const startRotationRef = useRef(0);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    if (isRotating && !spinActiveRef.current) {
      // Start spinning
      spinActiveRef.current = true;
      spinTimeRef.current = 0;
      startRotationRef.current = groupRef.current.rotation.y;
    }

    if (spinActiveRef.current) {
      spinTimeRef.current += delta;
      const t = Math.min(spinTimeRef.current / SPIN_DURATION, 1);

      // Smoothstep ease: accelerate then decelerate
      const ease = t * t * (3 - 2 * t);
      const targetRotation = startRotationRef.current + Math.PI * 2 * ease;
      groupRef.current.rotation.y = targetRotation;

      if (t >= 1) {
        // Snap back to 0 (or a full rotation) to avoid accumulating
        groupRef.current.rotation.y = startRotationRef.current + Math.PI * 2;
        spinActiveRef.current = false;
      }
    }

    // When not spinning and not rotating, slowly settle back to y=0
    if (!spinActiveRef.current && !isRotating) {
      const current = groupRef.current.rotation.y % (Math.PI * 2);
      if (Math.abs(current) > 0.01) {
        groupRef.current.rotation.y *= 0.95;
      } else {
        groupRef.current.rotation.y = 0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
}
