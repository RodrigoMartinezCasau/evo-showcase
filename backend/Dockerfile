# Minimal image for deploying the FastAPI app (Railway, Fly.io, Render, Cloud Run…).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
# Railway (y otros hosts) envían PORT dinámico; local sigue usando 8000 por defecto.
EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
