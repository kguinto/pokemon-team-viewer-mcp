import { NATURE_EFFECTS, STAT_LABELS } from "../constants.js";
import type { StatBlock } from "../../types.js";

interface Props {
  evs: Partial<StatBlock>;
  ivs: Partial<StatBlock>;
  nature?: string;
}

export function EVDisplay({ evs, ivs, nature }: Props) {
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
