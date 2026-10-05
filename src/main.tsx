import React from "react"
import ReactDOM from "react-dom/client"
import App from "./AppEntry"
import "./index.css"

// Keep the preview on the latest modular source graph (revision 2).
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
