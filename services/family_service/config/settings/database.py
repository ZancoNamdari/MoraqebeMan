import environ

env = environ.Env()

DATABASES = {
    "default": env.db_url(
        "DATABASE_URL",
        default="postgres://family_user:family_pass@localhost:5437/family_db",
    )
}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
