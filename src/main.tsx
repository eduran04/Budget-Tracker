import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { markStartup } from "@/lib/startup-marks";
import App from "./App";

markStartup("jsLoaded");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
