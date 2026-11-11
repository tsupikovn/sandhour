import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { QuickAddModal } from "@/components/inbox/QuickAddModal";
import "./styles/globals.css";

// The same bundle serves both windows; render by window label.
const isQuickAdd = getCurrentWindow().label === "inbox-quick";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isQuickAdd ? <QuickAddModal /> : <App />}</React.StrictMode>,
);
