import yfinance as yf
import pandas as pd
import numpy as np
import os
import ssl
import urllib3
import argparse
import requests
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error

# Configuration
STOCKS_TO_TRACK = ["AAPL", "TSLA", "GOOGL", "AMZN", "MSFT", "BTC-USD"]
LOOKBACK_DAYS = 60
PREDICTION_DAYS = 5
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PREDICTION_FILE = os.path.join(SCRIPT_DIR, "predictions.csv")
LOG_FILE = os.path.join(SCRIPT_DIR, "stock_predictor.log")

# Ignore SSL verification issues temporarily
ssl._create_default_https_context = ssl._create_unverified_context
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

import requests

def get_gbp_exchange_rate():
    """Fetch the latest USD to GBP exchange rate."""
    try:
        response = requests.get("https://api.exchangerate-api.com/v4/latest/USD")
        data = response.json()
        return data["rates"]["GBP"]
    except Exception as e:
        print(f"⚠ Error fetching GBP exchange rate: {e}")
        return 0.78  # Default fallback exchange rate (update as needed)

def fetch_stock_data(stock, period="2y"):
    """Fetch historical stock/crypto data, handling missing price errors."""
    session = requests.Session()
    session.verify = True  # Ensure SSL verification

    try:
        data = yf.download(stock, period=period, auto_adjust=False, session=session, progress=False)

        if data.empty:
            print(f"⚠ Warning: No data received for {stock}. Trying latest available day...")

            # Try fetching the last available data instead of failing
            data = yf.download(stock, period="7d", interval="1d", auto_adjust=False, session=session)
            if data.empty:
                print(f"❌ Still no data for {stock}. Skipping...")
                return None

        # Remove weekends for stocks, but keep for crypto (which trades 24/7)
        if "USD" not in stock:  # Crypto like BTC-USD trades all days
            data = data[data.index.dayofweek < 5]

        return data
    except Exception as e:
        print(f"❌ Failed to get data for {stock} due to: {str(e)}")
        return None

def compute_indicators(data):
    """Add technical indicators"""
    data["SMA50"] = data["Close"].rolling(window=50).mean()
    data["SMA200"] = data["Close"].rolling(window=200).mean()
    data["RSI"] = compute_rsi(data["Close"])
    data["Momentum"] = data["Close"].diff()
    data["Volatility"] = data["Close"].rolling(20).std()
    data.dropna(inplace=True)
    return data

def compute_rsi(series, period=14):
    """Compute Relative Strength Index (RSI)"""
    delta = series.diff(1)
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def train_model(stock_data):
    """Train XGBoost model"""
    stock_data["Target"] = stock_data["Close"].shift(-PREDICTION_DAYS)
    stock_data.dropna(inplace=True)

    features = ["Close", "SMA50", "SMA200", "RSI", "Momentum", "Volatility"]
    X = stock_data[features]
    y = stock_data["Target"]

    if X.empty or y.empty:
        print("⚠ Warning: Not enough data to train the model. Skipping...")
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    model = XGBRegressor(objective="reg:squarederror", n_estimators=100)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"✅ Model trained - MAE: {mae:.2f}")

    return model

def predict_next_days(model, stock_data):
    """Predict stock price for the next few days"""
    latest_data = stock_data.tail(LOOKBACK_DAYS)[["Close", "SMA50", "SMA200", "RSI", "Momentum", "Volatility"]]
    prediction = model.predict(latest_data.tail(1))
    return prediction[0]

def generate_trade_signals(stock, predicted_price, latest_price):
    """Generate buy/sell recommendations"""
    diff = (predicted_price - latest_price) / latest_price * 100

    if isinstance(diff, pd.Series):
        diff = diff.iloc[0]

    if diff > 5:
        return "BUY"
    elif diff < -5:
        return "SELL"
    else:
        return "HOLD"

from datetime import datetime

