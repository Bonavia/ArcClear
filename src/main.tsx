import { createRoot } from "react-dom/client";
import App from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("ArcClear root element is missing.");
createRoot(root).render(<App />);
