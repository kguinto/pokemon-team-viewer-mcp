export interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface PokemonSet {
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
  itemSpriteNum?: number;
}

export interface TeamData {
  pokemon: PokemonSet[];
}
