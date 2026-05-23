# Use Python 3.10 slim base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENV_STATE=production

# Set work directory
WORKDIR /app

# Install system dependencies (including curl for Healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies as a separate layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user and group
RUN addgroup --system appgroup && adduser --system --group appuser

# Copy project files and change ownership
COPY --chown=appuser:appgroup . /app

# Ensure the /app directory itself is owned by appuser so it can create new logs
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Use direct Uvicorn to avoid Windows CRLF issues in shell scripts and "not found" errors
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
