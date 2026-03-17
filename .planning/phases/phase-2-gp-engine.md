# Phase 2: GP Engine

**Branch:** `feat/gp-engine` (worktree from `main` after Phase 1)
**Status:** NOT STARTED
**Goal:** Server-side GP engine that generates random populations, evaluates genome trees, runs physics simulation, and writes trajectory points. Testable entirely via CLI.

## Tasks

- [ ] 2.1 Create `server/src/gp/types.ts` — TreeNode (FuncNode | TerminalNode), SwingParams, operator lists
- [ ] 2.2 Create `server/src/gp/tree-gen.ts` — `randomTree(depth, method)`, `rampedHalfAndHalf(popSize, maxDepth)`
- [ ] 2.3 Create `server/src/gp/evaluate.ts` — `evaluateTree(node, context) → number`, `treeToSwingParams(tree, wind) → SwingParams`, with clamping
- [ ] 2.4 Create `server/src/gp/physics.ts` — `simulateBall(params, tee, wind) → TrajectoryPoint[]`, gravity/drag/bounce
- [ ] 2.5 Create `server/src/gp/fitness.ts` — `computeFitness(finalPos, holePos) → number` (1/(dist+1))
- [ ] 2.6 Create `server/src/gp/utils.ts` — `treeDepth()`, `nodeCount()`, `serializeTree()`, `parseTree()`
- [ ] 2.7 Implement `init_population` reducer — creates generation + N genomes + golf_balls + gp_event
- [ ] 2.8 Implement `simulate_shots` reducer — evaluates all genomes, runs physics, writes trajectory_points, computes fitness, updates generation stats
- [ ] 2.9 Verify: publish, then CLI calls work and produce expected DB state

## Files created/modified

```
server/src/gp/types.ts
server/src/gp/tree-gen.ts
server/src/gp/evaluate.ts
server/src/gp/physics.ts
server/src/gp/fitness.ts
server/src/gp/utils.ts
server/src/index.ts           # add init_population + simulate_shots reducers
server/src/constants.ts       # MAX_SPEED, GRAVITY, DT, etc.
```

## Verification gate

```bash
make publish
spacetime call evogolf create_game --host http://localhost:3000
spacetime call evogolf init_population '{"holeId": 1, "popSize": 12}' --host http://localhost:3000
spacetime sql evogolf "SELECT COUNT(*) FROM genome" --host http://localhost:3000          # 12
spacetime sql evogolf "SELECT COUNT(*) FROM golf_ball" --host http://localhost:3000        # 12
spacetime call evogolf simulate_shots '{"genId": 1}' --host http://localhost:3000
spacetime sql evogolf "SELECT COUNT(*) FROM trajectory_point" --host http://localhost:3000 # ~2400
spacetime sql evogolf "SELECT genome_id, fitness FROM genome WHERE gen_id = 1" --host http://localhost:3000  # all > 0
make logs  # no errors
```
