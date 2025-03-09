from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import os
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

PREDICTION_FILE = "predictions.csv"
EXCHANGE_RATE_API = "https://api.exchangerate-api.com/v4/latest/USD"  # Replace with a working API if needed

def get_usd_to_gbp_rate():
    """Fetch the current USD to GBP exchange rate."""
    try:
        response = requests.get(EXCHANGE_RATE_API)
        data = response.json()
        return data["rates"]["GBP"]
    except Exception as e:
        print(f"⚠ Error fetching exchange rate: {e}")
        return 0.75  # Default fallback exchange rate

@app.route('/predictions', methods=['GET'])
def get_predictions():
    """Fetch predictions from CSV and return as JSON with GBP conversion."""
    if not os.path.exists(PREDICTION_FILE):
        return jsonify([])  # Return empty list instead of an error

    df = pd.read_csv(PREDICTION_FILE)
    df = df.fillna("")  # Replace NaNs with empty strings

    if "Predicted_Time" not in df.columns:
        df["Predicted_Time"] = df["Date"] + " " + df["Time"]

    if "Actual_Time" not in df.columns:
        df["Actual_Time"] = ""

    # Fetch USD to GBP exchange rate
    usd_to_gbp = get_usd_to_gbp_rate()

    # Convert prices to GBP
    df["Predicted_Close_GBP"] = df["Predicted_Close"] * usd_to_gbp
    df["Actual_Close_GBP"] = df["Actual_Close"].apply(lambda x: x * usd_to_gbp if x else "")

    return jsonify(df.to_dict(orient="records"))

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)

