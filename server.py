from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

PREDICTION_FILE = "predictions.csv"

@app.route('/predictions', methods=['GET'])
def get_predictions():
    """Fetch predictions from CSV and return as JSON."""
    if not os.path.exists(PREDICTION_FILE):
        return jsonify({"error": "No predictions available"}), 404

    df = pd.read_csv(PREDICTION_FILE)
    df = df.fillna("")  # Replace NaNs with empty strings
    return jsonify(df.to_dict(orient="records"))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

