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

# Navigate to the frontend folder
cd "$FRONTEND_DIR"

# Start React UI in the background
echo "Starting React UI..."
nohup npm run dev > "$PROJECT_DIR/ui.log" 2>&1 &

echo "✅ UI & API started successfully! Access at:"
echo "📌 Flask API: http://localhost:5000"
echo "📌 React UI: http://localhost:3000"


