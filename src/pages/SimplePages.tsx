import { useMemo, useState } from "react";
import { Button, Switch } from "@heroui/react";
import type {
  GlobalSettings,
  MinecraftState,
  Snapshot,
  StorageDestination,
} from "../types";
import {
  formatBytes,
  formatDate,
  statusLabel,
  statusTone,
} from "../lib/format";
import { GameArtwork } from "../components/GameArtwork";
import { Icon, ProviderIcon, StatusIcon } from "../components/Icons";
import { SelectMenu } from "../components/SelectMenu";

type HistoryGroup = "Today" | "Yesterday" | "Earlier";
const historyOrder: HistoryGroup[] = ["Today", "Yesterday", "Earlier"];
export function BackupsPage({
  state,
  onRestore,
  onVerify,
  onReveal,
}: {
  state: MinecraftState;
  onRestore: (snapshot: Snapshot) => void;
  onVerify: (id: string) => void;
  onReveal: (type: string, id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [world, setWorld] = useState("all");
  const [root, setRoot] = useState("all");
  const [destination, setDestination] = useState("all");
  const [date, setDate] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const visible = useMemo(
    () =>
      state.snapshots
        .filter((snapshot) => {
          const item = state.worlds.find(
            (value) => value.id === snapshot.worldId,
          );
          return (
            `${item?.displayName || ""} ${snapshot.status}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (world === "all" || snapshot.worldId === world) &&
            (root === "all" || item?.rootId === root) &&
            (destination === "all" ||
              snapshot.replicas.some(
                (replica) => replica.destinationId === destination,
              )) &&
            (status === "all" || snapshot.status === status) &&
            matchesDate(snapshot.createdAt, date)
          );
        })
        .sort((a, b) =>
          sort === "oldest"
            ? a.createdAt.localeCompare(b.createdAt)
            : sort === "size"
              ? b.archiveSize - a.archiveSize
              : b.createdAt.localeCompare(a.createdAt),
        ),
    [state, search, world, root, destination, date, status, sort],
  );
  const groups = group(visible);
  return (
    <Page title="Backups" subtitle="Saved backup history">
      <div className="page-toolbar backup-toolbar">
        <PageSearch
          value={search}
          onChange={setSearch}
          placeholder="Search backups"
        />
        <SelectMenu
          label="World"
          value={world}
          onChange={setWorld}
          options={[
            { value: "all", label: "All worlds" },
            ...state.worlds.map((item) => ({
              value: item.id,
              label: item.displayName,
            })),
          ]}
        />
        <SelectMenu
          label="Folder"
          value={root}
          onChange={setRoot}
          options={[
            { value: "all", label: "All folders" },
            ...state.roots.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ]}
        />
        <SelectMenu
          label="Location"
          value={destination}
          onChange={setDestination}
          options={[
            { value: "all", label: "All locations" },
            ...state.destinations.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ]}
        />
        <SelectMenu
          label="Date"
          value={date}
          onChange={setDate}
          options={[
            { value: "all", label: "All time" },
            { value: "today", label: "Today" },
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
          ]}
        />
        <SelectMenu
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "verified", label: "Verified" },
            { value: "available", label: "Available" },
            { value: "partial", label: "Partial" },
            { value: "failed", label: "Failed" },
          ]}
        />
        <SelectMenu
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "size", label: "Largest" },
          ]}
        />
      </div>
      {visible.length ? (
        <>
          <SummaryStrip
            items={[
              [
                String(visible.length),
                visible.length === 1 ? "backup" : "backups",
              ],
              [
                formatBytes(
                  visible.reduce((sum, item) => sum + item.archiveSize, 0),
                ),
                "stored",
              ],
            ]}
          />
          <section className="backup-feed">
            {historyOrder.map((label) =>
              groups[label]?.length ? (
                <div className="history-group" key={label}>
                  <SectionLabel>{label}</SectionLabel>
                  {groups[label]!.map((snapshot) => {
                    const item = state.worlds.find(
                      (value) => value.id === snapshot.worldId,
                    );
                    return (
                      <article className="backup-entry" key={snapshot.id}>
                        <div className="backup-game">
                          <GameArtwork
                            gameId="minecraft-java"
                            name="Minecraft"
                          />
                          <div className="entry-title">
                            <strong>
                              {item?.displayName || "Missing world"}
                            </strong>
                            <small>
                              {state.roots.find(
                                (root) => root.id === item?.rootId,
                              )?.name || "Unknown folder"}
                            </small>
                          </div>
                        </div>
                        <div className="entry-detail">
                          <span>{formatDate(snapshot.createdAt)}</span>
                          <small>
                            {formatBytes(snapshot.archiveSize)} ·{" "}
                            {snapshot.fileCount} files
                          </small>
                        </div>
                        <div className="entry-storage">
                          <span className="providers">
                            {snapshot.replicas.map((replica) => (
                              <ProviderIcon
                                key={replica.id}
                                type={
                                  state.destinations.find(
                                    (value) =>
                                      value.id === replica.destinationId,
                                  )?.destinationType || "local"
                                }
                              />
                            ))}
                          </span>
                        </div>
                        <span
                          className={`entry-status ${statusTone(snapshot.status)}`}
                        >
                          <StatusIcon status={statusTone(snapshot.status)} />
                          {statusLabel(snapshot.status)}
                        </span>
                        <div className="entry-buttons">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            aria-label="Open backup folder"
                            onPress={() => onReveal("snapshot", snapshot.id)}
                          >
                            <Icon name="storage" size={15} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => onVerify(snapshot.id)}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => onRestore(snapshot)}
                          >
                            <Icon name="restore" size={16} />
                            Restore
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null,
            )}
          </section>
        </>
      ) : (
        <Empty
          icon="backups"
          title="No backups yet"
          description="Back up a world to see it here."
        />
      )}
    </Page>
  );
}

export function ProvidersPage({
  state,
  onAdd,
  onVerify,
  onReveal,
  onDefault,
  onEdit,
  onRemove,
}: {
  state: MinecraftState;
  onAdd: (type: "local" | "nas") => void;
  onVerify: (id: string) => void;
  onReveal: (type: string, id: string) => void;
  onDefault: (id: string) => void;
  onEdit: (item: StorageDestination) => void;
  onRemove: (id: string) => void;
}) {
  const [menu, setMenu] = useState<string>();
  const healthy = state.destinations.filter(
    (item) => item.health === "healthy",
  ).length;
  return (
    <Page
      title="Storage"
      subtitle="Backup locations"
      action={
        <div className="page-actions">
          <Button variant="outline" onPress={() => onAdd("nas")}>
            <ProviderIcon type="nas" />
            Add network path
          </Button>
          <Button variant="outline" onPress={() => onAdd("local")}>
            <Icon name="plus" />
            Add local folder
          </Button>
        </div>
      }
    >
      <SummaryStrip
        className="storage-summary"
        items={[
          [
            String(state.destinations.length),
            state.destinations.length === 1 ? "location" : "locations",
          ],
          [
            formatBytes(
              state.destinations.reduce(
                (sum, item) => sum + item.storedBytes,
                0,
              ),
            ),
            "stored",
          ],
          [
            state.destinations.length && healthy === state.destinations.length
              ? "Healthy"
              : `${healthy} healthy`,
            "",
          ],
        ]}
      />
      <SectionLabel>Connected storage</SectionLabel>
      {state.destinations.length ? (
        <section className="storage-grid">
          {state.destinations.map((item) => {
            const replicas = state.snapshots
              .flatMap((snapshot) => snapshot.replicas)
              .filter((replica) => replica.destinationId === item.id);
            return (
              <article
                className={`storage-card ${statusTone(item.health)}`}
                key={item.id}
              >
                <div className="storage-head">
                  <ProviderIcon type={item.destinationType} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.destinationType === "nas"
                        ? "Network storage"
                        : "Local folder"}
                    </small>
                  </span>
                  <span className={`health-pill ${statusTone(item.health)}`}>
                    <i />
                    {statusLabel(item.health)}
                  </span>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      setMenu((value) =>
                        value === item.id ? undefined : item.id,
                      )
                    }
                    aria-label={`More options for ${item.name}`}
                  >
                    <Icon name="more" size={16} />
                  </Button>
                  {menu === item.id && (
                    <div className="target-menu storage-menu">
                      <button
                        onClick={() => {
                          setMenu(undefined);
                          onReveal("destination", item.id);
                        }}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => {
                          setMenu(undefined);
                          onEdit(item);
                        }}
                      >
                        Rename or change path
                      </button>
                      {!item.isDefault && (
                        <button
                          onClick={() => {
                            setMenu(undefined);
                            onDefault(item.id);
                          }}
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenu(undefined);
                          onRemove(item.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <p className="storage-path" title={item.path}>
                  {item.path}
                </p>
                <div className="storage-facts">
                  <span>
                    <b>{replicas.length}</b>
                    <small>
                      {replicas.length === 1 ? "replica" : "replicas"}
                    </small>
                  </span>
                  <span>
                    <b>
                      {formatBytes(
                        replicas.reduce(
                          (sum, replica) => sum + replica.storedSize,
                          0,
                        ),
                      )}
                    </b>
                    <small>stored</small>
                  </span>
                  {item.availableBytes != null && (
                    <span>
                      <b>{formatBytes(item.availableBytes)}</b>
                      <small>available</small>
                    </span>
                  )}
                </div>
                <div className="storage-card-foot">
                  <span>
                    {item.isDefault && (
                      <span className="default-badge">Default</span>
                    )}
                    {item.lastCheckedAt && (
                      <small>Checked {formatDate(item.lastCheckedAt)}</small>
                    )}
                    {item.healthMessage && (
                      <small className="storage-message error">
                        {item.healthMessage}
                      </small>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => onVerify(item.id)}
                  >
                    <Icon name="refresh" size={15} />
                    Verify
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <Empty
          icon="storage"
          title="No backup location"
          description="Choose where Mnemo should store backups."
        />
      )}
    </Page>
  );
}

export function ActivityPage({
  state,
  onRestore,
}: {
  state: MinecraftState;
  onRestore: (snapshot: Snapshot) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [expanded, setExpanded] = useState<string>();
  const events = useMemo(
    () =>
      state.activity
        .filter(
          (event) =>
            `${event.title} ${event.subject} ${event.detail || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (type === "all" || event.kind === type || event.status === type),
        )
        .sort((a, b) =>
          sort === "oldest"
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
        ),
    [state.activity, search, type, sort],
  );
  const groups = group(events, (event) => event.createdAt);
  return (
    <Page title="Activity" subtitle="Recent activity">
      <div className="page-toolbar activity-toolbar">
        <PageSearch
          value={search}
          onChange={setSearch}
          placeholder="Search activity"
        />
        <SelectMenu
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All activity" },
            { value: "backup", label: "Backups" },
            { value: "restore", label: "Restores" },
            { value: "storage", label: "Storage" },
            { value: "world", label: "Worlds" },
            { value: "warning", label: "Warnings" },
            { value: "error", label: "Errors" },
          ]}
        />
        <SelectMenu
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
        />
      </div>
      {events.length ? (
        <section className="activity-feed">
          {historyOrder.map((label) =>
            groups[label]?.length ? (
              <div className="activity-group" key={label}>
                <SectionLabel>{label}</SectionLabel>
                <div className="activity-timeline">
                  {groups[label]!.map((event) => {
                    const open = expanded === event.id;
                    const snapshot = state.snapshots.find(
                      (item) => item.id === event.snapshotId,
                    );
                    return (
                      <article
                        className={`activity-entry ${event.status}`}
                        key={event.id}
                      >
                        <div className="activity-main">
                          {event.worldId ? (
                            <GameArtwork
                              gameId="minecraft-java"
                              name={event.subject}
                            />
                          ) : (
                            <span className="activity-icon">
                              <Icon
                                name={
                                  event.kind === "storage"
                                    ? "storage"
                                    : "activity"
                                }
                              />
                            </span>
                          )}
                          <span className="timeline-status">
                            <StatusIcon status={statusTone(event.status)} />
                          </span>
                          <span className="activity-copy">
                            <strong>{event.title}</strong>
                            <small>{event.subject}</small>
                            <small>{formatDate(event.createdAt)}</small>
                          </span>
                          <div className="activity-actions">
                            {snapshot && (
                              <Button
                                size="sm"
                                variant="outline"
                                onPress={() => onRestore(snapshot)}
                              >
                                <Icon name="restore" size={15} />
                                Restore
                              </Button>
                            )}
                            {event.detail && (
                              <button
                                className="detail-toggle"
                                onClick={() =>
                                  setExpanded(open ? undefined : event.id)
                                }
                                aria-label="Show details"
                              >
                                <Icon name="down" size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                        {open && (
                          <div className="activity-detail">
                            <span>{event.detail}</span>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </section>
      ) : (
        <Empty
          icon="activity"
          title="No activity yet"
          description="Meaningful Minecraft and storage events will appear here."
        />
      )}
    </Page>
  );
}

export function SettingsPage({
  settings,
  onChange,
}: {
  settings: GlobalSettings;
  onChange: (settings: GlobalSettings) => void;
}) {
  const update = (key: keyof GlobalSettings, value: boolean) =>
    onChange({ ...settings, [key]: value });
  return (
    <Page title="Settings" subtitle="Preferences">
      <div className="settings-layout">
        <div className="settings-column">
          <SettingsSection title="General">
            <Setting
              title="Launch at startup"
              description="Open Mnemo when you sign in"
              selected={settings.launchAtStartup}
              onChange={(value) => update("launchAtStartup", value)}
            />
          </SettingsSection>
          <SettingsSection title="Notifications">
            <Setting
              title="Manual backup completed"
              description="Notify after backups you start"
              selected={settings.notifyManualCompletions}
              onChange={(value) => update("notifyManualCompletions", value)}
            />
            <Setting
              title="Backup failed"
              description="Notify when an operation fails"
              selected={settings.notifyFailures}
              onChange={(value) => update("notifyFailures", value)}
            />
          </SettingsSection>
        </div>
        <div className="settings-column">
          <SettingsSection title="Appearance">
            <Setting
              title="Interface motion"
              description="Animate interface changes"
              selected={settings.interfaceMotion}
              onChange={(value) => update("interfaceMotion", value)}
            />
          </SettingsSection>
        </div>
      </div>
    </Page>
  );
}

function Page({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <div className="page-inner">
        <header className="page-head">
          <span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </span>
          {action}
        </header>
        {children}
      </div>
    </div>
  );
}
function PageSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="page-search">
      <Icon name="search" />
      <span className="sr-only">{placeholder}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
function SummaryStrip({
  items,
  className = "",
}: {
  items: Array<[string, string]>;
  className?: string;
}) {
  return (
    <div className={`summary-strip ${className}`}>
      {items.map(([value, label]) => (
        <span key={`${value}-${label}`}>
          <b>{value}</b>
          {label && <small>{label}</small>}
        </span>
      ))}
    </div>
  );
}
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <SectionLabel>{title}</SectionLabel>
      <div>{children}</div>
    </section>
  );
}
function Setting({
  title,
  description,
  selected,
  onChange,
}: {
  title: string;
  description: string;
  selected: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Switch
      isSelected={selected}
      onChange={onChange}
      className="setting-switch"
    >
      <Switch.Content>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="section-label">{children}</h2>;
}
function Empty({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-empty">
      <Icon name={icon} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
function group<T>(
  items: T[],
  date: (item: T) => string = (item) => String((item as Snapshot).createdAt),
) {
  return items.reduce(
    (all, item) => {
      const label = history(date(item));
      (all[label] ||= []).push(item);
      return all;
    },
    {} as Partial<Record<HistoryGroup, T[]>>,
  );
}
function history(value: string): HistoryGroup {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const item = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const days = Math.floor((start - item) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
}
function matchesDate(value: string, range: string) {
  if (range === "all") return true;
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return false;
  if (range === "today") return history(value) === "Today";
  return Date.now() - date <= Number(range) * 86400000;
}
