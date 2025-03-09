import React from "react";

const PredictionTable = ({ predictions }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Stock</th>
          <th>Predicted Price (USD)</th>
          <th>Actual Price (USD)</th>
          <th>Predicted Price (GBP)</th>
          <th>Actual Price (GBP)</th>
          <th>Correct?</th>
        </tr>
      </thead>
      <tbody>
        {predictions.map((item, index) => (
          <tr key={index}>
            <td>{item.Date}</td>
            <td>{item.Time}</td>
            <td>{item.Stock}</td>
            <td>${item.Predicted_Close}</td>
            <td>{item.Actual_Close !== "Pending" ? `$${item.Actual_Close}` : "Pending"}</td>
            <td>£{item.Predicted_Close_GBP}</td>
            <td>{item.Actual_Close_GBP !== "Pending" ? `£${item.Actual_Close_GBP}` : "Pending"}</td>
            <td>{item.Correct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PredictionTable;
