"""Nooreign deliberation service.

The package is importable as `services.agents.app` from the repository root —
`services/` and `services/agents/` are namespace packages, so no `__init__.py`
is needed above this one and nothing has to be installed for the import path
that `uvicorn services.agents.app.main:app` uses.
"""

from __future__ import annotations

__all__ = ["__version__"]

__version__ = "1.0.0"
