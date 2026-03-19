# EvoGolf

3D golf game where players evolve swings via genetic programming.
**Stack:** SpacetimeDB (TypeScript module) + React Three Fiber (Vite + TS).
**PRD:** `EVOGOLF_PRD.md` has full spec — table schemas, reducer specs, component specs, physics model, GP operator details.
**Core rule: ALL GP logic runs server-side in SpacetimeDB reducers.**

## Current State (as of 2026-03-19)

The game is fully playable with multiplayer. Phases 1-4 of the roadmap are complete. Phase 5 (UI & Polish) was done informally — the game has a complete UI with Swing Lab, player list, fitness chart, event log, HUD, camera modes, and auto-evolve.

**Key features implemented beyond the original roadmap:**
- **Multiplayer** — per-player identity, independent evolution, leaderboard, opponent trajectory inspection
- **Elite-centered breeding** — 1 elite + 4 elite mutations + 1 elite crossover + 6 exploration = 12
- **Swing Lab** — genome inspector with English descriptions, param bars, population grid grouped by elite family vs exploration
- **Course rotation** — hole-in-one triggers new random course, best genomes carry over
- **Hall of Fame** — winning genomes archived with course snapshots
- **Champion balls** — players can restart with a previous winning genome
- **Stagnation detection** — mutation rate boost after 10 unchanged generations

**Known issues / active tuning work:**
- Launch angle uses `sigmoid(sum_of_consts)` mapping to [8, 60] — decoupled from the 4-pass tree evaluation because the GP couldn't independently control it via the shared tree
- Elite mutations mix fine-tune (Gaussian const perturbation, stddev 1.5) and structural (point mutation) — was too gentle at stddev 0.3, may still need tuning
- Client has a duplicate tree evaluator in `client/src/lib/swingDescription.ts` — must stay in sync with `server/src/gp/evaluate.ts`

## Session Startup

Every conversation MUST start here:

1. Read this section ("Current State") for context
2. Read `ROADMAP.md` — shows phase status
3. If continuing roadmap work, read `.planning/phases/phase-N-*.md` for the next incomplete phase
4. Read `.planning/PROTOCOL.md` for execution rules (worktrees, commits, mid-phase stops)
5. Execute tasks, check them off, run verification gate, update ROADMAP.md

---

## Dependencies

```
# Server (server/package.json)
spacetimedb          # SpacetimeDB module SDK

# Client (client/package.json)
spacetimedb          # SpacetimeDB client SDK + React bindings
@react-three/fiber   # React Three Fiber
@react-three/drei    # R3F helpers (Line, Html, Grid, OrbitControls, Text)
three                # Three.js
@types/three         # Three.js types
react react-dom      # React 19
recharts             # Fitness chart
```

---

## Commands

```bash
# Docker
docker compose up -d
docker compose down

# SpacetimeDB CLI — all commands need --anonymous -s local
cd server && spacetime publish evogolf --anonymous -s local -y
spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server
spacetime logs evogolf --anonymous -s local
spacetime sql evogolf "SELECT * FROM generation" --anonymous -s local
spacetime call evogolf create_game --anonymous -s local
spacetime call evogolf init_population '{"holeId": 1, "popSize": 12}' --anonymous -s local
spacetime call evogolf advance_generation '{"genId": 1}' --anonymous -s local

# Client
cd client && npm run dev

# Type checking
cd server && npx tsc --noEmit
cd client && npx tsc -b --noEmit

# Makefile (wraps the above with STDB="--anonymous -s local")
make dev         # up + publish + generate + client dev
make publish     # publish server module
make generate    # regenerate client bindings (uses --module-path, no server needed)
make reset       # wipe all game data
make logs        # server logs
```

---

## SpacetimeDB Server Module

