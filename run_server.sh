#!/bin/bash

# Define project paths
PROJECT_DIR="/mnt/aimated/code/stockmarket"
VENV_DIR="$PROJECT_DIR/venv_stock_predictor"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Start Flask API in the background
echo "Starting Flask API..."
nohup python "$PROJECT_DIR/server.py" > "$PROJECT_DIR/flask.log" 2>&1 &


