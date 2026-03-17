import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from './module_bindings';
import CourseGround from './components/CourseGround';
import BallSwarm from './components/BallSwarm';
import TrajectoryLines from './components/TrajectoryLines';

export default function App() {
  const { isActive, getConnection } = useSpacetimeDB();
  const [courses] = useTable(tables.golfCourse);
  const [generations] = useTable(tables.generation);

  const [selectedGenomeId, setSelectedGenomeId] = useState<number | null>(null);

  // Auto-create game on first connect (exactly once)
  const gameCreatedRef = useRef(false);
  useEffect(() => {
    const conn = getConnection();
    if (isActive && courses.length === 0 && conn && !gameCreatedRef.current) {
      gameCreatedRef.current = true;
      conn.reducers.createGame({});
    }
  }, [isActive, courses.length, getConnection]);

  // Get the latest generation (highest genId)
  const currentGenId = useMemo(() => {
    if (generations.length === 0) return null;
    let latest = generations[0];
    for (const gen of generations) {
      if (gen.genId > latest.genId) {
        latest = gen;
      }
    }
    return latest.genId;
  }, [generations]);

  const handleSelectGenome = useCallback((genomeId: number | null) => {
    setSelectedGenomeId(genomeId);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#081828' }}>
      {!isActive && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white', fontSize: '1.2rem', zIndex: 10,
        }}>
          Connecting to SpacetimeDB...
        </div>
      )}
      <Canvas
        camera={{ position: [-45, 50, -30], fov: 45, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        {/* Sky / background */}
        <color attach="background" args={['#081828']} />
        <fog attach="fog" args={['#0a1e35', 160, 320]} />

        {/* Lighting — golden hour warmth */}
        <hemisphereLight
          args={['#4488aa', '#1a4020', 0.4]}
        />
        <ambientLight intensity={0.5} color="#c0d4e8" />
        <directionalLight
          position={[60, 80, 30]}
          intensity={1.7}
          color="#fff0d0"
          castShadow={false}
        />
        {/* Fill light aimed at far shore so trees aren't silhouettes */}
        <directionalLight
          position={[-30, 50, 160]}
          intensity={0.6}
          color="#aac8e0"
        />
        {/* Cool fill from opposite side */}
        <directionalLight
          position={[-40, 40, -20]}
          intensity={0.3}
          color="#6bb8e0"
        />
        {/* Subtle up-light to illuminate balls in flight */}
        <pointLight
          position={[0, -5, 70]}
          intensity={0.5}
          color="#2a6090"
          distance={150}
        />

        <CourseGround course={courses[0] ?? null} />
        <BallSwarm
          selectedGenomeId={selectedGenomeId}
          onSelectGenome={handleSelectGenome}
          currentGenId={currentGenId}
        />
        <TrajectoryLines
          selectedGenomeId={selectedGenomeId}
          currentGenId={currentGenId}
        />
        <OrbitControls
          target={[0, 2, 55]}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={20}
          maxDistance={200}
        />
      </Canvas>
    </div>
  );
}
