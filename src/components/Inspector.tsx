import { useState } from "react";
import type { BackupSnapshot, Game, SaveTarget } from "../types";
import { Icon, ProviderIcon, StatusIcon } from "./Icons";
import { GameArtwork } from "./GameArtwork";

type Tab = "Saves" | "Backups" | "Locations" | "Settings";

export function Inspector({ game, snapshots, onToggle, onAdd, onBackup, onRestore, notify }: { game: Game; snapshots: BackupSnapshot[]; onToggle: (id: string) => void; onAdd: () => void; onBackup: () => void; onRestore: (s?: BackupSnapshot) => void; notify: (message: string) => void }) {
  const [tab, setTab] = useState<Tab>("Saves");
  const protectedCount = game.saveTargets.filter(t => t.enabled && t.providerIds.length).length;
  return <aside className="inspector">
    <div className="inspector-head"><GameArtwork gameId={game.id} name={game.name} steamAppId={game.steamAppId} artwork={game.artwork}/><span><h2>{game.name}</h2><p><b>✓</b>{protectedCount} of {game.saveTargets.length} save targets protected</p></span></div>
    <div className="tabs">{(["Saves", "Backups", "Locations", "Settings"] as Tab[]).map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    <div className="tab-content">
      {tab === "Saves" && <Saves targets={game.saveTargets} onToggle={onToggle}/>} 
      {tab === "Backups" && <Backups snapshots={snapshots.filter(s => s.gameId === game.id)} targets={game.saveTargets} onRestore={onRestore}/>} 
      {tab === "Locations" && <Locations targets={game.saveTargets} notify={notify}/>} 
      {tab === "Settings" && <GameSettings notify={notify}/>} 
    </div>
    <div className="inspector-actions">
      {tab === "Saves" && <button className="add-target" onClick={onAdd}><Icon name="plus"/>Add Save Target</button>}
      <span className="action-spacer"/>
      <button onClick={onBackup}><Icon name="upload"/>Back Up Now</button>
      <button onClick={() => onRestore()}><Icon name="restore"/>Restore...</button>
    </div>
  </aside>;
}

function Saves({ targets, onToggle }: { targets: SaveTarget[]; onToggle: (id: string) => void }) {
  return <><div className="target-head"><span>Save Target</span><span>Destinations</span><span>Last Backup</span><span>Status</span><span/></div><div className="target-list">{targets.map(t => <div className="target-row" key={t.id}>
    <span className="target-name"><i>{t.icon || "◆"}</i><span>{t.name}<button className={`toggle ${t.enabled ? "on" : ""}`} onClick={() => onToggle(t.id)}><i/></button></span></span>
    <span className="providers">{t.providerIds.length ? t.providerIds.map(p => <ProviderIcon key={p} type={p}/>) : "—"}</span>
    <span className="meta">{t.lastBackup || "—"}</span><StatusIcon status={t.status}/><button className="more"><Icon name="more"/></button>
  </div>)}</div></>;
}

function Backups({ snapshots, targets, onRestore }: { snapshots: BackupSnapshot[]; targets: SaveTarget[]; onRestore: (s: BackupSnapshot) => void }) {
  return <div className="history-list">{snapshots.length ? snapshots.map(s => <div className="history-row" key={s.id}><span><strong>{targets.find(t => t.id === s.saveTargetId)?.name || s.saveTargetId}</strong><small>{s.timestamp}</small></span><ProviderIcon type={s.providerId}/><span className="meta">{formatSize(s.size)} · {s.fileCount} files</span><button className="mini" onClick={() => onRestore(s)}><Icon name="restore" size={16}/>Restore</button><button className="more"><Icon name="more"/></button></div>) : <div className="empty">No backups for this game yet.</div>}</div>;
}

function Locations({ targets, notify }: { targets: SaveTarget[]; notify: (s: string) => void }) {
  return <div className="locations"><div className="section-label">Detected save paths</div>{targets.map(t => <div className="path-row" key={t.id}><span><strong>{t.name}</strong><small>{t.sourcePath}</small></span><button onClick={() => notify(`Open folder: ${t.sourcePath}`)}><Icon name="folder"/></button><button onClick={() => notify(`Edit ${t.name}`)}><Icon name="edit"/></button></div>)}</div>;
}

function GameSettings({ notify }: { notify: (s: string) => void }) {
  const [values, setValues] = useState({ auto: true, change: true, startup: false, exit: true });
  return <div className="settings-list"><div className="section-label">Backup behavior</div>{[["auto", "Automatic backups"], ["change", "Back up on file change"], ["startup", "Back up on startup"], ["exit", "Back up on exit"]].map(([key, label]) => <label className="setting-row" key={key}><span>{label}</span><input type="checkbox" checked={values[key as keyof typeof values]} onChange={e => { setValues(v => ({...v, [key]: e.target.checked})); notify("Game settings saved"); }}/></label>)}<label className="setting-row"><span>Retention count</span><input className="count" type="number" defaultValue="10" min="1"/></label><button className="exclusions" onClick={() => notify("Exclusion editor opened")}>Edit exclusions…</button></div>;
}

const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
