import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const StockChart = ({ predictions }) => {
  const chartRef = useRef(null);
  let chartInstance = useRef(null);

  useEffect(() => {
    if (!predictions.length) return;

    // Limit data to last 100 predictions for performance
    const limitedPredictions = predictions.slice(-100);

    if (limitedPredictions.length === 0) return;

    const ctx = chartRef.current.getContext("2d");

    // Destroy previous chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = limitedPredictions.map((p) => `${p.Date} ${p.Time}`);
    const predictedPrices = limitedPredictions.map((p) => p.Predicted_Close);
    const actualPrices = limitedPredictions.map((p) =>
      p.Actual_Close !== "Pending" ? p.Actual_Close : null
    );

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Predicted Price (USD)",
            data: predictedPrices,
            borderColor: "blue",
            borderWidth: 2,
            fill: false,
          },
          {
            label: "Actual Price (USD)",
            data: actualPrices,
            borderColor: "green",
            borderWidth: 2,
            fill: false,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
          line: { tension: 0.3 },
        },
        scales: {
          x: {
            title: { display: true, text: "Date & Time" },
            ticks: {
              maxTicksLimit: 10,
            },
          },
          y: {
            title: { display: true, text: "Price (USD)" },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [predictions]); // Ensures chart only updates when predictions change

  return (
    <div style={{ width: "100%", height: "400px" }}>
      {predictions.length === 0 ? (
        <p>No data available for the selected stock.</p>
      ) : (
        <canvas ref={chartRef} style={{ maxWidth: "100%", maxHeight: "400px" }}></canvas>
      )}
    </div>
  );
};

export default StockChart;
