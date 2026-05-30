import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SettingsHubOverlay, SettingsHubProvider } from "./settings";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsHubProvider>
        <App />
        <SettingsHubOverlay />
      </SettingsHubProvider>
    </BrowserRouter>
  </StrictMode>,
);
