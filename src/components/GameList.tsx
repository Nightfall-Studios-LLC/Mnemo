import type { Game } from "../types";
import { Icon, ProviderIcon, StatusIcon } from "./Icons";

export function GameList({ games, selected, onSelect }: { games: Game[]; selected: string; onSelect: (id: string) => void }) {
  return <section className="game-panel">
    <div className="game-head"><span>Game <Icon name="sort" size={13}/></span><span>Save Targets</span><span>Last Backup</span><span>Destinations</span><span>Status</span><span/></div>
    <div className="game-rows">{games.map(game => {
      const providers = [...new Set(game.saveTargets.flatMap(t => t.providerIds))];
      const enabled = game.saveTargets.filter(t => t.enabled).length;
      return <button key={game.id} className={`game-row ${selected === game.id ? "selected" : ""}`} onClick={() => onSelect(game.id)}>
        <span className="game-cell"><img src={game.artwork}/><span><strong>{game.name}</strong><small>{game.launcher}</small></span></span>
        <span className="meta">{enabled === game.saveTargets.length ? `${game.saveTargets.length} targets` : `${enabled} / ${game.saveTargets.length} protected`}</span>
        <span className="meta">{game.lastBackup || "—"}</span>
        <span className="providers">{providers.map(p => <ProviderIcon key={p} type={p}/>)}</span>
        <span><StatusIcon status={game.status}/></span><Icon name="chevron" size={18}/>
      </button>;
    })}{!games.length && <div className="empty">No games match your search.</div>}</div>
  </section>;
}
