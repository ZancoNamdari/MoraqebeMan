#!/bin/sh
set -e

# depends_on + healthcheck in docker-compose gets the *container* up
# before this script runs, but "container up" and "Postgres accepting
# connections" aren't the same moment — this loop closes that gap so
# migrate doesn't flake on the first `docker compose up`.
echo "Waiting for Postgres..."
python3 - <<'PYEOF'
import os
import sys
import time

import environ

env = environ.Env()
db_config = env.db_url("DATABASE_URL", default="")
if not db_config:
    print("DATABASE_URL not set, skipping wait")
    sys.exit(0)

# psycopg v3 (not psycopg2) — matches requirements.txt's psycopg[binary]
import psycopg

host = db_config.get("HOST")
port = db_config.get("PORT") or 5432
user = db_config.get("USER")
password = db_config.get("PASSWORD")
name = db_config.get("NAME")

deadline = time.time() + 60
while time.time() < deadline:
    try:
        conn = psycopg.connect(host=host, port=port, user=user, password=password, dbname=name, connect_timeout=3)
        conn.close()
        print("Postgres is ready.")
        sys.exit(0)
    except Exception as exc:
        print(f"Postgres not ready yet ({exc}); retrying...")
        time.sleep(2)

print("Timed out waiting for Postgres.")
sys.exit(1)
PYEOF

echo "Applying database migrations..."
# Only one container should ever run migrate concurrently — Django's
# migrate command has no built-in cross-process locking, so if the web
# service and the celery worker both run it at the same moment on first
# boot, they race to CREATE TABLE and one of them dies with a
# UniqueViolation on pg_type. RUN_MIGRATIONS=0 (set on the worker in
# docker-compose.yml) skips this step there — only identity_service
# owns migrations.
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
    python3 manage.py migrate --noinput
else
    echo "RUN_MIGRATIONS=0 — skipping migrate on this container."
fi

if [ "$DJANGO_ENV" = "production" ] || [ "$DJANGO_ENV" = "staging" ]; then
    echo "Collecting static files..."
    python3 manage.py collectstatic --noinput
fi

echo "Starting: $@"
exec "$@"
