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
| 2 | GP Engine | `feat/gp-engine` (worktree) | NOT STARTED | Phase 1 | CLI: init_population + simulate_shots work |
| 3 | 3D Visualization | `feat/3d-viz` (worktree) | NOT STARTED | Phase 1 | Balls animate along trajectories |
| — | Merge 2+3 | `main` | NOT STARTED | Phases 2, 3 | tsc passes, app loads |
| 4 | GP Operators | `main` | NOT STARTED | Merge 2+3 | 5+ generations, fitness improves |
| 5 | UI & Polish | `main` | NOT STARTED | Phase 4 | Full game loop playable |

## Parallelism Strategy

After Phase 1 completes on `main`:
- **Phase 2** (server-only: `server/src/gp/`, new reducers in `server/src/index.ts`)
- **Phase 3** (client-only: `client/src/components/`, `client/src/hooks/`)

These touch **zero overlapping files**, so they run in parallel worktrees and merge cleanly.

## Current State

**Next action:** Spawn parallel worktrees for Phase 2 + Phase 3

---

## Completion Log

- **Phase 1** (2026-03-17): Foundation complete. Key deviations: CLI uses `--anonymous -s local` (not `--host`), `spacetime generate` uses `--module-path` (no server needed), indexes require `accessor` field, no-arg reducers need `{}` on client. Docker image: clockworklabs/spacetime, CLI v2.0.5, SDK v2.0.4.
