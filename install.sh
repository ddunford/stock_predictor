#!/bin/bash

echo "🚀 Setting up the AI Stock Predictor Environment..."

# Ensure Python is installed
if ! command -v python3 &> /dev/null
then
    echo "❌ Python3 not found! Please install Python3."
    exit 1
fi

# Create a virtual environment (venv)
if [ ! -d "venv_stock_predictor" ]; then
    python3 -m venv venv_stock_predictor
    echo "✅ Virtual environment created."
fi

# Activate the virtual environment
source venv_stock_predictor/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install required dependencies
pip install tensorflow pandas numpy scikit-learn yfinance matplotlib

echo "✅ Installation complete! Run 'source venv_stock_predictor/bin/activate' to activate the environment."

