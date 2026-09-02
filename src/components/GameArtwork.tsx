import { useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ArtworkMetadata } from "../types";
import { artworkService } from "../lib/artworkService";

export function GameArtwork({ gameId, name, steamAppId, artwork, className = "" }: { gameId: string; name: string; steamAppId?: number; artwork?: ArtworkMetadata; className?: string }) {
  const [source, setSource] = useState(() => artwork?.localPath ? convertFileSrc(artwork.localPath) : "");
  const [loaded, setLoaded] = useState(false);
  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase(), [name]);

  useEffect(() => {
    let active = true;
    artworkService.getGameArtwork({ gameId, gameName: name, steamAppId, existingLocalPath: artwork?.source === "local" ? artwork.localPath : undefined })
      .then(result => { if (active && result.localPath) setSource(convertFileSrc(result.localPath)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [gameId, name, steamAppId, artwork?.localPath, artwork?.source]);

  return <span className={`game-artwork ${className}`} aria-label={`${name} artwork`}>
    <span className="artwork-placeholder"><b>{initials}</b><i/></span>
    {source && <img className={loaded ? "loaded" : ""} src={source} alt="" onLoad={() => setLoaded(true)} onError={() => setSource("")}/>} 
  </span>;
}
