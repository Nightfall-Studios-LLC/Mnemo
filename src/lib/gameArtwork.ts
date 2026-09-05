import minecraftHero from "../assets/gameart/minecrafthero.webp";
import minecraftIcon from "../assets/gameart/minecraftlogo.webp";

const artwork: Record<string, { icon: string; hero: string }> = {
  "minecraft-java": { icon: minecraftIcon, hero: minecraftHero },
};

export const getGameArtwork = (gameId: string) => artwork[gameId];
