# Stage 1: Builder
FROM python:3.11-slim AS builder

# Установка зависимостей для FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Установка рабочей директории
WORKDIR /app

# Установка переменных окружения
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Копирование и установка зависимостей
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim

# Установка FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Создание пользователя без root-прав
RUN useradd -m -r appuser && \
    mkdir -p /app /app/staticfiles /app/media /app/Uploads /app/output && \
    chown -R appuser:appuser /app

# Копирование зависимостей из builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Установка рабочей директории
WORKDIR /app

# Копирование кода приложения
COPY --chown=appuser:appuser . .

# Переключение на пользователя без root-прав
USER appuser

# Открытие порта
EXPOSE 8000

# Запуск Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "track_separation.wsgi:application"]