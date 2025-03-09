#!/bin/bash

echo "Stopping Flask API & React UI..."

# Kill Flask API process
pkill -f "python.*server.py"

# Kill React UI process
pkill -f "npm.*dev"

echo "✅ UI & API stopped!"

