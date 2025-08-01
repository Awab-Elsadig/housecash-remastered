import { createRoot } from "react-dom/client";
import "./index.css";
import "./config/api.js"; // Configure axios
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
