.PHONY: up down publish generate dev reset logs

STDB = -s local

up:
	docker compose up -d

down:
	docker compose down

publish:
	cd server && spacetime publish evogolf $(STDB) -y

generate:
	spacetime generate --lang typescript \
		--out-dir client/src/module_bindings \
		--module-path server

dev: up publish generate
	cd client && npm run dev

reset:
	spacetime sql evogolf "DELETE FROM trajectory_point" $(STDB)
	spacetime sql evogolf "DELETE FROM golf_ball" $(STDB)
	spacetime sql evogolf "DELETE FROM genome" $(STDB)
	spacetime sql evogolf "DELETE FROM generation" $(STDB)
	spacetime sql evogolf "DELETE FROM gp_event" $(STDB)

logs:
	spacetime logs evogolf $(STDB)
