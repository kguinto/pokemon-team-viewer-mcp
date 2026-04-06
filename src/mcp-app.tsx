import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// --- Types (mirrored from server.ts) ---

interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface PokemonSet {
  nickname?: string;
  species: string;
  item?: string;
  ability?: string;
  level?: number;
  shiny?: boolean;
  gender?: string;
  evs: Partial<StatBlock>;
  ivs: Partial<StatBlock>;
  nature?: string;
  moves: string[];
  types: string[];
  spriteUrl: string;
  itemSpriteUrl?: string;
}

interface TeamData {
  pokemon: PokemonSet[];
}

// --- Type colors ---

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  normal:   { bg: "#A8A878", text: "#fff" },
  fire:     { bg: "#F08030", text: "#fff" },
  water:    { bg: "#6890F0", text: "#fff" },
  grass:    { bg: "#78C850", text: "#fff" },
  electric: { bg: "#F8D030", text: "#333" },
  ice:      { bg: "#98D8D8", text: "#333" },
  fighting: { bg: "#C03028", text: "#fff" },
  poison:   { bg: "#A040A0", text: "#fff" },
  ground:   { bg: "#E0C068", text: "#333" },
  flying:   { bg: "#A890F0", text: "#fff" },
  psychic:  { bg: "#F85888", text: "#fff" },
  bug:      { bg: "#A8B820", text: "#fff" },
  rock:     { bg: "#B8A038", text: "#fff" },
  ghost:    { bg: "#705898", text: "#fff" },
  dragon:   { bg: "#7038F8", text: "#fff" },
  dark:     { bg: "#705848", text: "#fff" },
  steel:    { bg: "#B8B8D0", text: "#333" },
  fairy:    { bg: "#EE99AC", text: "#333" },
};

// --- Nature stat effects ---

const NATURE_EFFECTS: Record<string, { up?: keyof StatBlock; down?: keyof StatBlock }> = {
  Hardy: {}, Docile: {}, Serious: {}, Bashful: {}, Quirky: {},
  Lonely: { up: "atk", down: "def" },
  Brave: { up: "atk", down: "spe" },
  Adamant: { up: "atk", down: "spa" },
  Naughty: { up: "atk", down: "spd" },
  Bold: { up: "def", down: "atk" },
  Relaxed: { up: "def", down: "spe" },
  Impish: { up: "def", down: "spa" },
  Lax: { up: "def", down: "spd" },
  Timid: { up: "spe", down: "atk" },
  Hasty: { up: "spe", down: "def" },
  Jolly: { up: "spe", down: "spa" },
  Naive: { up: "spe", down: "spd" },
  Modest: { up: "spa", down: "atk" },
  Mild: { up: "spa", down: "def" },
  Quiet: { up: "spa", down: "spe" },
  Rash: { up: "spa", down: "spd" },
  Calm: { up: "spd", down: "atk" },
  Gentle: { up: "spd", down: "def" },
  Sassy: { up: "spd", down: "spe" },
  Careful: { up: "spd", down: "spa" },
};

const STAT_LABELS: [keyof StatBlock, string][] = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

// --- Components ---

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? { bg: "#888", text: "#fff" };
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 7px",
      borderRadius: 4,
      fontSize: "0.65rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      background: colors.bg,
      color: colors.text,
    }}>
      {type}
    </span>
  );
}

function EVDisplay({ evs, ivs, nature }: { evs: Partial<StatBlock>; ivs: Partial<StatBlock>; nature?: string }) {
  const effects = nature ? (NATURE_EFFECTS[nature] ?? {}) : {};
  const hasEVs = STAT_LABELS.some(([k]) => (evs[k] ?? 0) > 0);
  const hasIVs = STAT_LABELS.some(([k]) => (ivs[k] ?? 31) < 31);

  if (!hasEVs && !hasIVs) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
      {STAT_LABELS.map(([key, label]) => {
        const ev = evs[key] ?? 0;
        const iv = ivs[key] ?? 31;
        if (ev === 0 && iv === 31) return null;

        const isUp = effects.up === key;
        const isDown = effects.down === key;
        return (
          <span key={key} style={{
            fontSize: "0.65rem",
            padding: "1px 5px",
            borderRadius: 3,
            background: "var(--color-background-subtle)",
            color: isUp ? "#22c55e" : isDown ? "#ef4444" : "var(--color-text-secondary)",
            fontWeight: isUp || isDown ? 700 : 400,
          }}>
            {ev > 0 && <>{ev} {label}</>}
            {ev > 0 && iv < 31 && " / "}
            {iv < 31 && <>{iv} IV</>}
            {ev === 0 && iv < 31 && <> {label}</>}
          </span>
        );
      })}
    </div>
  );
}

