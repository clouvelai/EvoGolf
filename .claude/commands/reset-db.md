Wipe all EvoGolf game data for a fresh start. Run these SQL commands via spacetime CLI:

```bash
spacetime sql evogolf "DELETE FROM trajectory_point" -s local
spacetime sql evogolf "DELETE FROM golf_ball" -s local
spacetime sql evogolf "DELETE FROM genome" -s local
spacetime sql evogolf "DELETE FROM generation" -s local
spacetime sql evogolf "DELETE FROM gp_event" -s local
spacetime sql evogolf "DELETE FROM hall_of_fame" -s local
spacetime sql evogolf "DELETE FROM player" -s local
spacetime sql evogolf "DELETE FROM golf_course" -s local
```

After clearing, call `create_game` to re-initialize the course:
```bash
spacetime call evogolf create_game -s local
```

Verify the reset by querying: `spacetime sql evogolf "SELECT COUNT(*) FROM golf_course" -s local`

Report what was cleared and confirm the course was re-created.
