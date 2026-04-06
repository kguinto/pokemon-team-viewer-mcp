import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const { app, error } = useApp({
    appInfo: { name: "Pokemon Team Viewer", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.onteardown = async () => ({});
      app.onerror = console.error;
    },
  });

  if (error) return <div><strong>Error:</strong> {error.message}</div>;
  if (!app) return <div>Connecting...</div>;

  return <div>Pokemon Team Viewer</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
