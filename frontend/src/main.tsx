import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./index.css";

const API_URL = "https://stock.glitched.dev/predictions";

interface Prediction {
  Date: string;
  Time: string;
  Predicted_Time: string;
  Actual_Time: string | null;
  Stock: string;
  Predicted_Close: number;
  Actual_Close: number | null;
  Predicted_Close_GBP: number;
  Actual_Close_GBP: number | null;
  Correct: string | null;
}

const App = () => {
  const [data, setData] = useState<Prediction[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error("No predictions available");
        }
        return res.json();
      })
      .then((data) => {
        if (data.length === 0) {
          throw new Error("No predictions available");
        }
        setData(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Group data by stock
  const stockGroups = data.reduce((acc, curr) => {
    if (!acc[curr.Stock]) {
      acc[curr.Stock] = [];
    }
    acc[curr.Stock].push(curr);
    return acc;
  }, {} as Record<string, Prediction[]>);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">📈 Stock Prediction Results</h1>

      {error ? (
        <div className="text-red-500 font-semibold">⚠ {error}</div>
      ) : (
        <>
          {/* Filter Dropdown */}
          <select
            className="mb-4 p-2 border rounded"
            onChange={(e) => setSelectedStock(e.target.value)}
          >
            <option value="">All Stocks</option>
            {Array.from(new Set(data.map((d) => d.Stock))).map((stock) => (
              <option key={stock} value={stock}>
                {stock}
              </option>
            ))}
          </select>

          {/* Table View */}
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2">Stock</th>
                <th className="p-2">Predicted Time</th>
                <th className="p-2">Predicted Price (USD/GBP)</th>
                <th className="p-2">Actual Time</th>
                <th className="p-2">Actual Price (USD/GBP)</th>
                <th className="p-2">Correct?</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{row.Stock}</td>
                  <td className="p-2">{row.Predicted_Time}</td>
                  <td className="p-2">
                    ${row.Predicted_Close.toFixed(2)} / £{row.Predicted_Close_GBP.toFixed(2)}
                  </td>
                  <td className="p-2">{row.Actual_Time || "Pending"}</td>
                  <td className="p-2">
                    {row.Actual_Close ? `$${row.Actual_Close.toFixed(2)} / £${row.Actual_Close_GBP?.toFixed(2)}` : "Pending"}
                  </td>
                  <td className="p-2">{row.Correct || "?"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Chart View */}
          <h2 className="text-xl font-bold mt-6">📊 Predicted vs. Actual Prices</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <XAxis dataKey="Date" />
              <YAxis
                domain={([dataMin, dataMax]) => [Math.max(0, dataMin - 5), dataMax + 5]} // Auto-scale
                tickFormatter={(value) => `$${value.toFixed(0)}`} // Format ticks as prices
              />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              {Object.entries(stockGroups).map(([stock, stockData]) => {
                const latestData = stockData.slice(-10); // Only last 10 points
                return (
                  <>
                    <Line
                      type="monotone"
                      data={latestData}
                      dataKey="Predicted_Close"
                      stroke="blue"
                      name={`${stock} - Predicted`}
                      key={`${stock}-predicted`}
                    />
                    <Line
                      type="monotone"
                      data={latestData}
                      dataKey="Actual_Close"
                      stroke="red"
                      name={`${stock} - Actual`}
                      key={`${stock}-actual`}
                    />
                  </>
                );
              })}
            </LineChart>
          </ResponsiveContainer>

        </>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

