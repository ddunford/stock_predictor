import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import yfinance as yf
import datetime
import os
import csv

# Suppress excessive TensorFlow CUDA warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # 0 = all messages, 1 = INFO, 2 = WARN, 3 = ERROR only


# 🚀 GPU Configuration (Ensures TensorFlow runs on GPU)
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)

        # Avoid duplicate registration of CUDA plugins
        os.environ["XLA_FLAGS"] = "--xla_gpu_cuda_data_dir=/usr/local/cuda"

        print(f"✅ Using {len(gpus)} GPUs: {[gpu.name for gpu in gpus]}")
    except RuntimeError as e:
        print(f"⚠ GPU Setup Error: {e}")
else:
    print("⚠ No GPU detected, running on CPU.")


# 📌 Fetch stock data from Yahoo Finance
def fetch_stock_data(ticker, start="2020-01-01"):
    print(f"📈 Fetching data for {ticker}...")
    stock_data = yf.download(ticker, start=start)
    stock_data["Daily_Return"] = stock_data["Close"].pct_change()
    stock_data["Moving_Avg_50"] = stock_data["Close"].rolling(window=50).mean()
    stock_data["Moving_Avg_200"] = stock_data["Close"].rolling(window=200).mean()
    stock_data.dropna(inplace=True)
    return stock_data



LAST_TRAINED_FILE = "last_trained.txt"

def get_model_filename(stock_symbol):
    return f"models/{stock_symbol}_lstm_model.h5"

def get_last_trained_filename(stock_symbol):
    return f"models/{stock_symbol}_last_trained.txt"

# 📌 Train or Load LSTM Model per Stock
def train_lstm_model(stock_data, stock_symbol, retrain_frequency_days=7):
    features = ["Close", "Daily_Return", "Moving_Avg_50", "Moving_Avg_200"]
    target = "Close"

    scaler = MinMaxScaler(feature_range=(0,1))
    scaled_data = scaler.fit_transform(stock_data[features])

    # Prepare data for LSTM (Last 60 days → Predict next day)
    sequence_length = 60
    X, y = [], []
    for i in range(sequence_length, len(scaled_data)):
        X.append(scaled_data[i-sequence_length:i])
        y.append(scaled_data[i, 0])

    X, y = np.array(X), np.array(y)

    # Split data for training/testing
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    model_file = get_model_filename(stock_symbol)
    last_trained_file = get_last_trained_filename(stock_symbol)

    # Check if the model should be retrained
    if os.path.exists(model_file) and os.path.exists(last_trained_file):
        with open(last_trained_file, "r") as f:
            last_trained_date = datetime.datetime.strptime(f.read().strip(), "%Y-%m-%d")

        days_since_last_train = (datetime.datetime.now() - last_trained_date).days
        if days_since_last_train < retrain_frequency_days:
            print(f"✅ Using pre-trained model for {stock_symbol} (Last trained {days_since_last_train} days ago).")
            model = load_model(model_file)
            return model, scaler

    # If no model exists or retraining is due, train a new model
    print(f"🚀 Training AI model for {stock_symbol} from scratch...")

    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(1)
    ])

    model.compile(optimizer="adam", loss="mean_squared_error")

    # Train model on GPU
    with tf.device('/GPU:0' if gpus else '/CPU:0'):
        model.fit(X_train, y_train, epochs=50, batch_size=32, validation_data=(X_test, y_test))

    # Save the model and update the last trained date
    os.makedirs("models", exist_ok=True)
    model.save(model_file)
    with open(last_trained_file, "w") as f:
        f.write(datetime.datetime.now().strftime("%Y-%m-%d"))

    print(f"✅ Model for {stock_symbol} saved as {model_file}. Retraining scheduled in {retrain_frequency_days} days.")
    return model, scaler


# 📌 Predict next price using trained model
def predict_future_price(model, scaler, stock_data):
    last_60_days = stock_data[["Close", "Daily_Return", "Moving_Avg_50", "Moving_Avg_200"]].tail(60).values
    last_60_days_scaled = scaler.transform(last_60_days)

    X_input = np.array([last_60_days_scaled])
    predicted_price = model.predict(X_input)

    # Convert prediction back to original scale
    predicted_price = scaler.inverse_transform([[predicted_price[0][0], 0, 0, 0]])[0][0]

    # Calculate the next trading day
    last_date = stock_data.index[-1]  # Get last available date
    next_trading_day = last_date + datetime.timedelta(days=1)

    return predicted_price, next_trading_day.strftime("%Y-%m-%d")

# 📌 Convert price from USD to GBP
def convert_to_gbp(usd_price):
    conversion_rate = 0.78  # Example: 1 USD = 0.78 GBP
    return round(usd_price * conversion_rate, 2)

