import environ

env = environ.Env()

DATABASES = {
    "default": env.db_url(
        "DATABASE_URL",
        default="postgres://moraqebeman_user:moraqebeman_pass@localhost:5440/moraqebeman_db",
    )
}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
