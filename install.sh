#!/bin/bash

# Define environment name
ENV_DIR="venv_stock_predictor"

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$ENV_DIR" ]; then
    echo "Creating virtual environment: $ENV_DIR"
    python3 -m venv "$ENV_DIR"
else
    echo "Virtual environment $ENV_DIR already exists."
fi

# Activate the environment
echo "Activating environment..."
source "$ENV_DIR/bin/activate"

# Upgrade pip and install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install yfinance pandas numpy scikit-learn xgboost matplotlib argparse

# Deactivate the environment
deactivate

echo "Installation complete."
echo "To run the stock predictor, use:"
echo "  source $ENV_DIR/bin/activate && python stock_predictor.py"
echo "To deactivate, run: deactivate"