```typescript
// ALL imports come from 'spacetimedb/server'
import { schema, table, t, type RowObj } from 'spacetimedb/server';

// --- Table definitions ---
// Two-arg: table(options, columns)
// MUST set public: true for client subscriptions
const golfCourse = table(
  { name: 'golf_course', public: true },
  {
    holeId: t.u32().primaryKey().autoInc(),
    par: t.u32(),
    teeX: t.f64(),
    teeZ: t.f64(),
    holeX: t.f64(),
    holeZ: t.f64(),
    distance: t.f64(),
    windX: t.f64(),
    windZ: t.f64(),
  }
);

const genome = table(
  {
    name: 'genome',
    public: true,
    indexes: [{ accessor: 'byGenId', algorithm: 'btree', columns: ['genId'] }],
  },
  {
    genomeId: t.u32().primaryKey().autoInc(),
    genId: t.u32(),
    treeJson: t.string(),
    treeDepth: t.u32(),
    nodeCount: t.u32(),
    fitness: t.f64(),        // -1 = unevaluated sentinel
    origin: t.string(),      // 'random' | 'crossover' | 'mutation' | 'replication' | 'elite_mutation' | 'elite_crossover'
    parentAId: t.u32(),
    parentBId: t.u32(),
    isElite: t.bool(),
    isSelected: t.bool(),
  }
);

const generation = table(
  { name: 'generation', public: true },
  {
    genId: t.u32().primaryKey().autoInc(),
    holeId: t.u32(),
    genNumber: t.u32(),
    phase: t.string(),       // 'init' | 'simulating' | 'evaluated' | 'selecting' | 'breeding' | 'complete'
    bestFitness: t.f64(),
    avgFitness: t.f64(),
    popSize: t.u32(),
  }
);

const golfBall = table(
  {
    name: 'golf_ball',
    public: true,
    indexes: [{ accessor: 'byGenId', algorithm: 'btree', columns: ['genId'] }],
  },
  {
    ballId: t.u32().primaryKey().autoInc(),
    genomeId: t.u32(),
    genId: t.u32(),
    state: t.string(),       // 'waiting' | 'flying' | 'rolling' | 'stopped'
    finalX: t.f64(),
    finalZ: t.f64(),
    distanceToHole: t.f64(),
  }
);

const trajectoryPoint = table(
  {
    name: 'trajectory_point',
    public: true,
    indexes: [{ accessor: 'byBallId', algorithm: 'btree', columns: ['ballId'] }],
  },
  {
    pointId: t.u32().primaryKey().autoInc(),
    ballId: t.u32(),
    step: t.u32(),
    x: t.f64(),
    y: t.f64(),
    z: t.f64(),
  }
);

const gpEvent = table(
  { name: 'gp_event', public: true },
  {
    eventId: t.u32().primaryKey().autoInc(),
    genId: t.u32(),
    eventType: t.string(),   // 'init' | 'simulate' | 'select' | 'crossover' | 'mutate' | 'replicate'
    description: t.string(),
    genomeIdsJson: t.string(),
  }
);

const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().unique(),
    name: t.string(),
    color: t.string(),
    carryOverJson: t.string(),   // best genome JSON carried to next course
  }
);

const championBall = table(
  { name: 'champion_ball', public: true,
    indexes: [{ accessor: 'byPlayerId', algorithm: 'btree', columns: ['playerId'] }] },
  {
    championId: t.u32().primaryKey().autoInc(),
    playerId: t.identity(),
    treeJson: t.string(),
    courseVersion: t.u32(),
    generationsToSolve: t.u32(),
  }
);

const hallOfFame = table(
  { name: 'hall_of_fame', public: true },
  {
    hofId: t.u32().primaryKey().autoInc(),
    playerId: t.identity(),
    playerName: t.string(),
    courseVersion: t.u32(),
    generationsToSolve: t.u32(),
    teeX: t.f64(), teeZ: t.f64(),
    holeX: t.f64(), holeZ: t.f64(),
    windX: t.f64(), windZ: t.f64(),
  }
);

// --- Schema (REQUIRED — wraps all tables, must be default export) ---
const spacetimedb = schema({
  golfCourse, generation, genome, golfBall,
  trajectoryPoint, gpEvent, player,
  championBall, hallOfFame,
});
export default spacetimedb;

// --- Reducers (methods on schema object) ---
// With typed args:
export const createGame = spacetimedb.reducer(
  (ctx) => {
    const existing = ctx.db.golfCourse.holeId.find(1);
    if (existing) return;
    ctx.db.golfCourse.insert({
      holeId: 0,   // autoInc assigns real ID — pass 0
      par: 3,
      teeX: 0, teeZ: 0,
      holeX: 0, holeZ: 137,
      distance: 150,
      windX: 0.5, windZ: 0.2,
    });
  }
);

// With named args:
export const initPopulation = spacetimedb.reducer(
  { holeId: t.u32(), popSize: t.u32() },
  (ctx, { holeId, popSize }) => {
    // ...
  }
);

// --- Full reducer list ---
// createGame()           — seed golf course (idempotent)
// registerPlayer(name)   — register player identity + assign color
// initPopulation(holeId, popSize, strategy, championId) — gen pop + simulate (strategy: 'fresh' | 'carryOver' | 'champion')
// simulateShots(genId)   — run physics on a generation
// advanceGeneration(genId) — orchestrator: select → elite breed → crossover → mutate → cleanup → simulate
// setWildcard(genomeId)  — player picks a genome to force-include in next selection

// --- CRUD inside reducers ---
// Insert (autoInc fields: pass 0, DB assigns real value)
ctx.db.golfCourse.insert({ holeId: 0, par: 3, ... });

// Find by primary key or unique column
const row = ctx.db.genome.genomeId.find(42);

// Find by indexed column — use the accessor name from the index definition
for (const g of ctx.db.genome.byGenId.filter(currentGenId)) { ... }

// Iterate all rows
for (const row of ctx.db.trajectoryPoint.iter()) { ... }

// Count
const n = ctx.db.genome.count;

// Update (by primary key — mutate the row object, then call update)
const row = ctx.db.genome.genomeId.find(id);
row.fitness = 0.85;
ctx.db.genome.genomeId.update(row);

// Delete
ctx.db.trajectoryPoint.delete(row);

// Error handling — just throw
throw new Error(`Generation ${genId} not found`);
```

