import type { PokemonSet } from "../../types.js";
import { TYPE_COLORS } from "../constants.js";
import { EVDisplay } from "./EVDisplay.js";
import { TypeBadge } from "./TypeBadge.js";

interface Props {
  pokemon: PokemonSet;
}

export function PokemonCard({ pokemon }: Props) {
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
      {/* Header */}
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
              position: "absolute", top: 0, right: 0,
              fontSize: "0.65rem", background: "#f59e0b", color: "#fff",
              borderRadius: 3, padding: "0 3px", fontWeight: 700,
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
        {pokemon.item && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {pokemon.itemSpriteNum !== undefined && (
              <div style={{
                width: 24, height: 24, flexShrink: 0,
                imageRendering: "pixelated",
                background: `transparent url(https://play.pokemonshowdown.com/sprites/itemicons-sheet.png?v1) no-repeat -${(pokemon.itemSpriteNum % 16) * 24}px -${Math.floor(pokemon.itemSpriteNum / 16) * 24}px`,
              }} title={pokemon.item} />
            )}
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              {pokemon.item}
            </span>
          </div>
        )}

        {pokemon.ability && (
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Ability:</span>{" "}
            {pokemon.ability}
          </div>
        )}

        {pokemon.nature && (
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Nature:</span>{" "}
            {pokemon.nature}
          </div>
        )}

        <EVDisplay evs={pokemon.evs} ivs={pokemon.ivs} nature={pokemon.nature} />

        {pokemon.moves.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
            {pokemon.moves.map((move, i) => (
              <div key={i} style={{
                fontSize: "0.75rem", padding: "2px 6px", borderRadius: 4,
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
