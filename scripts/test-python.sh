#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../backend/python"
PYTHON_COMMAND=python
if [ -x .venv/bin/python ]; then PYTHON_COMMAND=.venv/bin/python; fi
"$PYTHON_COMMAND" -m ruff check .
"$PYTHON_COMMAND" -m ruff format --check .
"$PYTHON_COMMAND" -m pytest
