import { useMemo } from "react";
import { Icon } from "./Icons";
import { getGameArtwork } from "../lib/gameArtwork";

export function GameArtwork({ gameId, name, className = "" }: { gameId: string; name: string; className?: string }) {
  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase(), [name]);
  const hue = useMemo(() => [...gameId].reduce((value, char) => (value * 31 + char.charCodeAt(0)) % 360, 178), [gameId]);
  const artwork = getGameArtwork(gameId);

  return <span className={`game-artwork ${className}`} style={{ "--art-hue": hue } as React.CSSProperties} aria-label={`${name} artwork placeholder`}>
    {artwork ? <img src={artwork.icon} alt=""/> : <><Icon name="game" size={18}/><b>{initials || "?"}</b></>}
  </span>;
}
