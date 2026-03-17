# Phase 5: UI & Polish

**Branch:** `main`
**Status:** NOT STARTED
**Goal:** Complete game UI — genome tree panel, control panel with step-by-step and auto-evolve, fitness chart, HUD, win condition. The full game loop is playable in the browser.

## Tasks

- [ ] 5.1 Create `client/src/components/GenomeTreePanel.tsx` — recursive tree renderer as HTML overlay (drei `<Html>`), shows selected genome's tree with operator/terminal nodes, stats (depth, fitness, origin)
- [ ] 5.2 Create `client/src/components/GPControlPanel.tsx` — phase indicator bar, action buttons (Initialize, Launch, Select, Breed, Auto-Evolve), generation counter, wildcard button, speed slider
- [ ] 5.3 Create `client/src/components/FitnessChart.tsx` — recharts LineChart with best (solid) and avg (dashed) fitness over generations
- [ ] 5.4 Create `client/src/components/HUD.tsx` — hole info (par, distance, wind), gen number, pop size, best distance, "Hole in one!" overlay
- [ ] 5.5 Wire GPControlPanel buttons to reducers via conn.reducers.*
- [ ] 5.6 Implement auto-evolve mode — calls advance_generation on interval, pause/resume
- [ ] 5.7 Win condition — detect distance_to_hole < 0.5, show celebration overlay with winning genome
- [ ] 5.8 Add event log panel — shows gp_event descriptions in scrollable list
- [ ] 5.9 Layout — position all panels (tree panel right side, controls bottom, chart bottom-right, HUD top)
- [ ] 5.10 Verify: full game loop end-to-end in browser

## Files created/modified

```
client/src/components/GenomeTreePanel.tsx
client/src/components/GPControlPanel.tsx
client/src/components/FitnessChart.tsx
client/src/components/HUD.tsx
client/src/components/EventLog.tsx
client/src/App.tsx              # wire everything together, layout
client/src/styles/              # any CSS needed
```

## Verification gate

```bash
cd client && npx tsc --noEmit
cd client && npm run dev
# Full manual playthrough:
# 1. Page loads → course visible, "Initialize" button enabled
# 2. Click Initialize → 12 balls on tee, genome panel shows trees
# 3. Click Launch → balls fly, trajectories drawn
# 4. Click a ball → genome tree shows in panel, "Sponsor" button appears
# 5. Click Select → selection highlights
# 6. Click Breed → new gen appears
# 7. Repeat 3-6 a few times, watch fitness chart climb
# 8. Toggle Auto-Evolve → runs automatically
# 9. Eventually: "Hole in one!" celebration
# Playwright MCP: automate the above flow
```
