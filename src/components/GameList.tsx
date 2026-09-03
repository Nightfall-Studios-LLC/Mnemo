import type { Game } from "../types";
import { Icon, ProviderIcon, StatusIcon } from "./Icons";
import { GameArtwork } from "./GameArtwork";
import { Button } from "@heroui/react";

export function GameList({ games, selected, onSelect }: { games: Game[]; selected: string; onSelect: (id: string) => void }) {
  return <section className="game-panel">
    <div className="game-head"><span>Games</span><span>{games.length} in library</span></div>
    <div className="game-rows">{games.map(game => {
      const providers = [...new Set(game.saveTargets.flatMap(t => t.providerIds))];
      const enabled = game.saveTargets.filter(t => t.enabled).length;
      const allProtected = enabled === game.saveTargets.length && game.saveTargets.length > 0;
      return <Button variant="ghost" key={game.id} className={`game-row ${selected === game.id ? "selected" : ""}`} onPress={() => onSelect(game.id)} aria-pressed={selected === game.id}>
        <GameArtwork gameId={game.id} name={game.name}/>
        <span className="game-copy"><strong>{game.name}</strong><small>{game.launcher}</small></span>
        <span className="game-summary"><span>{allProtected ? `${enabled} saves protected` : `${enabled} of ${game.saveTargets.length} protected`}</span><small>{game.lastBackup ? `Last backup ${game.lastBackup}` : "Never backed up"}</small></span>
        <span className="game-state"><span className="providers">{providers.map(p => <ProviderIcon key={p} type={p}/>)}</span><StatusIcon status={game.status}/><Icon name="chevron" size={16}/></span>
      </Button>;
    })}{!games.length && <div className="empty">No games match your search.</div>}</div>
  </section>;
}