# 📌 Ensure CSV format is correct for UI
def save_prediction(stock_symbol, predicted_price, predicted_date, actual_price):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    csv_file = "predictions.csv"

    prediction_data = pd.DataFrame([{
        "Date": now.split(" ")[0],
        "Time": now.split(" ")[1],
        "Predicted_Time": now,
        "Predicted_Date": predicted_date,  # Store the actual date the prediction is for
        "Actual_Time": "Pending" if pd.isna(actual_price) else now,
        "Stock": stock_symbol,
        "Predicted_Close": round(predicted_price, 2),
        "Predicted_Close_GBP": convert_to_gbp(predicted_price),
        "Actual_Close": "Pending",  # Defer storing actual price until the next day
        "Actual_Close_GBP": "Pending",
        "Correct": "Pending"  # We will update this later when actual price is available
    }])

    file_exists = os.path.isfile(csv_file)
    prediction_data.to_csv(csv_file, mode="a", index=False, header=not file_exists)
    print(f"📁 Prediction saved to {csv_file}")

# 📌 Function to update actual prices the next day
def update_actual_prices():
    print("📈 Updating actual prices...")

    csv_file = "predictions.csv"

    # Ensure the CSV exists
    if not os.path.exists(csv_file):
        print("⚠ predictions.csv not found. Creating a new one...")
        pd.DataFrame(columns=[
            "Date", "Time", "Predicted_Time", "Predicted_Date", "Actual_Time",
            "Stock", "Predicted_Close", "Predicted_Close_GBP", "Actual_Close",
            "Actual_Close_GBP", "Correct"
        ]).to_csv(csv_file, index=False)

    df = pd.read_csv(csv_file)

    for index, row in df.iterrows():
        if row["Actual_Close"] == "Pending":  # Only update rows where actual price is missing
            stock = row["Stock"]
            predicted_date = row["Predicted_Date"]

            try:
                # Fetch actual closing price for the exact predicted date
                actual_data = yf.download(stock, start=predicted_date, end=predicted_date)

                if not actual_data.empty:
                    # Extract actual price as a float, ensuring it is not a Pandas Series
                    actual_price = actual_data["Close"].iloc[-1]  # Extract the last closing price
                    if isinstance(actual_price, pd.Series):
                        actual_price = actual_price.iloc[0]  # Ensure it's a scalar value
                    actual_price = float(actual_price)  # Convert to float

                    # Convert to GBP
                    actual_price_gbp = convert_to_gbp(actual_price)

                    df.at[index, "Actual_Close"] = round(actual_price, 2)
                    df.at[index, "Actual_Close_GBP"] = actual_price_gbp
                    df.at[index, "Actual_Time"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    # Check if prediction was correct
                    predicted_price = row["Predicted_Close"]
                    df.at[index, "Correct"] = "✅" if abs(predicted_price - actual_price) < 5 else "❌"

                    print(f"✅ Updated {stock}: {predicted_date} - Actual: ${actual_price:.2f} / £{actual_price_gbp:.2f}")

            except Exception as e:
                print(f"⚠ Error updating actual price for {stock}: {e}")

    df.to_csv("predictions.csv", index=False)  # Save updated CSV



# 📌 Read Fortune 500 stock symbols from CSV
def get_stocks():
    with open("stocks.csv", "r") as file:
        reader = csv.DictReader(file)
        return [row["Ticker"] for row in reader]

if __name__ == "__main__":
    update_actual_prices()  # Update actual prices before making new predictions

    stocks = get_stocks()

    for stock_symbol in stocks:
        try:
            stock_data = fetch_stock_data(stock_symbol)

            if stock_data.empty:
                print(f"⚠ No data found for {stock_symbol}, skipping...")
                continue

            model, scaler = train_lstm_model(stock_data, stock_symbol, retrain_frequency_days=7)

            predicted_price, predicted_date = predict_future_price(model, scaler, stock_data)

            # Ensure actual_price is a float, not a Series
            if not stock_data.empty and isinstance(stock_data["Close"].iloc[-1], (int, float)):
                actual_price = float(stock_data["Close"].iloc[-1])  # Extract latest closing price
            else:
                actual_price = None  # Store None instead of "Pending" for actual price

            print(f"\n📊 Predicted {stock_symbol} Price: ${predicted_price:.2f} / £{convert_to_gbp(predicted_price)}")
            print(f"📊 Actual {stock_symbol} Price: {actual_price if actual_price != 'Pending' else 'Pending'}")

            save_prediction(stock_symbol, predicted_price, predicted_date, actual_price)

        except Exception as e:
            print(f"⚠ Error processing {stock_symbol}: {e}")

    print("\n✅ AI Model completed successfully for all Fortune 500 stocks!")

