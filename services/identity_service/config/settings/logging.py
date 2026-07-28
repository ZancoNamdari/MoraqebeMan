from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} — {message}",
            "style": "{",
        },
        "json": {
            # Structured logs — easier to ship to ELK/Loki later than
            # free-text. Swap for python-json-logger if you want real
            # JSON instead of a JSON-shaped format string.
            "format": '{{"time": "{asctime}", "level": "{levelname}", '
                      '"logger": "{name}", "message": "{message}"}}',
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "identity_service.log",
            "maxBytes": 10 * 1024 * 1024,  # 10MB
            "backupCount": 5,
            "formatter": "verbose",
        },
        # Auth events (login, role change, failed attempts) get their own
        # file — this is what apps/audit reads from / writes structured
        # entries into, kept separate from general app noise so it's
        # easy to ship to a SIEM or just grep in an incident.
        "audit_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "audit.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 10,
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console", "app_file"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "app_file"],
            "level": "INFO",
            "propagate": False,
        },
        "apps.audit": {
            "handlers": ["console", "audit_file"],
            "level": "INFO",
            "propagate": False,
        },
        "apps.authentication": {
            "handlers": ["console", "audit_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}