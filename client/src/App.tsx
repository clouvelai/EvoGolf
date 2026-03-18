import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from './module_bindings';
import CourseGround from './components/CourseGround';
import BallSwarm from './components/BallSwarm';
import TrajectoryLines from './components/TrajectoryLines';
import HUD from './components/HUD';
import FitnessChart from './components/FitnessChart';
import EventLog from './components/EventLog';
import GenomeTreePanel from './components/GenomeTreePanel';
import GPControlPanel from './components/GPControlPanel';
import WinOverlay from './components/WinOverlay';
import HallOfFame from './components/HallOfFame';
import HofBallReplay from './components/HofBallReplay';
import HofTrajectoryLine from './components/HofTrajectoryLine';

const HOLE_RADIUS = 0.5;
const MAX_AUTO_GENS = 1000;

export default function App() {
  const { isActive, getConnection } = useSpacetimeDB();
  const [courses] = useTable(tables.golfCourse);
  const [generations] = useTable(tables.generation);
  const [genomes] = useTable(tables.genome);
  const [balls] = useTable(tables.golfBall);
  const [gpEvents] = useTable(tables.gpEvent);
  const [hofEntries] = useTable(tables.hallOfFame);

  const [selectedGenomeId, setSelectedGenomeId] = useState<number | null>(null);
  const [autoEvolving, setAutoEvolving] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [winDismissed, setWinDismissed] = useState(false);
  const [hofMode, setHofMode] = useState(false);
  const [selectedHofId, setSelectedHofId] = useState<number | null>(null);

  // Auto-create game on first connect (exactly once)
  const gameCreatedRef = useRef(false);
  useEffect(() => {
    const conn = getConnection();
    if (isActive && courses.length === 0 && conn && !gameCreatedRef.current) {
      gameCreatedRef.current = true;
      conn.reducers.createGame({});
    }
  }, [isActive, courses.length, getConnection]);

  const course = courses[0] ?? null;

  // Current generation (highest genNumber — genId autoInc can wrap after republish)
  const currentGen = useMemo(() => {
    if (generations.length === 0) return null;
    let latest = generations[0];
    for (const gen of generations) {
      if (gen.genNumber > latest.genNumber) latest = gen;
    }
    return latest;
  }, [generations]);

  const currentGenId = currentGen?.genId ?? null;

  // Sorted generations for fitness chart
  const sortedGens = useMemo(() => {
    return [...generations]
      .sort((a, b) => a.genNumber - b.genNumber)
      .map((g) => ({
        genNumber: g.genNumber,
        bestFitness: g.bestFitness,
        avgFitness: g.avgFitness,
      }));
  }, [generations]);

  // Genomes in current generation
  const currentGenGenomes = useMemo(() => {
    if (currentGenId == null) return [];
    return genomes.filter((g) => g.genId === currentGenId);
  }, [genomes, currentGenId]);

  // Selected genome
  const selectedGenome = useMemo(() => {
    if (selectedGenomeId == null) return null;
    return genomes.find((g) => g.genomeId === selectedGenomeId) ?? null;
  }, [genomes, selectedGenomeId]);

  // Best ball in current gen (min distanceToHole among stopped balls)
  const bestBall = useMemo(() => {
    const currentBalls = balls.filter((b) => b.genId === currentGenId && b.state === 'stopped');
    if (currentBalls.length === 0) return null;
    let best = currentBalls[0];
    for (const b of currentBalls) {
      if (b.distanceToHole < best.distanceToHole) best = b;
    }
    return best;
  }, [balls, currentGenId]);

  // Win detection
  const winningBall = useMemo(() => {
    if (winDismissed) return null;
    return balls.find((b) => b.distanceToHole < HOLE_RADIUS && b.state === 'stopped') ?? null;
  }, [balls, winDismissed]);

  // Sorted events
  const sortedEvents = useMemo(() => {
    return [...gpEvents].sort((a, b) => a.eventId - b.eventId);
  }, [gpEvents]);

  // ── Auto-evolve logic ──
  useEffect(() => {
    if (!autoEvolving || !currentGen) return;
    if (currentGen.phase !== 'evaluated') return;
    if (currentGen.genNumber >= MAX_AUTO_GENS) {
      setAutoEvolving(false);
      return;
    }
    if (winningBall) {
      setAutoEvolving(false);
      return;
    }

    const conn = getConnection();
    if (!conn) return;

    const timer = setTimeout(() => {
      conn.reducers.advanceGeneration({ genId: currentGen.genId });
    }, 2000);

    return () => clearTimeout(timer);
  }, [autoEvolving, currentGen, winningBall, getConnection]);

  // ── Handlers ──
  const handleSelectGenome = useCallback((genomeId: number | null) => {
    setSelectedGenomeId(genomeId);
  }, []);

  const handleInitialize = useCallback(() => {
    const conn = getConnection();
    if (!conn) return;
    conn.reducers.initPopulation({ holeId: 1, popSize: 12 });
    setWinDismissed(false);
  }, [getConnection]);

  const handleNextGen = useCallback(() => {
    const conn = getConnection();
    if (!conn || !currentGen) return;
    conn.reducers.advanceGeneration({ genId: currentGen.genId });
  }, [getConnection, currentGen]);

  const handleSponsor = useCallback(() => {
    const conn = getConnection();
    if (!conn || selectedGenomeId == null) return;
    conn.reducers.setWildcard({ genomeId: selectedGenomeId });
  }, [getConnection, selectedGenomeId]);

  const handleToggleAutoEvolve = useCallback(() => {
    setAutoEvolving((prev) => !prev);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setWinDismissed(true);
    setAutoEvolving(false);
    setSelectedGenomeId(null);
    const conn = getConnection();
    if (!conn) return;
    conn.reducers.initPopulation({ holeId: 1, popSize: 12 });
  }, [getConnection]);

  const handleOpenHof = useCallback(() => {
    setHofMode(true);
    setAutoEvolving(false);
  }, []);

  const handleCloseHof = useCallback(() => {
    setHofMode(false);
    setSelectedHofId(null);
  }, []);

  const selectedHofEntry = useMemo(() => {
    if (selectedHofId == null) return null;
    return hofEntries.find((e) => e.hofId === selectedHofId) ?? null;
  }, [hofEntries, selectedHofId]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#081828', position: 'relative' }}>
      {!isActive && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white', fontSize: '1.2rem', zIndex: 10,
        }}>
          Connecting to SpacetimeDB...
        </div>
      )}

      {/* ── HUD ── */}
      {course && (
        <HUD
          par={course.par}
          distance={course.distance}
          windX={course.windX}
          windZ={course.windZ}
          genNumber={currentGen?.genNumber ?? null}
          bestDistance={bestBall?.distanceToHole ?? null}
        />
      )}

      {/* ── Evolution UI (hidden in HoF mode) ── */}
      {!hofMode && (
        <>
          <GPControlPanel
            phase={currentGen?.phase ?? null}
            genNumber={currentGen?.genNumber ?? null}
            bestFitness={currentGen?.bestFitness ?? null}
            avgFitness={currentGen?.avgFitness ?? null}
            hasPopulation={generations.length > 0}
            autoEvolving={autoEvolving}
            speedMultiplier={speedMultiplier}
            hofCount={hofEntries.length}
            onInitialize={handleInitialize}
            onNextGen={handleNextGen}
            onToggleAutoEvolve={handleToggleAutoEvolve}
            onSpeedChange={setSpeedMultiplier}
            onOpenHof={handleOpenHof}
          />
          <FitnessChart generations={sortedGens} />
          <EventLog events={sortedEvents} />
          <GenomeTreePanel
            genome={selectedGenome}
            genomes={currentGenGenomes}
            selectedGenomeId={selectedGenomeId}
            onSelectGenome={handleSelectGenome}
            onSponsor={handleSponsor}
            sponsorDisabled={selectedGenomeId == null}
          />
          {winningBall && currentGen && (
            <WinOverlay
              genNumber={currentGen.genNumber}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </>
      )}

      {/* ── Hall of Fame UI ── */}
      {hofMode && (
        <HallOfFame
          entries={hofEntries}
          selectedHofId={selectedHofId}
          onSelectEntry={setSelectedHofId}
          onBack={handleCloseHof}
        />
      )}

      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ position: [-45, 50, -30], fov: 45, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#081828']} />
        <fog attach="fog" args={['#0a1e35', 160, 320]} />

        <hemisphereLight args={['#4488aa', '#1a4020', 0.4]} />
        <ambientLight intensity={0.5} color="#c0d4e8" />
        <directionalLight position={[60, 80, 30]} intensity={1.7} color="#fff0d0" castShadow={false} />
        <directionalLight position={[-30, 50, 160]} intensity={0.6} color="#aac8e0" />
        <directionalLight position={[-40, 40, -20]} intensity={0.3} color="#6bb8e0" />
        <pointLight position={[0, -5, 70]} intensity={0.5} color="#2a6090" distance={150} />

        <CourseGround course={course} />
        {!hofMode && (
          <>
            <BallSwarm
              selectedGenomeId={selectedGenomeId}
              onSelectGenome={handleSelectGenome}
              currentGenId={currentGenId}
              speedMultiplier={speedMultiplier}
            />
            <TrajectoryLines
              selectedGenomeId={selectedGenomeId}
              currentGenId={currentGenId}
            />
          </>
        )}
        {hofMode && selectedHofEntry && (
          <>
            <HofBallReplay
              trajectoryJson={selectedHofEntry.trajectoryJson}
              isHoleInOne={selectedHofEntry.isHoleInOne}
            />
            <HofTrajectoryLine
              trajectoryJson={selectedHofEntry.trajectoryJson}
              isHoleInOne={selectedHofEntry.isHoleInOne}
            />
          </>
        )}
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
