import type { TeamData } from "../../types.js";
import { PokemonCard } from "./PokemonCard.js";

interface Props {
  team: TeamData;
}

export function TeamGrid({ team }: Props) {
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
