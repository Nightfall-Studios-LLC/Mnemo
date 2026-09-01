import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { Sidebar, type Page } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { GameList } from "./components/GameList";
import { Inspector } from "./components/Inspector";
import { ConfirmDialog, PathDialog } from "./components/Dialogs";
import { Icon } from "./components/Icons";
import { ActivityPage, BackupsPage, ProvidersPage, SettingsPage } from "./pages/SimplePages";
import { demoGames, demoSnapshots } from "./lib/demoData";
import type { BackupProvider, BackupSnapshot, Game } from "./types";

export default function App() {
  const [page, setPage] = useState<Page>("Library"); const [games, setGames] = useState<Game[]>(demoGames); const [selectedId, setSelectedId] = useState(demoGames[0].id);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState(false); const [sort, setSort] = useState("last"); const [dialog, setDialog] = useState<"target" | "provider" | "restore" | null>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(demoSnapshots); const [restoreSnapshot, setRestoreSnapshot] = useState<BackupSnapshot>(); const [toast, setToast] = useState("");
  const [providers, setProviders] = useState<BackupProvider[]>([{ id: "local", providerType: "local", name: "Local Backups", destination: "Documents\\Mnemo", connected: true, enabled: true }, { id: "nas", providerType: "nas", name: "Home NAS", destination: "\\\\NAS\\Backups", connected: true, enabled: true }]);
  const hydrated = useRef(false);
  useEffect(() => {
    Promise.allSettled([
      invoke<{ providers?: BackupProvider[]; games?: Game[] }>("load_configuration"),
      invoke<Array<{ id: string; name: string; launcher: string; saveTargets: Game["saveTargets"] }>>("detect_games"),
    ]).then(([configResult, detectionResult]) => {
      if (configResult.status === "fulfilled") {
        if (configResult.value.providers?.length) setProviders(configResult.value.providers);
        if (configResult.value.games?.length) setGames(configResult.value.games);
      }
      if (detectionResult.status === "fulfilled" && detectionResult.value.length) setGames(current => current.map(game => {
        const detected = detectionResult.value.find(item => item.id === game.id);
        return detected ? { ...game, launcher: detected.launcher, saveTargets: detected.saveTargets } : game;
      }));
      hydrated.current = true;
    });
  }, []);
  useEffect(() => { if (hydrated.current) invoke("persist_configuration", { configuration: { providers, games } }).catch(() => undefined); }, [providers, games]);
  const selected = games.find(g => g.id === selectedId) || games[0];
  const visible = useMemo(() => games.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) && (!filter || g.saveTargets.some(t => t.status !== "healthy"))).sort((a,b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "targets" ? b.saveTargets.length - a.saveTargets.length : 0), [games, search, filter, sort]);
  const notify = (s: string) => { setToast(s); window.setTimeout(() => setToast(""), 2800); };
  const toggle = (targetId: string) => setGames(gs => gs.map(g => g.id !== selected.id ? g : ({...g, saveTargets: g.saveTargets.map(t => t.id === targetId ? {...t, enabled: !t.enabled} : t)})));
  const backup = async (all = false) => { const targets = (all ? games.flatMap(g => g.saveTargets.map(t => [g,t] as const)) : selected.saveTargets.map(t => [selected,t] as const)).filter(([,t]) => t.enabled); notify(`Backing up ${targets.length} save target${targets.length === 1 ? "" : "s"}…`); let completed = 0; for (const [g,t] of targets) { try { const p = providers.find(p => p.enabled)?.destination || ""; const snap = await invoke<BackupSnapshot>("create_backup", { gameId: g.id, target: t, destination: p }); setSnapshots(s => [snap, ...s]); completed++; } catch { /* demo paths may not exist */ } } notify(completed ? `${completed} backup${completed === 1 ? "" : "s"} completed` : "Demo mode: connect a valid source and provider to back up"); };
  const beginRestore = (s?: BackupSnapshot) => { setRestoreSnapshot(s || snapshots.find(x => x.gameId === selected.id)); setDialog("restore"); };
  return <main className="app-shell">
    <Sidebar page={page} onChange={setPage}/>
    <div className="workspace">
      {page === "Library" ? <><Toolbar search={search} onSearch={setSearch} filter={filter} onFilter={() => setFilter(v => !v)} sort={sort} onSort={setSort} onBackupAll={() => backup(true)}/><div className="library"><GameList games={visible} selected={selectedId} onSelect={setSelectedId}/>{selected && <Inspector game={selected} snapshots={snapshots} onToggle={toggle} onAdd={() => setDialog("target")} onBackup={() => backup()} onRestore={beginRestore} notify={notify}/>}</div></> : page === "Backups" ? <BackupsPage snapshots={snapshots} onRestore={beginRestore}/> : page === "Providers" ? <ProvidersPage providers={providers} onAdd={() => setDialog("provider")}/> : page === "Activity" ? <ActivityPage/> : <SettingsPage/>}
    </div>
    <footer><span>All systems operational <i/></span><span>Last check: Today, 7:45 PM <Icon name="refresh"/></span></footer>
    {dialog === "target" && <PathDialog title="Add save target" confirmLabel="Add target" onClose={() => setDialog(null)} onConfirm={(path,name) => { const id = crypto.randomUUID(); setGames(gs => gs.map(g => g.id !== selected.id ? g : ({...g, saveTargets: [...g.saveTargets, { id, gameId: g.id, name: name || "Custom Save", sourcePath: path, enabled: true, providerIds: ["local"], status: "warning" }]}))); setDialog(null); notify("Save target added"); }}/>} 
    {dialog === "provider" && <PathDialog title="Add local provider" confirmLabel="Add provider" onClose={() => setDialog(null)} onConfirm={(path,name) => { setProviders(ps => [...ps, { id: crypto.randomUUID(), providerType: path.startsWith("\\\\") ? "nas" : "local", name: name || "Local Folder", destination: path, connected: true, enabled: true }]); setDialog(null); notify("Provider added"); }}/>} 
    {dialog === "restore" && <ConfirmDialog title="Restore backup?" message="The selected snapshot will replace the current save. Mnemo will preserve the current files first." confirmLabel="Restore snapshot" danger onClose={() => setDialog(null)} onConfirm={async () => { setDialog(null); if (!restoreSnapshot) return notify("No snapshot is available to restore"); const game = games.find(g => g.id === restoreSnapshot.gameId); const target = game?.saveTargets.find(t => t.id === restoreSnapshot.saveTargetId); try { await invoke("restore_backup", { snapshot: restoreSnapshot, target, confirmed: true, backupCurrent: true }); notify("Backup restored successfully"); } catch { notify("Demo snapshot cannot be restored; choose a real local snapshot"); } }}/>} 
    {toast && <div className="toast">{toast}</div>}
  </main>;
}
