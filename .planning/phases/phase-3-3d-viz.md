# Phase 3: 3D Visualization

**Branch:** `feat/3d-viz` (worktree from `main` after Phase 1)
**Status:** NOT STARTED
**Goal:** Client renders balls, animates them along trajectory paths, color-codes by origin, and supports click-to-select. Assumes Phase 2 data exists in DB (or will exist after merge).

## Tasks

- [ ] 3.1 Create `client/src/hooks/useBallAnimation.ts` — takes trajectory points, returns current position via useFrame interpolation
- [ ] 3.2 Create `client/src/components/BallSwarm.tsx` — InstancedMesh for 12 balls, color by origin (white=random, gold=replication, green=crossover, purple=mutation)
- [ ] 3.3 Create `client/src/components/TrajectoryLines.tsx` — drei `<Line>` per ball, color-matched, selected ball's line thicker/opaque
- [ ] 3.4 Create `client/src/lib/colors.ts` — origin-to-color mapping, shared between BallSwarm and TrajectoryLines
- [ ] 3.5 Add selected ball state to App — click handler on balls sets selectedGenomeId
- [ ] 3.6 Wire components into `<App>` Canvas
- [ ] 3.7 Verify: with data in DB, balls render and animate correctly

## Files created/modified

```
client/src/hooks/useBallAnimation.ts
client/src/components/BallSwarm.tsx
client/src/components/TrajectoryLines.tsx
client/src/lib/colors.ts
client/src/App.tsx              # add BallSwarm, TrajectoryLines, selection state
```

## Verification gate

```bash
cd client && npx tsc --noEmit    # types pass
cd client && npm run dev          # starts
# Browser: after Phase 2 data exists —
#   12 balls visible on tee or along trajectories
#   balls colored by origin
#   clicking a ball highlights it
#   trajectory lines visible
```

## Note on testing without Phase 2

If developing before Phase 2 merge, you can manually insert test data:
```bash
spacetime sql evogolf "INSERT INTO genome (genome_id, gen_id, tree_json, tree_depth, node_count, fitness, origin, parent_a_id, parent_b_id, is_elite, is_selected) VALUES (1, 1, '{}', 1, 1, 0.5, 'random', 0, 0, false, false)" --host http://localhost:3000
```
Or just ensure types compile and components render empty state gracefully.
