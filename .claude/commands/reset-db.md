Wipe all EvoGolf game data for a fresh start. Run these SQL commands via spacetime CLI:

```bash
spacetime sql evogolf "DELETE FROM trajectory_point" --host http://localhost:3000
spacetime sql evogolf "DELETE FROM golf_ball" --host http://localhost:3000
spacetime sql evogolf "DELETE FROM genome" --host http://localhost:3000
spacetime sql evogolf "DELETE FROM generation" --host http://localhost:3000
spacetime sql evogolf "DELETE FROM gp_event" --host http://localhost:3000
spacetime sql evogolf "DELETE FROM player" --host http://localhost:3000
spacetime sql evogolf "DELETE FROM golf_course" --host http://localhost:3000
```

After clearing, call `create_game` to re-initialize the course:
```bash
spacetime call evogolf create_game --host http://localhost:3000
```

Verify the reset by querying: `spacetime sql evogolf "SELECT COUNT(*) FROM golf_course" --host http://localhost:3000`

Report what was cleared and confirm the course was re-created.
