from pathlib import Path

from flask import current_app, g, session
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

user_task_base = declarative_base()


class Task(user_task_base):
    __tablename__ = "task"

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    status = Column(String(30), default="Pending")


def _user_db_path(user_id):
    user_dbs = Path(current_app.instance_path) / "user_dbs"
    user_dbs.mkdir(parents=True, exist_ok=True)
    return user_dbs / f"{user_id}.db"


def _engine_for_user(user_id):
    db_path = _user_db_path(user_id)
    uri = "sqlite:///" + db_path.as_posix()
    return create_engine(uri, connect_args={"check_same_thread": False})


def init_user_database(user_id):
    engine = _engine_for_user(user_id)
    user_task_base.metadata.create_all(engine)
    return engine


def get_user_task_session():
    user_id = session.get("user_id")
    if not user_id:
        return None

    sessions = g.setdefault("user_task_sessions", {})
    if user_id not in sessions:
        engine = _engine_for_user(user_id)
        user_task_base.metadata.create_all(engine)
        sessions[user_id] = sessionmaker(bind=engine)()

    return sessions[user_id]


def close_user_task_session(_exception=None):
    sessions = g.pop("user_task_sessions", None)
    if sessions:
        for user_db in sessions.values():
            user_db.close()
