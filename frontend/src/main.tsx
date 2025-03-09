import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Chart, registerables } from "chart.js";
import "./index.css";

Chart.register(...registerables);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

