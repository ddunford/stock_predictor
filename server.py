import pandas as pd
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/predictions", methods=["GET"])
def get_predictions():
    try:
        df = pd.read_csv("predictions.csv")

        # Convert DataFrame to JSON format
        predictions = df.to_dict(orient="records")

        return jsonify(predictions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
