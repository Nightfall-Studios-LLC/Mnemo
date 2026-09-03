import { useState } from "react";
import { Button, Checkbox, Switch } from "@heroui/react";
import type { BackupSnapshot, Game, SaveTarget } from "../types";
import { Icon, ProviderIcon, StatusIcon } from "./Icons";
import { GameArtwork } from "./GameArtwork";
import { getGameArtwork } from "../lib/gameArtwork";

type Tab = "Saves" | "Backups" | "Locations" | "Settings";

export function Inspector({ game, snapshots, onToggle, onAdd, onBackup, onRestore, notify }: { game: Game; snapshots: BackupSnapshot[]; onToggle: (id: string) => void; onAdd: () => void; onBackup: () => void; onRestore: (s?: BackupSnapshot) => void; notify: (message: string) => void }) {
  const [tab, setTab] = useState<Tab>("Saves");
  const protectedCount = game.saveTargets.filter(target => target.enabled && target.providerIds.length).length;
  const artwork = getGameArtwork(game.id);
  return <aside className="inspector">
    <div className="inspector-head" style={artwork ? { "--hero-image": `url(${artwork.hero})` } as React.CSSProperties : undefined}>
      {artwork && <div className="inspector-hero" aria-hidden="true"/>}
      <div className="inspector-identity"><GameArtwork gameId={game.id} name={game.name} className="large"/><span><h2>{game.name}</h2><p>{game.launcher}</p></span></div>
      <div className="inspector-facts"><span><b>{protectedCount} of {game.saveTargets.length}</b><small>saves protected</small></span><span><b>{game.lastBackup || "Never"}</b><small>last backup</small></span></div>
      <div className="header-actions"><Button className="mnemo-button secondary" variant="outline" onPress={() => onRestore()}><Icon name="restore"/>Restore</Button><Button className="mnemo-button primary" onPress={onBackup}><Icon name="upload"/>Back Up Now</Button></div>
    </div>
    <div className="tabs" role="tablist" aria-label="Game details">{(["Saves", "Backups", "Locations", "Settings"] as Tab[]).map(item => <button role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
    <div className="tab-content" role="tabpanel">
      {tab === "Saves" && <Saves targets={game.saveTargets} onToggle={onToggle}/>} 
      {tab === "Backups" && <Backups snapshots={snapshots.filter(snapshot => snapshot.gameId === game.id)} targets={game.saveTargets} onRestore={onRestore}/>}
      {tab === "Locations" && <Locations targets={game.saveTargets}/>}
      {tab === "Settings" && <GameSettings notify={notify}/>} 
      {tab === "Saves" && <Button className="add-target" variant="ghost" onPress={onAdd}><Icon name="plus"/>Add save location</Button>}
    </div>
  </aside>;
}

function Saves({ targets, onToggle }: { targets: SaveTarget[]; onToggle: (id: string) => void }) {
  return <div className="target-list">{targets.map(target => <div className="target-row" key={target.id}>
    <div className="target-title"><span className="target-icon">{target.icon || "◆"}</span><strong>{target.name}</strong></div>
    <div className="target-automation"><span><b>Automatic backup</b><small>{target.enabled ? "Runs when changes are detected" : "Backups must be started manually"}</small></span><Switch isSelected={target.enabled} onChange={() => onToggle(target.id)} aria-label={`Automatic backup for ${target.name}`} className="mnemo-switch"><Switch.Content><Switch.Control><Switch.Thumb/></Switch.Control></Switch.Content></Switch></div>
    <div className="target-meta"><span className="destination-summary">{target.providerIds.length ? <><span className="providers">{target.providerIds.map(provider => <ProviderIcon key={provider} type={provider}/>)}</span>{target.providerIds.map(providerName).join(" · ")}</> : "No active destinations"}</span><span>{target.lastBackup ? `Last backup ${target.lastBackup}` : "Never backed up"}</span><span className={`status-label ${target.status}`}><StatusIcon status={target.status}/>{statusText(target.status)}</span></div>
  </div>)}</div>;
}

function Backups({ snapshots, targets, onRestore }: { snapshots: BackupSnapshot[]; targets: SaveTarget[]; onRestore: (snapshot: BackupSnapshot) => void }) {
  return <div className="history-list">{snapshots.length ? snapshots.map(snapshot => <div className="history-row" key={snapshot.id}><span><strong>{targets.find(target => target.id === snapshot.saveTargetId)?.name || snapshot.saveTargetId}</strong><small>{snapshot.timestamp}</small></span><ProviderIcon type={snapshot.providerId}/><span className="meta">{formatSize(snapshot.size)} · {snapshot.fileCount} files</span><Button size="sm" variant="outline" className="mini" onPress={() => onRestore(snapshot)}><Icon name="restore" size={16}/>Restore</Button></div>) : <div className="empty">No backups for this game yet.</div>}</div>;
}

function Locations({ targets }: { targets: SaveTarget[] }) {
  return <div className="locations"><div className="section-label">Detected save folders</div>{targets.map(target => <div className="path-row" key={target.id}><span><strong>{target.name}</strong><small>{target.sourcePath}</small></span></div>)}</div>;
}

function GameSettings({ notify }: { notify: (message: string) => void }) {
  const [values, setValues] = useState({ auto: true, change: true, startup: false, exit: true });
  return <div className="settings-list"><div className="section-label">Backup behavior</div>{[["auto", "Automatic backups"], ["change", "Back up when files change"], ["startup", "Back up when Mnemo opens"], ["exit", "Back up before Mnemo closes"]].map(([key, label]) => <Checkbox key={key} isSelected={values[key as keyof typeof values]} isDisabled={key !== "auto" && !values.auto} onChange={selected => { setValues(current => ({ ...current, [key]: selected })); notify("Game settings saved"); }} variant="secondary" className="setting-row"><Checkbox.Content><Checkbox.Control><Checkbox.Indicator/></Checkbox.Control><span>{label}</span></Checkbox.Content></Checkbox>)}</div>;
}

const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
const providerName = (provider: string) => ({ drive: "Google Drive", local: "Local", nas: "NAS", mega: "MEGA" }[provider] || provider);
const statusText = (status: string) => status === "healthy" ? "Protected" : status === "warning" ? "Needs attention" : "Error";
