FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render assigns the port via $PORT — bind to it (falls back to 8000 locally)
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
