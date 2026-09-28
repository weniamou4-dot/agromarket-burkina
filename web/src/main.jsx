import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import "./styles/components/splash.css";
import "./styles/index.css";

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "❌ Impossible de démarrer AgroMarket : l'élément #root est introuvable."
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);