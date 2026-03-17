import { useState, useMemo, useCallback } from 'react';
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

  // Auto-create game on first connect
  const conn = getConnection();
  if (isActive && courses.length === 0 && conn) {
    conn.reducers.createGame({});
  }

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
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      {!isActive && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white', fontSize: '1.2rem',
        }}>
          Connecting to SpacetimeDB...
        </div>
      )}
      <Canvas camera={{ position: [0, 80, 100], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={1} />
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
          target={[0, 0, 68]}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
