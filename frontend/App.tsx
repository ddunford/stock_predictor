import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function App() {
  const [data, setData] = useState([]);
  const [selectedStock, setSelectedStock] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/predictions")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  const filteredData = selectedStock ? data.filter((d) => d.Stock === selectedStock) : data;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Stock Prediction Results</h1>

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
            <th className="p-2">Date</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Predicted Price</th>
            <th className="p-2">Actual Price</th>
            <th className="p-2">Correct?</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">{row.Date} {row.Time}</td>
              <td className="p-2">{row.Stock}</td>
              <td className="p-2">${row.Predicted_Close}</td>
              <td className="p-2">${row.Actual_Close || "Pending"}</td>
              <td className="p-2">{row.Correct || "?"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Chart View */}
      <h2 className="text-xl font-bold mt-6">Predicted vs. Actual Prices</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={filteredData}>
          <XAxis dataKey="Date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Predicted_Close" stroke="blue" name="Predicted Price" />
          <Line type="monotone" dataKey="Actual_Close" stroke="red" name="Actual Price" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

