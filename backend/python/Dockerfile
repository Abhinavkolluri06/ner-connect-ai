FROM python:3.14-slim-bookworm
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHON_HOST=0.0.0.0 PYTHON_PORT=8001
COPY backend/python/requirements*.txt ./
# Include serving dependencies for approved sklearn/XGBoost/LightGBM models.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --no-cache-dir -r requirements-boosting.txt \
    && useradd --uid 10001 --create-home app
COPY backend/python/app ./app
USER 10001:10001
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health',timeout=2)"
CMD ["python","-m","app.main"]
