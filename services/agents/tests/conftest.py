"""Pytest bootstrap.

The service is imported as `services.agents.app.*` from the repository root, so
the root has to be on `sys.path` no matter which directory pytest was invoked
from. Doing it here rather than relying on `python -m pytest` (which only adds
the *current* directory) keeps `pytest services/agents/tests` working too.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
