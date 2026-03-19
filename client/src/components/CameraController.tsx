import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

type CameraControllerProps = {
  followMode: boolean;
  bestBallPosition: [number, number, number] | null;
  courseCenter: [number, number, number];
  isRotating: boolean;
  viewMode: 'tee' | 'green';
  holePosition: [number, number, number];
};

/**
 * Replaces the static <OrbitControls> with a camera controller that supports:
 * - Free orbit (default)
 * - Follow mode (lerps toward best ball)
 * - Course rotation camera (pulls to bird's eye, then swoops back)
 */
export default function CameraController({
  followMode,
  bestBallPosition,
  courseCenter,
  isRotating,
  viewMode,
  holePosition,
}: CameraControllerProps) {
  const controlsRef = useRef<any>(null);
  const targetVec = useRef(new THREE.Vector3(courseCenter[0], courseCenter[1], courseCenter[2]));
  const { camera } = useThree();

  // Bird's-eye position for rotation animation
  const birdEyePos = useRef(new THREE.Vector3(0, 150, 0));
  const normalPos = useRef(new THREE.Vector3(-45, 50, -30));
  const rotationPhaseRef = useRef<'idle' | 'ascending' | 'descending'>('idle');
  const rotationTimeRef = useRef(0);

  // Track view mode transitions
  const viewModeTransitioning = useRef(false);
  const prevViewMode = useRef(viewMode);

  useEffect(() => {
    if (prevViewMode.current !== viewMode) {
      viewModeTransitioning.current = true;
      prevViewMode.current = viewMode;
    }
  }, [viewMode]);

  // Handle rotation animation start/end
  useEffect(() => {
    if (isRotating) {
      rotationPhaseRef.current = 'ascending';
      rotationTimeRef.current = 0;
    } else if (rotationPhaseRef.current === 'ascending') {
      // Rotation ended while ascending — swoop back down
      rotationPhaseRef.current = 'descending';
      rotationTimeRef.current = 0;
    }
  }, [isRotating]);

  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const phase = rotationPhaseRef.current;

    if (phase === 'ascending') {
      rotationTimeRef.current += delta;
      const t = Math.min(rotationTimeRef.current / 0.8, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.lerp(birdEyePos.current, ease * 0.05);
      targetVec.current.lerp(new THREE.Vector3(0, 0, 70), ease * 0.05);
      controls.target.copy(targetVec.current);
      return;
    }

    if (phase === 'descending') {
      rotationTimeRef.current += delta;
      const t = Math.min(rotationTimeRef.current / 0.8, 1);
      const ease = t * t * (3 - 2 * t);

      camera.position.lerp(normalPos.current, ease * 0.06);
      targetVec.current.lerp(
        new THREE.Vector3(courseCenter[0], courseCenter[1], courseCenter[2]),
        ease * 0.06,
      );
      controls.target.copy(targetVec.current);

      if (t >= 1) {
        rotationPhaseRef.current = 'idle';
      }
      return;
    }

    // View mode transition (tee <-> green)
    if (viewModeTransitioning.current) {
      let goalPos: THREE.Vector3;
      let goalTarget: THREE.Vector3;

      if (viewMode === 'green') {
        // Camera behind green, looking back toward tee
        // Position: behind hole (further Z), elevated, slightly offset
        goalPos = new THREE.Vector3(
          holePosition[0] + 8,
          18,
          holePosition[2] + 30,
        );
        // Look at the green/hole area
        goalTarget = new THREE.Vector3(holePosition[0], 0.5, holePosition[2]);
      } else {
        // Tee view: default position
        goalPos = new THREE.Vector3(-45, 50, -30);
        goalTarget = new THREE.Vector3(courseCenter[0], courseCenter[1], courseCenter[2]);
      }

      const lerpSpeed = delta * 2.5;
      camera.position.lerp(goalPos, lerpSpeed);
      targetVec.current.lerp(goalTarget, lerpSpeed);
      controls.target.copy(targetVec.current);

      // Check if close enough to stop transitioning
      if (camera.position.distanceTo(goalPos) < 0.5) {
        viewModeTransitioning.current = false;
      }
      return;
    }

    // Normal mode — follow or free
    if (followMode && bestBallPosition) {
      const ballTarget = new THREE.Vector3(
        bestBallPosition[0],
        Math.max(bestBallPosition[1], 2),
        bestBallPosition[2],
      );
      targetVec.current.lerp(ballTarget, delta * 3);
      controls.target.copy(targetVec.current);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[courseCenter[0], courseCenter[1], courseCenter[2]]}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={20}
      maxDistance={200}
      enableDamping
      dampingFactor={0.05}
    />
  );
}
