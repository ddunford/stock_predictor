import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
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
  const [selectedAssetType, setSelectedAssetType] = useState<"stocks" | "crypto">("stocks");
  const [dateRange, setDateRange] = useState<"1d" | "7d" | "30d">("7d");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch(() => console.error("Error fetching predictions"));
  }, []);

  // Filter Data by Date Range
  const now = new Date();
  const filteredData = data.filter((d) => {
    const recordDate = new Date(d.Date);
    const daysDiff = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dateRange === "1d") return daysDiff < 1;
    if (dateRange === "7d") return daysDiff < 7;
    return true; // Default to 30 days
  });

  // Split data into stocks and crypto
  const stocks = filteredData.filter((d) => !d.Stock.includes("USD"));
  const crypto = filteredData.filter((d) => d.Stock.includes("USD"));

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = (selectedAssetType === "stocks" ? stocks : crypto).slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil((selectedAssetType === "stocks" ? stocks : crypto).length / rowsPerPage);

  // Format graph data to prevent duplicate dates
  const formatGraphData = (dataset: Prediction[]) => {
    const grouped: { [key: string]: any } = {};
    dataset.forEach((entry) => {
      const key = `${entry.Date} ${entry.Time}`; // Ensure timestamps are unique
      if (!grouped[key]) {
        grouped[key] = { Date: key };
      }
      grouped[key][`${entry.Stock} - Predicted`] = entry.Predicted_Close;
      grouped[key][`${entry.Stock} - Actual`] = entry.Actual_Close;
    });
    return Object.values(grouped);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">📈 Stock Prediction Results</h1>

      {/* Date Range Filter */}
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${dateRange === "1d" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => setDateRange("1d")}
        >
          Last 24 Hours
        </button>
        <button
          className={`px-4 py-2 rounded ${dateRange === "7d" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => setDateRange("7d")}
        >
          Last 7 Days
        </button>
        <button
          className={`px-4 py-2 rounded ${dateRange === "30d" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => setDateRange("30d")}
        >
          Last 30 Days
        </button>
      </div>

      {/* Toggle Between Stocks & Crypto */}
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${selectedAssetType === "stocks" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => setSelectedAssetType("stocks")}
        >
          Stocks
        </button>
        <button
          className={`px-4 py-2 rounded ${selectedAssetType === "crypto" ? "bg-green-500 text-white" : "bg-gray-300"}`}
          onClick={() => setSelectedAssetType("crypto")}
        >
          Crypto
        </button>
      </div>

      {/* Table View with Pagination */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow-md rounded-lg">
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
            {currentRows.map((row, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">{row.Stock}</td>
                <td className="p-2">{row.Predicted_Time}</td>
                <td className="p-2">
                  ${row.Predicted_Close.toFixed(2)} / £{row.Predicted_Close_GBP.toFixed(2)}
                </td>
                <td className="p-2">{row.Actual_Time || "Pending"}</td>
                <td className="p-2">
                  {row.Actual_Close
                    ? `$${row.Actual_Close.toFixed(2)} / £${row.Actual_Close_GBP?.toFixed(2)}`
                    : "Pending"}
                </td>
                <td className="p-2">{row.Correct || "?"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Graph */}
      <h2 className="text-xl font-bold mt-6">{selectedAssetType === "stocks" ? "📊 Stocks" : "📊 Crypto"}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={formatGraphData(selectedAssetType === "stocks" ? stocks : crypto)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Date" />
          <YAxis />
          <Tooltip />
          <Legend />

          {selectedAssetType === "stocks"
            ? Array.from(new Set(stocks.map((d) => d.Stock))).map((stock) => (
                <Line key={stock} type="monotone" dataKey={`${stock} - Predicted`} stroke="blue" dot={{ r: 4 }} />
              ))
            : Array.from(new Set(crypto.map((d) => d.Stock))).map((cryptoStock) => (
                <Line key={cryptoStock} type="monotone" dataKey={`${cryptoStock} - Predicted`} stroke="green" dot={{ r: 4 }} />
              ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

