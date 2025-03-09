#!/bin/bash

echo "Stopping Flask API & React UI..."

# Kill Flask API process
pkill -f "python.*server.py"

# Kill React UI (Vite) process
pkill -f "vite"

echo "✅ UI & API stopped!"

