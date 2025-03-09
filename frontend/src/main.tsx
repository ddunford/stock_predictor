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
  const [selectedStock, setSelectedStock] = useState<string>("All");
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

  // Split into stocks and crypto
  const stocks = filteredData.filter((d) => !d.Stock.includes("USD"));
  const crypto = filteredData.filter((d) => d.Stock.includes("USD"));

  // Full stock/crypto list
  const stockList = ["All", ...new Set([...stocks.map((s) => s.Stock), ...crypto.map((c) => c.Stock)])];

  // Auto-switch asset type based on stock selection
  const handleStockSelect = (value: string) => {
    setSelectedStock(value);
    if (crypto.map((c) => c.Stock).includes(value)) {
      setSelectedAssetType("crypto");
    } else {
      setSelectedAssetType("stocks");
    }
  };

  // Reset stock selection when switching Stocks/Crypto
  const handleAssetSwitch = (type: "stocks" | "crypto") => {
    setSelectedAssetType(type);
    setSelectedStock("All");
  };

  // Filter selected stock
  const selectedData = selectedStock === "All" ? (selectedAssetType === "stocks" ? stocks : crypto) : filteredData.filter((s) => s.Stock === selectedStock);

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = selectedData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(selectedData.length / rowsPerPage);

  // Get unique stock names for plotting multiple lines
  const uniqueStocks = [...new Set(selectedData.map((s) => s.Stock))];

  // Format graph data to correctly show predicted vs actual for each stock
  const formatGraphData = (dataset: Prediction[]) => {
    const groupedData: { [key: string]: any } = {};
    dataset.forEach((entry) => {
      const key = `${entry.Date} ${entry.Time}`;
      if (!groupedData[key]) {
        groupedData[key] = { Date: key };
      }
      groupedData[key][`${entry.Stock} - Predicted`] = entry.Predicted_Close;
      groupedData[key][`${entry.Stock} - Actual`] = entry.Actual_Close;
    });
    return Object.values(groupedData);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold text-center mb-6">📈 Stock Prediction Results</h1>

      {/* Filters UI */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
        {/* Date Range Filters */}
        <div className="flex space-x-2">
          {["1d", "7d", "30d"].map((range) => (
            <button key={range} className={`px-4 py-2 rounded ${dateRange === range ? "bg-blue-500 text-white" : "bg-gray-300 hover:bg-gray-400"}`} onClick={() => setDateRange(range as "1d" | "7d" | "30d")}>
              {range === "1d" ? "Last 24 Hours" : range === "7d" ? "Last 7 Days" : "Last 30 Days"}
            </button>
          ))}
        </div>

        {/* Asset Type Selector */}
        <div className="flex space-x-2">
          <button className={`px-4 py-2 rounded ${selectedAssetType === "stocks" ? "bg-blue-500 text-white" : "bg-gray-300 hover:bg-gray-400"}`} onClick={() => handleAssetSwitch("stocks")}>Stocks</button>
          <button className={`px-4 py-2 rounded ${selectedAssetType === "crypto" ? "bg-green-500 text-white" : "bg-gray-300 hover:bg-gray-400"}`} onClick={() => handleAssetSwitch("crypto")}>Crypto</button>
        </div>

        {/* Stock Selector */}
        <select className="px-4 py-2 border rounded bg-white" onChange={(e) => handleStockSelect(e.target.value)} value={selectedStock}>
          {stockList.map((stock) => (
            <option key={stock} value={stock}>{stock}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
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
                <td className="p-2">${row.Predicted_Close.toFixed(2)} / £{row.Predicted_Close_GBP.toFixed(2)}</td>
                <td className="p-2">{row.Actual_Time || "Pending"}</td>
                <td className="p-2">{row.Actual_Close ? `$${row.Actual_Close.toFixed(2)} / £${row.Actual_Close_GBP?.toFixed(2)}` : "Pending"}</td>
                <td className="p-2">{row.Correct || "?"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Graph */}
      <h2 className="text-xl font-bold mt-6 text-center">📊 {selectedStock === "All" ? "All Predictions" : selectedStock}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={formatGraphData(selectedData)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {uniqueStocks.map((stock) => (
            <>
              <Line key={`${stock}-predicted`} type="monotone" dataKey={`${stock} - Predicted`} stroke="blue" />
              <Line key={`${stock}-actual`} type="monotone" dataKey={`${stock} - Actual`} stroke="red" />
            </>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);

