import React, { useState, useEffect } from "react";
import axios from "axios";
import StockChart from "./components/StockChart";
import PredictionTable from "./components/PredictionTable";
import "./index.css";

const API_URL = "https://stock.glitched.dev/predictions";

function App() {
  const [predictions, setPredictions] = useState([]);
  const [filteredStock, setFilteredStock] = useState("All");

  useEffect(() => {
    axios
      .get(API_URL)
      .then((response) => {
        setPredictions(response.data);
      })
      .catch((error) => {
        console.error("Error fetching predictions:", error);
      });
  }, []);

  const filteredData =
    filteredStock === "All"
      ? predictions
      : predictions.filter((item) => item.Stock === filteredStock);

  return (
    <div className="container">
      <h1>📊 Stock Predictions Dashboard</h1>

      {/* Stock Filter Dropdown */}
      <label>Select Stock:</label>
      <select onChange={(e) => setFilteredStock(e.target.value)}>
        <option value="All">All</option>
        {[...new Set(predictions.map((p) => p.Stock))].map((stock) => (
          <option key={stock} value={stock}>
            {stock}
          </option>
        ))}
      </select>

      {/* Stock Chart */}
      <StockChart predictions={filteredData} />

      {/* Predictions Table */}
      <PredictionTable predictions={filteredData} />
    </div>
  );
}

export default App;