### Key gotchas

- **autoInc:** Pass `0` for autoInc fields on insert. The DB assigns the real value.
- **`public: true`:** Forgetting this means client subscriptions silently get nothing.
- **Regenerate bindings:** After ANY table/reducer change: `make publish && make generate`. Stale bindings cause runtime errors.
- **`export default spacetimedb`:** The schema must be the default export or the module won't load.
- **Index `accessor`:** Every index definition needs `accessor: 'name'` — this is how you reference it in code: `ctx.db.table.accessorName.filter(...)`.
- **No-arg reducers:** Client bindings always expect one argument. For reducers with no params, call with `{}`: `conn.reducers.createGame({})`.
- **`-s local`:** All spacetime CLI commands need this flag for local Docker dev. The Makefile wraps this as `$(STDB)`. Use `spacetime login --server-issued-login local` for persistent identity (re-run after Docker volume wipe).
- **`Math.random` is banned:** SpacetimeDB modules cannot use `Math.random`. Use `ctx.random()` for floats [0,1) and `ctx.random.integerInRange(min, max)` for ints [min,max]. Thread a `Rng` parameter through any function that needs randomness.
- **`spacetime call` uses positional args:** `spacetime call evogolf init_population 1 12 -s local` (not JSON objects).

---

## SpacetimeDB Client (React)

```typescript
// Package: 'spacetimedb' (NOT @spacetimedb/sdk)
// React bindings: 'spacetimedb/react'

// --- Provider setup (main.tsx) ---
import { SpacetimeDBProvider, useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { DbConnection, tables, reducers } from './module_bindings';

const connectionBuilder = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withDatabaseName('evogolf')
  .onConnect((conn, identity, token) => {
    conn.subscriptionBuilder()
      .onApplied(() => console.log('Data ready'))
      .subscribe([
        tables.golfCourse,
        tables.generation,
        tables.genome,
        tables.golfBall,
        tables.trajectoryPoint,
        tables.gpEvent,
        tables.player,
      ]);
  });

function Root() {
  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <App />
    </SpacetimeDBProvider>
  );
}

// --- Reading tables (reactive, re-renders on change) ---
function MyComponent() {
  const [genomes, isReady] = useTable(tables.genome);
  if (!isReady) return <div>Loading...</div>;
  // genomes is an array of all genome rows
}

// --- Calling reducers ---
function Controls() {
  const { isActive, getConnection } = useSpacetimeDB();
  const conn = getConnection();

  const handleInit = () => {
    conn?.reducers.initPopulation({ holeId: 1, popSize: 12 });
  };

  return <button disabled={!isActive} onClick={handleInit}>Initialize</button>;
}

// --- Row callbacks (for side effects, not rendering) ---
conn.db.genome.onInsert((ctx, row) => { ... });
conn.db.genome.onUpdate((ctx, oldRow, newRow) => { ... });
conn.db.genome.onDelete((ctx, row) => { ... });

// --- Direct table access on connection ---
const count = conn.db.genome.count();
for (const row of conn.db.genome.iter()) { ... }
const g = conn.db.genome.genomeId.find(42);
```

