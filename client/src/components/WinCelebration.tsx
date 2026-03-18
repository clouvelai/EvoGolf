import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type WinCelebrationProps = {
  active: boolean;
  holePosition: [number, number, number];
  winnerColor: string;
};

const PARTICLE_COUNT = 80;
const CELEBRATION_DURATION = 2.5;

/**
 * 3D celebration effect at the hole when someone gets a hole-in-one.
 * - Point light flash
 * - Particle burst radiating outward
 */
export default function WinCelebration({ active, holePosition, winnerColor }: WinCelebrationProps) {
  const lightRef = useRef<THREE.PointLight>(null!);
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);
  const prevActiveRef = useRef(false);

  // Generate random particle velocities once
  const particleData = useMemo(() => {
    const velocities: THREE.Vector3[] = [];
    const colors: number[] = [];
    const gold = new THREE.Color('#ffd700');
    const pColor = new THREE.Color(winnerColor || '#66ccff');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random direction in hemisphere (up-biased)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6; // upper hemisphere
      const speed = 8 + Math.random() * 15;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 5, // upward bias
        Math.sin(phi) * Math.sin(theta) * speed,
      ));
      // Mix gold and player color
      const c = Math.random() > 0.5 ? gold : pColor;
      colors.push(c.r, c.g, c.b);
    }
    return { velocities, colors };
  }, [winnerColor]);

  // Build geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colorsArr = new Float32Array(particleData.colors);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));
    return geo;
  }, [particleData]);

  useFrame((_state, delta) => {
    // Detect activation edge
    if (active && !prevActiveRef.current) {
      timeRef.current = 0;
    }
    prevActiveRef.current = active;

    if (!active && timeRef.current > CELEBRATION_DURATION) return;

    timeRef.current += delta;
    const t = timeRef.current;
    const progress = Math.min(t / CELEBRATION_DURATION, 1);

    // Light flash: bright then fade
    if (lightRef.current) {
      if (t < 0.5) {
        // Flash up
        lightRef.current.intensity = Math.sin(t / 0.5 * Math.PI) * 8;
      } else {
        // Fade out
        const fadeT = (t - 0.5) / (CELEBRATION_DURATION - 0.5);
        lightRef.current.intensity = Math.max(0, 8 * (1 - fadeT));
      }
    }

    // Update particle positions
    if (pointsRef.current && geometry) {
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const gravity = -15;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const v = particleData.velocities[i];
        const i3 = i * 3;
        positions[i3] = holePosition[0] + v.x * t;
        positions[i3 + 1] = holePosition[1] + v.y * t + 0.5 * gravity * t * t;
        positions[i3 + 2] = holePosition[2] + v.z * t;
      }
      posAttr.needsUpdate = true;

      // Fade out material
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 1 - progress * progress;
      mat.size = 0.5 + (1 - progress) * 0.5;
    }
  });

  if (!active && timeRef.current > CELEBRATION_DURATION) return null;

  return (
    <group>
      {/* Point light flash at hole */}
      <pointLight
        ref={lightRef}
        position={holePosition}
        color={winnerColor || '#ffd700'}
        intensity={0}
        distance={60}
        decay={2}
      />

      {/* Particle burst */}
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          vertexColors
          transparent
          opacity={1}
          size={0.7}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
