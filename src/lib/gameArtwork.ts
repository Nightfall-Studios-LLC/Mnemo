import eldenRingHero from "../assets/gameart/elden-ring-hero.webp";
import eldenRingIcon from "../assets/gameart/elden-ring-icon.webp";
import satisfactoryHero from "../assets/gameart/satisfactory-hero.webp";
import satisfactoryIcon from "../assets/gameart/satisfactory-icon.webp";

const artwork: Record<string, { icon: string; hero: string }> = {
  "elden-ring": { icon: eldenRingIcon, hero: eldenRingHero },
  satisfactory: { icon: satisfactoryIcon, hero: satisfactoryHero },
};

export const getGameArtwork = (gameId: string) => artwork[gameId];
