import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Switch } from "@heroui/react";
import type { BackupProvider, BackupSnapshot, Game, Status } from "../types";
import { GameArtwork } from "../components/GameArtwork";
import { Icon, ProviderIcon, StatusIcon } from "../components/Icons";

type Notify = (message: string) => void;
type HistoryGroup = "Today" | "Yesterday" | "Earlier";
const historyOrder: HistoryGroup[] = ["Today", "Yesterday", "Earlier"];

export function BackupsPage({ snapshots, games, onRestore }: { snapshots: BackupSnapshot[]; games: Game[]; onRestore: (snapshot: BackupSnapshot) => void }) {
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [destination, setDestination] = useState("all");
  const [sort, setSort] = useState("newest");
  const providers = [...new Set(snapshots.map(snapshot => snapshot.providerId))];
  const visible = useMemo(() => snapshots.filter(snapshot => {
    const game = games.find(item => item.id === snapshot.gameId);
    const save = game?.saveTargets.find(item => item.id === snapshot.saveTargetId);
    const text = `${game?.name || snapshot.gameId} ${save?.name || snapshot.saveTargetId}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (gameFilter === "all" || snapshot.gameId === gameFilter) && (destination === "all" || snapshot.providerId === destination);
  }).sort((a, b) => sort === "size" ? b.size - a.size : snapshots.indexOf(a) - snapshots.indexOf(b)), [snapshots, games, search, gameFilter, destination, sort]);
  const groups = useMemo(() => groupByHistory(visible), [visible]);
  const protectedGames = new Set(visible.map(snapshot => snapshot.gameId)).size;
  const totalSize = visible.reduce((sum, snapshot) => sum + snapshot.size, 0);

  return <Page title="Backups" subtitle="Browse and restore saved copies across your library">
    <div className="page-toolbar backup-toolbar">
      <label className="page-search"><Icon name="search"/><span className="sr-only">Search backups</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search backups"/></label>
      <CompactSelect label="Game" value={gameFilter} onChange={setGameFilter}><option value="all">All games</option>{games.map(game => <option value={game.id} key={game.id}>{game.name}</option>)}</CompactSelect>
      <CompactSelect label="Storage" value={destination} onChange={setDestination}><option value="all">All storage</option>{providers.map(provider => <option value={provider} key={provider}>{providerName(provider)}</option>)}</CompactSelect>
      <CompactSelect label="Sort" value={sort} onChange={setSort}><option value="newest">Newest</option><option value="size">Largest</option></CompactSelect>
    </div>
    {visible.length ? <>
      <div className="backup-summary" aria-label="Backup summary">
        <span><b>{visible.length}</b><small>{visible.length === 1 ? "backup" : "backups"}</small></span>
        <span><b>{formatSize(totalSize)}</b><small>stored</small></span>
        <span><b>{protectedGames}</b><small>{protectedGames === 1 ? "protected game" : "protected games"}</small></span>
      </div>
      <section className="backup-feed">{historyOrder.map(group => groups[group]?.length ? <div className="history-group" key={group}><SectionLabel>{group}</SectionLabel>{groups[group].map(snapshot => {
        const game = games.find(item => item.id === snapshot.gameId);
        const save = game?.saveTargets.find(item => item.id === snapshot.saveTargetId);
        return <article className="backup-entry" key={snapshot.id}>
          <GameArtwork gameId={snapshot.gameId} name={game?.name || snapshot.gameId}/>
          <div className="entry-title"><strong>{game?.name || snapshot.gameId}</strong><small>{save?.name || snapshot.saveTargetId}</small></div>
          <div className="entry-detail"><span>{snapshot.timestamp}</span><small>{formatSize(snapshot.size)} · {snapshot.fileCount} files</small></div>
          <div className="entry-storage"><ProviderIcon type={snapshot.providerId}/><span>{providerName(snapshot.providerId)}</span></div>
          <span className="entry-status"><StatusIcon status="healthy"/>Verified</span>
          <Button size="sm" variant="outline" onPress={() => onRestore(snapshot)}><Icon name="restore" size={16}/>Restore</Button>
        </article>;
      })}</div> : null)}</section>
    </> : <EmptyState icon="backups" title="No matching backups" description="Adjust the search or filters to see saved copies."/>}
  </Page>;
}

export function ProvidersPage({ providers, snapshots, onAdd, notify }: { providers: BackupProvider[]; snapshots: BackupSnapshot[]; onAdd: () => void; notify: Notify }) {
  const verify = async (provider: BackupProvider) => {
    notify(`Checking ${provider.name}…`);
    try { const healthy = await invoke<boolean>("test_provider", { provider }); notify(healthy ? `${provider.name} is healthy` : `${provider.name} could not be verified`); }
    catch { notify(`${provider.name} could not be verified`); }
  };
  return <Page title="Storage" subtitle="Manage the places where Mnemo keeps your backups" action={<Button variant="outline" onPress={onAdd}><Icon name="plus"/>Add local folder</Button>}>
    <section className="storage-grid">{providers.map(provider => <article className="storage-card" key={provider.id}>
      <div className="storage-head"><ProviderIcon type={provider.providerType}/><span><strong>{provider.name}</strong><small>{storageType(provider.providerType)}</small></span><span className={`health-pill ${provider.connected ? "healthy" : "warning"}`}><i/>{provider.connected ? "Healthy" : "Needs attention"}</span></div>
      <p className="storage-path">{provider.destination}</p>
      <div className="storage-facts"><span><b>{snapshots.filter(snapshot => snapshot.providerId === provider.id || snapshot.providerId === provider.providerType).length}</b><small>backups</small></span><span><b>{provider.connected ? "Connected" : "Unavailable"}</b><small>connection</small></span></div>
      <div className="storage-actions"><Button size="sm" variant="outline" onPress={() => verify(provider)}><Icon name="refresh" size={15}/>Verify</Button></div>
    </article>)}
      <StorageSoon name="Google Drive" type="drive"/><StorageSoon name="MEGA" type="mega"/>
    </section>
  </Page>;
}

type ActivityEvent = { id: string; status: Status | "neutral"; title: string; subject: string; timestamp: string; art?: string };

export function ActivityPage({ snapshots, games }: { snapshots: BackupSnapshot[]; games: Game[] }) {
  const events: ActivityEvent[] = [
    ...snapshots.map(snapshot => ({ id: snapshot.id, status: "healthy" as const, title: "Backup completed", subject: games.find(game => game.id === snapshot.gameId)?.name || snapshot.gameId, timestamp: snapshot.timestamp, art: snapshot.gameId })),
  ];
  const groups = groupByHistory(events, event => event.timestamp);
  return <Page title="Activity" subtitle="A clear history of backups, restores, and storage checks">
    {events.length ? <section className="activity-feed">{historyOrder.map(group => groups[group]?.length ? <div className="activity-group" key={group}><SectionLabel>{group}</SectionLabel><div className="activity-timeline">{groups[group].map(event => <article className={`activity-entry ${event.status}`} key={event.id}>
      {event.art ? <GameArtwork gameId={event.art} name={event.subject}/> : <span className="activity-icon"><Icon name="activity"/></span>}
      <span className="timeline-status"><StatusIcon status={event.status}/></span>
      <span><strong>{event.title}</strong><small>{event.subject} · {event.timestamp}</small></span>
    </article>)}</div></div> : null)}</section> : <EmptyState icon="activity" title="No activity yet" description="Backup events and storage checks will appear here."/>}
  </Page>;
}

export function SettingsPage({ animations, onAnimationsChange }: { animations: boolean; onAnimationsChange: (enabled: boolean) => void }) {
  const [settings, setSettings] = useState({ startup: true, automatic: true, changes: true, beforeClose: true, health: true, completed: true, failed: true });
  const update = (key: keyof typeof settings, value: boolean) => setSettings(current => ({ ...current, [key]: value }));
  return <Page title="Settings" subtitle="Choose how Mnemo protects your saves and keeps you informed">
    <div className="settings-layout">
      <div className="settings-column">
        <SettingsSection title="General"><SettingSwitch title="Launch at startup" description="Open Mnemo when you sign in" selected={settings.startup} onChange={value => update("startup", value)}/></SettingsSection>
        <SettingsSection title="Notifications"><SettingSwitch title="Backup completed" description="Show a notification after a successful backup" selected={settings.completed} onChange={value => update("completed", value)}/><SettingSwitch title="Backup failed" description="Alert you when a save could not be protected" selected={settings.failed} onChange={value => update("failed", value)}/></SettingsSection>
      </div>
      <div className="settings-column">
        <SettingsSection title="Backups"><SettingSwitch title="Automatic backups" description="Protect enabled saves without manual steps" selected={settings.automatic} onChange={value => update("automatic", value)}/><SettingSwitch title="Back up when files change" description="Create a copy after Mnemo detects new save data" selected={settings.changes} disabled={!settings.automatic} onChange={value => update("changes", value)}/><SettingSwitch title="Back up before closing" description="Save current progress before Mnemo exits" selected={settings.beforeClose} disabled={!settings.automatic} onChange={value => update("beforeClose", value)}/><SettingSwitch title="Storage health checks" description="Periodically verify connected backup locations" selected={settings.health} onChange={value => update("health", value)}/></SettingsSection>
        <SettingsSection title="Appearance"><SettingSwitch title="Interface motion" description="Use subtle transitions when views and controls change" selected={animations} onChange={onAnimationsChange}/></SettingsSection>
      </div>
    </div>
  </Page>;
}

function Page({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) { return <div className="page"><div className="page-inner"><header className="page-head"><span><h1>{title}</h1><p>{subtitle}</p></span>{action}</header>{children}</div></div>; }
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="settings-section"><SectionLabel>{title}</SectionLabel><div>{children}</div></section>; }
function SettingSwitch({ title, description, selected, disabled = false, onChange }: { title: string; description: string; selected: boolean; disabled?: boolean; onChange: (selected: boolean) => void }) { return <Switch isSelected={selected} isDisabled={disabled} onChange={onChange} className="setting-switch"><Switch.Content><span><strong>{title}</strong><small>{description}</small></span><Switch.Control><Switch.Thumb/></Switch.Control></Switch.Content></Switch>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <h2 className="section-label">{children}</h2>; }
function CompactSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <label className="compact-select"><span className="sr-only">{label}</span><select value={value} onChange={event => onChange(event.target.value)}>{children}</select><Icon name="down" size={14}/></label>; }
function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) { return <div className="page-empty"><Icon name={icon} size={25}/><strong>{title}</strong><p>{description}</p></div>; }
function StorageSoon({ name, type }: { name: string; type: string }) { return <article className="storage-card coming-soon"><div className="storage-head"><ProviderIcon type={type}/><span><strong>{name}</strong><small>Cloud storage</small></span><span className="soon-pill">Coming soon</span></div><p>Cloud providers will be available in a future Mnemo release.</p></article>; }
function groupByHistory<T>(items: T[], getTimestamp: (item: T) => string = item => (item as BackupSnapshot).timestamp) { return items.reduce((groups, item) => { const group = historyGroup(getTimestamp(item)); (groups[group] ||= []).push(item); return groups; }, {} as Partial<Record<HistoryGroup, T[]>>); }
function historyGroup(timestamp: string): HistoryGroup { const value = timestamp.toLowerCase(); if (value.startsWith("today") || value.includes("minute") || value.includes("hour")) return "Today"; if (value.startsWith("yesterday")) return "Yesterday"; const parsed = new Date(timestamp); if (!Number.isNaN(parsed.getTime())) { const now = new Date(); const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime()) / 86400000); return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier"; } return "Earlier"; }
const formatSize = (bytes: number) => bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(1)} GB` : `${Math.round(bytes / 1048576)} MB`;
const providerName = (provider: string) => ({ local: "Local", nas: "Home NAS", drive: "Google Drive", mega: "MEGA" }[provider] || provider);
const storageType = (provider: string) => provider === "nas" ? "Network storage" : provider === "local" ? "Local folder" : "Cloud storage";
