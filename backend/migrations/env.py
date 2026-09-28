from logging.config import fileConfig
import os

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from database import Base
from models import Utilisateur


# ============================================================
# Configuration Alembic
# ============================================================

config = context.config


# ============================================================
# Configuration du logging
# ============================================================

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ============================================================
# Métadonnées SQLAlchemy
# ============================================================

target_metadata = Base.metadata


# ============================================================
# URL PostgreSQL
# ============================================================

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError(
        "La variable d'environnement DATABASE_URL est introuvable."
    )

# Render/PostgreSQL peut parfois fournir une URL commençant
# par postgres://. SQLAlchemy/psycopg2 utilise postgresql://.
if database_url.startswith("postgres://"):
    database_url = database_url.replace(
        "postgres://",
        "postgresql://",
        1,
    )

config.set_main_option(
    "sqlalchemy.url",
    database_url.replace("%", "%%"),
)


# ============================================================
# Migration OFFLINE
# ============================================================

def run_migrations_offline() -> None:
    """Exécute les migrations sans connexion directe à la base."""

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ============================================================
# Migration ONLINE
# ============================================================

def run_migrations_online() -> None:
    """Exécute les migrations avec une connexion PostgreSQL."""

    connectable = engine_from_config(
        config.get_section(
            config.config_ini_section,
            {},
        ),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


# ============================================================
# Point d'entrée
# ============================================================

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()