# Stage 1: Build the C++ Engine
FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y \
    g++ \
    cmake \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/engine
COPY engine/ .
RUN mkdir build && cd build && cmake .. && make realis_simulator

# Stage 2: Python Backend
FROM python:3.11-slim-bookworm

WORKDIR /app

# Copy compiled engine from builder
COPY --from=builder /app/engine/build/realis_simulator /app/engine/build/realis_simulator

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend tool
COPY tools/ ./tools/

# Environment variables
ENV REALIS_SIM_PATH=/app/engine/build/realis_simulator
ENV PORT=8000

# Run the server
CMD ["python", "tools/server.py"]
