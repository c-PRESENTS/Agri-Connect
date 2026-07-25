import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    });
  } else {
    // A production service worker left behind on localhost can intercept Vite
    // navigations and HMR after a repository update. Development should always
    // use the network directly.
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => {
        console.warn("Could not remove development service worker", error);
      });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
