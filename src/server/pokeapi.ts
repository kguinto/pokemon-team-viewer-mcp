export function speciesIdForPokeAPI(species: string): string {
  return species
    .toLowerCase()
    .replace(/\./g, "")        // Mr. Mime -> mr mime
    .replace(/'/g, "")         // Farfetch'd -> farfetchd
    .replace(/é/g, "e")        // Flabébé -> flabebe
    .replace(/[^a-z0-9\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");     // spaces to hyphens
}

async function pokeAPIGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function fetchTypes(speciesId: string): Promise<string[]> {
  // Build candidate list: exact name, then strip trailing hyphen segments one at a time.
  // Handles Showdown/PokéAPI name mismatches like "ogerpon-wellspring" vs "ogerpon-wellspring-mask".
  const parts = speciesId.split("-");
  const candidates = [
    speciesId,
    ...Array.from({ length: parts.length - 1 }, (_, i) => parts.slice(0, parts.length - 1 - i).join("-")),
  ];

  for (const id of candidates) {
    // Try direct /pokemon endpoint.
    const pokemon = await pokeAPIGet<{ types: { type: { name: string } }[] }>(`pokemon/${id}`);
    if (pokemon) return pokemon.types.map((t) => t.type.name);

    // Many Pokémon (Landorus, Deoxys, Giratina, etc.) have no bare /pokemon/{id} entry and require
    // a form suffix. Fall back to /pokemon-species to discover the default variety name.
    const species = await pokeAPIGet<{ varieties: { is_default: boolean; pokemon: { name: string } }[] }>(`pokemon-species/${id}`);
    if (species) {
      const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon.name;
      if (defaultVariety && defaultVariety !== id) {
        const form = await pokeAPIGet<{ types: { type: { name: string } }[] }>(`pokemon/${defaultVariety}`);
        if (form) return form.types.map((t) => t.type.name);
      }
    }
  }
  return [];
}