def save_prediction(stock, predicted_price):
    """Save prediction to CSV file, ensuring timestamps are logged."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # Full timestamp

    # Load existing data to avoid duplicates
    if os.path.exists(PREDICTION_FILE):
        existing_df = pd.read_csv(PREDICTION_FILE)
    else:
        existing_df = pd.DataFrame(columns=["Date", "Time", "Stock", "Predicted_Close", "Actual_Close", "Correct"])

    # Append new prediction with timestamp
    df = pd.DataFrame([{
        "Date": now.split(" ")[0],
        "Time": now.split(" ")[1],  # Store the exact time
        "Stock": stock,
        "Predicted_Close": predicted_price,
        "Actual_Close": None,  # Will update later
        "Correct": None
    }])

    df.to_csv(PREDICTION_FILE, mode="a", header=not os.path.exists(PREDICTION_FILE), index=False)

def update_actual_prices():
    """Update actual prices for all past predictions using the most recent available price."""
    if not os.path.exists(PREDICTION_FILE):
        return

    df = pd.read_csv(PREDICTION_FILE)

    unverified = df[df["Actual_Close"].isna()]  # Find all missing actual prices
    if unverified.empty:
        return

    for index, row in unverified.iterrows():
        stock = row["Stock"]
        prediction_time = datetime.strptime(f"{row['Date']} {row['Time']}", "%Y-%m-%d %H:%M:%S")

        # Determine how far ahead we should check actual prices
        if "USD" in stock:  # Crypto (BTC-USD, ETH-USD, etc.) → Use hourly price
            interval = "1h"
        else:  # Stocks → Use closest available price (1h intraday or 1d close)
            interval = "1h"

        actual_price = None  # Ensure variable is always defined

        # Fetch actual price data
        try:
            stock_data = yf.download(stock, period="1d", interval=interval, progress=False, auto_adjust=False)

            if stock_data.empty:
                print(f"⚠ No actual price data for {stock} on {row['Date']}. Skipping...")
                continue

            # Find the closest timestamped price
            closest_time = stock_data.index.asof(prediction_time)
            if pd.isna(closest_time):
                continue  # Skip if there's no valid close price

            actual_price = stock_data.loc[closest_time, "Close"]

            # Ensure actual_price is a float, not a Pandas Series
            if isinstance(actual_price, pd.Series):
                actual_price = actual_price.iloc[0]

            df.at[index, "Actual_Close"] = float(actual_price)

            predicted_price = row["Predicted_Close"]
            error = abs(predicted_price - actual_price) / actual_price * 100
            df.at[index, "Correct"] = "✅" if error <= 5 else "❌"

        except Exception as e:
            print(f"⚠ Error updating actual price for {stock}: {str(e)}")

    df.to_csv(PREDICTION_FILE, index=False)

def main(args):
    if args.view:
        print(pd.read_csv(PREDICTION_FILE) if os.path.exists(PREDICTION_FILE) else "No stored predictions.")
        return

    update_actual_prices()

    exchange_rate = get_gbp_exchange_rate()  # Get USD to GBP conversion rate

    for stock in STOCKS_TO_TRACK:
        print(f"\n📈 Fetching data for {stock}...")
        stock_data = fetch_stock_data(stock)

        if stock_data is None or stock_data.empty:
            print(f"⚠ Skipping {stock} due to missing data.")
            continue

        stock_data = compute_indicators(stock_data)
        model = train_model(stock_data)

        if model is None:
            continue

        predicted_price = predict_next_days(model, stock_data)
        latest_price = stock_data["Close"].iloc[-1]

        if isinstance(predicted_price, pd.Series):
            predicted_price = predicted_price.iloc[0]
        if isinstance(latest_price, pd.Series):
            latest_price = latest_price.iloc[0]

        # Convert USD prices to GBP
        predicted_price_gbp = predicted_price * exchange_rate
        latest_price_gbp = latest_price * exchange_rate

        recommendation = generate_trade_signals(stock, predicted_price, latest_price)
        save_prediction(stock, predicted_price)

        print(f"{recommendation} {stock} (Predicted: ${predicted_price:.2f} / £{predicted_price_gbp:.2f}, Current: ${latest_price:.2f} / £{latest_price_gbp:.2f})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--view", action="store_true", help="View stored predictions")
    args = parser.parse_args()
    main(args)
