import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PreferencesProvider>     
      <App />
    </PreferencesProvider>
  </StrictMode>,
);