---

## React Three Fiber Rules

```tsx
// Canvas wraps all 3D content — sits alongside HTML UI
<Canvas camera={{ position: [0, 80, 100], fov: 50 }}>
  <CourseGround />
  <BallSwarm />
  <TrajectoryLines />
  <OrbitControls />
</Canvas>

// useFrame — per-frame animation. NEVER setState here. Mutate refs.
useFrame((state, delta) => {
  meshRef.current.position.lerp(target, delta * speed);
});

// InstancedMesh for BallSwarm (12 balls, one draw call)
const meshRef = useRef<THREE.InstancedMesh>(null);
<instancedMesh ref={meshRef} args={[geometry, material, 12]}>
// Update per-instance: meshRef.current.setMatrixAt(i, matrix)
// Then: meshRef.current.instanceMatrix.needsUpdate = true

// Ball selection via pointer events
<mesh onPointerDown={(e) => { e.stopPropagation(); setSelected(id); }}>

// drei helpers: <Line>, <Html>, <Grid>, <OrbitControls>, <Text>
```

---

## GP Tree Format

Genome trees are stored as JSON in `treeJson`. Define these types in `server/src/gp/types.ts`:

```typescript
type FuncNode = {
  op: 'add' | 'sub' | 'mul' | 'div_safe' | 'sin' | 'cos' | 'if_gt' | 'max' | 'min';
  children: TreeNode[];
};

type TerminalNode = {
  terminal: 'launch_angle' | 'power' | 'spin_x' | 'spin_z' | 'wind_x' | 'wind_z' | 'const';
  value?: number; // only for 'const', random in [-2, 2]
};

type TreeNode = FuncNode | TerminalNode;

type SwingParams = {
  launch_angle: number; // [8, 60] degrees (sigmoid-mapped from const sum)
  power: number;        // clamped [0, 1]
  spin_x: number;       // clamped [-1, 1]
  spin_z: number;       // clamped [-1, 1]
};
```

**Tree generation:** Ramped half-and-half — for depths 2 through `MAX_TREE_DEPTH`, half use "full" method (all branches to max depth), half use "grow" (random early termination). See PRD "init_population" for full spec.

**Tree evaluation:** Mixed approach. Power, spin_x, spin_z use context-sensitive evaluation (tree evaluated with `activeParam` — param terminals return base value when matching, 0 otherwise). Launch angle is **decoupled**: `sigmoid(sum_of_all_consts * 0.5)` mapped to [8, 60] degrees — this gives the GP direct control via const terminals without needing a `launch_angle` terminal in the tree. The client has a **duplicate evaluator** in `client/src/lib/swingDescription.ts` that must stay in sync with the server's `evaluate.ts`.

**Physics model:** See PRD "simulate_shots" for the full physics spec (gravity, drag, wind, bounce, roll).

### GP Module Structure (`server/src/gp/`)

```
types.ts      — TreeNode, SwingParams, EvalContext, type guards
tree-gen.ts   — rampedHalfAndHalf, generateFull, generateGrow, randomTerminal
evaluate.ts   — evaluateTree (context-sensitive), treeToSwingParams, sumConsts
physics.ts    — simulateBall (trajectory generation)
fitness.ts    — computeFitness, distanceToHole
selection.ts  — tournamentSelection (with wildcard override)
crossover.ts  — subtreeCrossover
mutation.ts   — mutateTree (subtree / point / hoist), fineTuneMutate (Gaussian const perturbation)
utils.ts      — treeDepth, nodeCount, replaceAtIndex, clampTree, serializeTree, parseTree
```

