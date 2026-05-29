import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_PYTHON = ROOT / "venv" / "Scripts" / "python.exe"

if VENV_PYTHON.exists() and Path(sys.executable).resolve() != VENV_PYTHON.resolve():
    raise SystemExit(subprocess.call([str(VENV_PYTHON), *sys.argv]))

from app import create_app, db
from app.models import Task, user

app = create_app()

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True)
