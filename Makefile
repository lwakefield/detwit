start-db:
	docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres

serve-dev:
	POSTGRES_URI=postgres://postgres:password@localhost:5432 \
				watchexec --restart --signal=SIGKILL \
				'deno run --allow-env --allow-net --allow-read server.ts'

migrate-dev:
	POSTGRES_URI=postgres://postgres:password@localhost:5432 \
				deno run --allow-env --allow-net bin/migrate.ts

nuke-dev-db:
	POSTGRES_URI=postgres://postgres:password@localhost:5432 \
				deno run --allow-env --allow-net bin/nuke-db.ts 'i know what i am doing'

