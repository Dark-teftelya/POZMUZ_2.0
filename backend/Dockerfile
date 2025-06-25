# Базовый образ
FROM python:3.9.19-slim AS builder

# Установка зависимостей ОС
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копирование requirements.txt
COPY requirements.txt .

# Установка Python-зависимостей
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Финальный образ
FROM python:3.9.19-slim

# Установка минимальных зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Создание пользователя
RUN useradd -m -r appuser && \
    mkdir -p /app /app/static /app/media && \
    chown -R appuser:appuser /app

# Копирование зависимостей из builder
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Копирование кода
COPY . /app

# Настройка рабочей директории и пользователя
WORKDIR /app
USER appuser

# Команда запуска
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "track_separation.wsgi:application"]