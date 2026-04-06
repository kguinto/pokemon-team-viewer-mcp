import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useEffect, useState } from "react";
import type { TeamData } from "../types.js";
import { TeamGrid } from "./components/TeamGrid.js";

export function App() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);

  const { app, error: appError } = useApp({
    appInfo: { name: "Pokemon Team Viewer", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolinput = async () => {
        setWaiting(true);
        setTeamData(null);
        setError(null);
      };

      app.ontoolresult = async (result: CallToolResult) => {
        setWaiting(false);
        const meta = (result as unknown as { _meta?: { teamData?: TeamData } })._meta;
        if (meta?.teamData) {
          setTeamData(meta.teamData);
        } else if (result.isError) {
          const msg = result.content?.find((c) => c.type === "text");
          setError(msg && "text" in msg ? msg.text : "Unknown error");
        }
      };

      app.onerror = (err) => {
        setError(err instanceof Error ? err.message : String(err));
        setWaiting(false);
      };
    },
  });

  useEffect(() => {
    if (appError) setError(appError.message);
  }, [appError]);

  if (!app) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>Connecting...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "#ef4444" }}><strong>Error:</strong> {error}</div>;
  }

  if (waiting && !teamData) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>Paste a Pokémon Showdown team export and ask Claude to display it.</div>;
  }

  if (!teamData) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading team...</div>;
  }

  return <TeamGrid team={teamData} />;
}
