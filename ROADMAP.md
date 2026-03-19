# EvoGolf — Development Roadmap

## How to use this file

This roadmap tracks progress across conversations. At the start of each session:

1. Read this file to see current state
2. Read the next incomplete phase file in `.planning/phases/`
3. Execute tasks, checking them off as you go
4. Run the verification gate
5. Update status here when the phase is done

## Phases

| # | Phase | Branch | Status | Depends on | Verification |
|---|-------|--------|--------|------------|--------------|
| 1 | Foundation | `main` | DONE | — | Course renders in browser |
| 2 | GP Engine | `feat/gp-engine` (worktree) | DONE | Phase 1 | CLI: init_population + simulate_shots work |
| 3 | 3D Visualization | `feat/3d-viz` (worktree) | DONE | Phase 1 | Balls animate along trajectories |
| — | Merge 2+3 | `main` | DONE | Phases 2, 3 | tsc passes, app loads |
| 4 | GP Operators | `main` | DONE | Merge 2+3 | 5+ generations, fitness improves |
| 5 | UI & Polish | `main` | DONE | Phase 4 | Full game loop playable |
| 6 | Multiplayer + Breeding Tuning | `main` | DONE | Phase 5 | Multiple players evolve independently, elite breeding works |

## Parallelism Strategy

After Phase 1 completes on `main`:
- **Phase 2** (server-only: `server/src/gp/`, new reducers in `server/src/index.ts`)
- **Phase 3** (client-only: `client/src/components/`, `client/src/hooks/`)

These touch **zero overlapping files**, so they run in parallel worktrees and merge cleanly.

## Current State

**Next action:** All phases complete. Future work: further GP tuning, mobile support, deployment.

---

## Completion Log

- **Phase 1** (2026-03-17): Foundation complete. Key deviations: CLI uses `-s local` (not `--host`), `spacetime generate` uses `--module-path` (no server needed), indexes require `accessor` field, no-arg reducers need `{}` on client. Docker image: clockworklabs/spacetime, CLI v2.0.5, SDK v2.0.4.
- **Phase 2** (2026-03-17): GP Engine complete. Key deviation: `Math.random` banned in SpacetimeDB modules — must use `ctx.random` (Rng param threaded through all GP functions). `spacetime call` uses positional args: `spacetime call evogolf init_population 1 12 -s local`.
- **Phase 3** (2026-03-17): 3D Visualization complete. BallSwarm (InstancedMesh), TrajectoryLines (drei Line), useBallAnimation hook. All components handle empty state.
- **Merge 2+3** (2026-03-17): Clean merge, zero conflicts. Post-merge fix: `import type` for SpacetimeDB bundler, persistent identity via `spacetime login --server-issued-login local`. Verified: 12 genomes, 2260 trajectory points, all fitness scores computed.
- **Phase 4** (2026-03-17): GP Operators complete. Tournament selection, subtree crossover, 3-type mutation (subtree/point/hoist), elitism. `advanceGeneration` orchestrator does full pipeline: select → replicate elite → crossover → mutate → cleanup old trajectories → simulate. Verified: 6 generations (0-5), best fitness improved 10x (0.0099 → 0.1039), avg fitness 5x (0.0073 → 0.0353). `setWildcard` reducer for player genome selection.
- **Phase 5** (2026-03-18): UI & Polish complete. Swing Lab (genome inspector with English descriptions + param bars), GPControlPanel with strategy selection, FitnessChart, EventLog, HUD, CameraController (follow/green-view modes), HallOfFame, WinOverlay.
- **Phase 6** (2026-03-18–19): Multiplayer + breeding tuning. Per-player identity and independent evolution. Leaderboard with opponent inspection. Elite-centered breeding (1+4+1+6=12). Fine-tune mutation (`fineTuneMutate` with Gaussian const perturbation). Launch angle decoupled from 4-pass evaluation → sigmoid(sum_of_consts) mapped to [8,60]. Course rotation on hole-in-one with genome carry-over. Champion balls and Hall of Fame.