---

## Code Style

- **DB table names:** snake_case (`golf_course`, `trajectory_point`)
- **TS column names in table defs:** camelCase (`genId`, `treeJson`) — SpacetimeDB maps these to snake_case in SQL
- **React components:** PascalCase files and names (`BallSwarm.tsx`)
- **Hooks/utils:** camelCase files (`useBallAnimation.ts`)

### Constants (server/src/constants.ts, mirror in client if needed)

```typescript
export const MAX_SPEED = 70;            // m/s
export const GRAVITY = 9.8;             // m/s²
export const DT = 0.05;                // simulation timestep
export const MAX_SIM_STEPS = 200;       // max trajectory points per ball
export const MAX_TREE_DEPTH = 6;        // GP tree depth cap
export const DEFAULT_POP_SIZE = 12;
export const DEFAULT_MUTATION_RATE = 0.5;
export const DEFAULT_TOURNAMENT_SIZE = 4;
export const STAGNATION_GENS = 10;      // gens without improvement → mutation boost
export const STAGNATION_MUTATION_RATE = 0.8;
export const ELITE_MUTATION_SLOTS = 4;  // fine-tune + structural mutations of elite
export const ELITE_CROSSOVER_SLOTS = 1; // elite × top finisher
export const EXPLORATION_SLOTS = 6;     // tournament crossover + mutation
// Breeding: 1 elite + 4 elite_mutation + 1 elite_crossover + 6 exploration = 12
export const FITNESS_UNEVAL = -1;       // sentinel: unevaluated fitness
export const HOLE_RADIUS = 0.5;         // yards, win threshold
```

---

## Common Mistakes

1. **Forgetting `public: true` on tables** — subscriptions silently return nothing.
2. **Not regenerating bindings** — after schema changes, always `make publish && make generate` or client types are stale.
3. **Missing `export default spacetimedb`** — module won't load without the schema as default export.
4. **Tree depth explosion** — crossover can exceed depth 6. Enforce `MAX_TREE_DEPTH` after every crossover/mutation.
5. **Trajectory bloat** — 2400 rows/gen. Delete old trajectory points (keep last 2 gens max).
6. **Calling reducers in useFrame** — fires 60/sec. Only call from event handlers or useEffect.
7. **setState in useFrame** — re-renders every frame. Mutate refs directly.
8. **div_safe not handled** — `div_safe(a, b)` must return 0 when `|b| < 0.001`.
9. **Not clamping SwingParams** — launch_angle [8,60] via sigmoid, `power` [0,1], spins [-1,1].
10. **Float equality** — never `===` floats. Use `Math.abs(a - b) < 0.001`.

---

## Self-Verification Protocol

After every implementation task, run in order:

1. `cd server && npx tsc --noEmit` — server types pass
2. `cd client && npx tsc --noEmit` — client types pass
3. `make publish` — module publishes clean
4. `make generate` — bindings regenerate
5. `cd client && npx tsc --noEmit` — client still passes with fresh bindings
6. `make logs` — no runtime errors
7. `cd client && npm run dev` — dev server starts
8. Open browser — 3D scene renders
9. Playwright MCP — verify interactive flows if UI changed

Fix failures before moving on.

---

## Architecture Invariants

1. **All GP logic is server-side.** Client never runs physics or modifies fitness. Exception: `client/src/lib/swingDescription.ts` has a read-only tree evaluator for displaying swing params in the Swing Lab — it must mirror `server/src/gp/evaluate.ts`.
2. **Single source of truth is SpacetimeDB.** Client reads from `useTable` subscriptions. No shadow state.
3. **Genome trees are JSON strings.** `treeJson: string` column. Parse on use, serialize on write.
4. **Tree depth capped at 6.** Enforced after every crossover and mutation.
5. **Trajectory points are ephemeral.** Delete when advancing past 2 generations. Never accumulate unbounded.
6. **Fitness -1 means unevaluated.** Check before using in selection or display.
7. **Reducers are idempotent where noted.** `createGame` no-ops if course exists. Phase-transition reducers check current phase.
