import environ

env = environ.Env()

# DATABASE_URL example (docker-compose): postgres://identity_user:identity_pass@postgres_identity:5432/identity_db
# Local dev fallback lets `manage.py` commands work without docker running.
DATABASES = {
    "default": env.db_url(
        "DATABASE_URL",
        default="postgres://identity_user:identity_pass@localhost:5436/identity_db",
    )
}

DATABASES["default"]["ATOMIC_REQUESTS"] = True
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)