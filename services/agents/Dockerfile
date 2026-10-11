# services/agents — the headless deliberation service.
#
# The image is standalone: it copies only this service, so it can be built and run
# without the TypeScript half of the monorepo present. The Python here is a mirror
# of packages/core/src/council, not a wrapper around it.
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /srv

# Dependencies first so that editing the engine does not re-resolve the world.
COPY services/agents/pyproject.toml ./pyproject.toml
COPY services/agents/README.md ./README.md
RUN pip install --no-cache-dir "fastapi>=0.115" "uvicorn[standard]>=0.30" "pydantic>=2.7"

COPY services/agents/app ./app
COPY services/agents/tests ./tests

# Run unprivileged. The service writes nothing to disk, so nobody needs root.
RUN useradd --create-home --uid 10001 nooreign && chown -R nooreign:nooreign /srv
USER nooreign

EXPOSE 8080

# The healthcheck hits the same endpoint the Docker healthcheck for `web` uses.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