function PokemonCard({ pokemon }: { pokemon: PokemonSet }) {
  const primaryType = pokemon.types[0];
  const typeColor = primaryType ? (TYPE_COLORS[primaryType]?.bg ?? "#888") : "#888";
  const displayName = pokemon.nickname ?? pokemon.species;
  const isNicknamed = !!pokemon.nickname;

  return (
    <div style={{
      background: "var(--color-background-card)",
      borderRadius: "var(--border-radius-lg)",
      border: "1px solid var(--color-border)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header with type gradient */}
      <div style={{
        background: `linear-gradient(135deg, ${typeColor}33, ${typeColor}11)`,
        borderBottom: `2px solid ${typeColor}55`,
        padding: "10px 12px 6px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}>
        {/* Sprite */}
        <div style={{ flexShrink: 0, width: 64, height: 64, position: "relative" }}>
          <img
            src={pokemon.spriteUrl}
            alt={pokemon.species}
            width={64}
            height={64}
            style={{ imageRendering: "pixelated", objectFit: "contain", width: 64, height: 64 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {pokemon.shiny && (
            <span style={{
              position: "absolute",
              top: 0, right: 0,
              fontSize: "0.65rem",
              background: "#f59e0b",
              color: "#fff",
              borderRadius: 3,
              padding: "0 3px",
              fontWeight: 700,
            }}>★</span>
          )}
        </div>

        {/* Name & types */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.2, wordBreak: "break-word" }}>
            {displayName}
            {pokemon.gender && (
              <span style={{ marginLeft: 4, color: pokemon.gender === "M" ? "#60a5fa" : "#f472b6", fontSize: "0.8rem" }}>
                {pokemon.gender === "M" ? "♂" : "♀"}
              </span>
            )}
          </div>
          {isNicknamed && (
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", lineHeight: 1.3 }}>
              {pokemon.species}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
            {pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
            {pokemon.level && pokemon.level !== 100 && (
              <span style={{
                fontSize: "0.65rem", padding: "1px 5px", borderRadius: 3,
                background: "var(--color-background-subtle)",
                color: "var(--color-text-secondary)", fontWeight: 600,
              }}>Lv.{pokemon.level}</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "8px 12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Item */}
        {pokemon.item && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {pokemon.itemSpriteUrl && (
              <img
                src={pokemon.itemSpriteUrl}
                alt={pokemon.item}
                width={16} height={16}
                style={{ imageRendering: "pixelated", flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              {pokemon.item}
            </span>
          </div>
        )}

        {/* Ability */}
        {pokemon.ability && (
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Ability:</span>{" "}
            {pokemon.ability}
          </div>
        )}

        {/* Nature */}
        {pokemon.nature && (
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Nature:</span>{" "}
            {pokemon.nature}
          </div>
        )}

        {/* EVs/IVs */}
        <EVDisplay evs={pokemon.evs} ivs={pokemon.ivs} nature={pokemon.nature} />

        {/* Moves */}
        {pokemon.moves.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
            {pokemon.moves.map((move, i) => (
              <div key={i} style={{
                fontSize: "0.75rem",
                padding: "2px 6px",
                borderRadius: 4,
                background: "var(--color-background-subtle)",
                color: "var(--color-text-primary)",
              }}>
                {move}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamGrid({ team }: { team: TeamData }) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 10,
      }}>
        {team.pokemon.map((p, i) => (
          <PokemonCard key={i} pokemon={p} />
        ))}
      </div>
    </div>
  );
}

function PokemonTeamApp() {
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
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>
        Connecting...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "#ef4444" }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (waiting && !teamData) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>
        Paste a Pokémon Showdown team export and ask Claude to display it.
      </div>
    );
  }

  if (!teamData) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>
        Loading team...
      </div>
    );
  }

  return <TeamGrid team={teamData} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PokemonTeamApp />
  </StrictMode>,
);
