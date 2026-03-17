# Execution Protocol

## Starting a session

```
1. Read ROADMAP.md → find current phase
2. Read .planning/phases/phase-N-*.md → get task list
3. Execute tasks in order, checking off as you go
4. Run verification gate at end
5. Update ROADMAP.md status + completion log
```

## Phase execution rules

- **One phase per session** unless Phase 1 (small enough to do in one shot).
- **Check off tasks** in the phase file as you complete them (`- [x]`).
- **If a task fails or deviates**, add a `## Notes` section to the phase file explaining what changed and why.
- **Never skip the verification gate.** If it fails, fix before marking complete.

## Worktree phases (2 + 3)

After Phase 1 is complete and committed on `main`:

```bash
# Create worktrees for parallel development
git worktree add ../evogolf-gp-engine feat/gp-engine
git worktree add ../evogolf-3d-viz feat/3d-viz
```

Phase 2 runs entirely in `../evogolf-gp-engine/` (server-only files).
Phase 3 runs entirely in `../evogolf-3d-viz/` (client-only files).

These can be executed by parallel agents using `isolation: "worktree"`, or sequentially in separate sessions.

### Merging

After both complete:
```bash
git checkout main
git merge feat/gp-engine --no-ff -m "Phase 2: GP Engine"
git merge feat/3d-viz --no-ff -m "Phase 3: 3D Visualization"
# Should merge cleanly — zero file overlap
make publish && make generate
cd client && npx tsc --noEmit   # verify combined code compiles
```

Update ROADMAP.md merge row to DONE.

## Updating progress

After completing a phase, update ROADMAP.md:

1. Change the phase status to `DONE`
2. Add an entry to the Completion Log:
   ```
   - **Phase N** (YYYY-MM-DD): Brief summary. Any deviations noted.
   ```
3. Update "Next action" to point to the next phase.

## If context runs out mid-phase

If you need to stop mid-phase:
1. Check off completed tasks in the phase file
2. Add a `## Stopped at` section noting exactly where you left off
3. Update ROADMAP.md status to `IN PROGRESS`
4. Next session picks up from the unchecked tasks

## Commit strategy

- **One commit per logical unit** (e.g., "define all tables", "implement init_population reducer")
- **Not one commit per file** — group related changes
- Phase 1 gets ~3-4 commits on main
- Phase 2 gets ~3 commits on feat/gp-engine
- Phase 3 gets ~2 commits on feat/3d-viz
- Phase 4 gets ~3 commits on main
- Phase 5 gets ~3 commits on main
