import { useEffect, useMemo, useState } from "react";
import { Button, Switch } from "@heroui/react";
import type {
  BackupPolicy,
  MinecraftState,
  MinecraftWorld,
  Snapshot,
  WorldThumbnail as ThumbnailDto,
} from "../types";
import { command } from "../lib/backend";
import {
  formatBytes,
  formatDate,
  policyLabel,
  relativeTime,
  statusLabel,
  statusTone,
} from "../lib/format";
import fallback from "../assets/gameart/minecraftlogo.webp";
import { Icon, ProviderIcon, StatusIcon } from "../components/Icons";
import { SelectMenu } from "../components/SelectMenu";

type Props = {
  state: MinecraftState;
  nativeEnabled: boolean;
  onBack: () => void;
  onAddRoot: () => void;
  onBackupAll: () => void;
  onBackupWorld: (id: string) => void;
  onRestore: (snapshot: Snapshot) => void;
  onReveal: (type: string, id: string) => void;
  onWorldPolicy: (world: MinecraftWorld, policy: BackupPolicy | null) => void;
  onExclude: (world: MinecraftWorld) => void;
};
export function MinecraftPage(props: Props) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [root, setRoot] = useState("all");
  const [selected, setSelected] = useState<string>();
  const world = props.state.worlds.find((item) => item.id === selected);
  const visible = useMemo(
    () =>
      props.state.worlds
        .filter(
          (world) =>
            (root === "all" || world.rootId === root) &&
            world.displayName.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.displayName.localeCompare(b.displayName)
            : sort === "backup"
              ? (b.lastBackupAt || "").localeCompare(a.lastBackupAt || "")
              : sort === "status"
                ? a.protectionStatus.localeCompare(b.protectionStatus)
                : (b.metadata.lastPlayed || 0) - (a.metadata.lastPlayed || 0) ||
                  a.displayName.localeCompare(b.displayName),
        ),
    [props.state.worlds, root, search, sort],
  );
  if (world)
    return (
      <WorldDetail
        {...props}
        world={world}
        onBack={() => setSelected(undefined)}
      />
    );
  return (
    <div className="page minecraft-page">
      <div className="page-inner">
        <header className="minecraft-head">
          <Button
            isIconOnly
            variant="ghost"
            onPress={props.onBack}
            aria-label="Back to Library"
          >
            <Icon name="collapse" />
          </Button>
          <span>
            <h1>Minecraft</h1>
            <p>
              Java Edition · {props.state.worlds.length} worlds ·{" "}
              {props.state.protection.protectedWorlds} protected
            </p>
          </span>
          <div>
            <Button
              variant="outline"
              onPress={props.onBackupAll}
              isDisabled={!props.nativeEnabled || !props.state.worlds.length}
            >
              <Icon name="upload" />
              Back Up All
            </Button>
            <Button
              className="primary"
              onPress={props.onAddRoot}
              isDisabled={!props.nativeEnabled}
            >
              <Icon name="plus" />
              Add save folder
            </Button>
          </div>
        </header>
        <div className="page-toolbar world-toolbar">
          {props.state.worlds.length > 2 && (
            <label className="page-search">
              <Icon name="search" />
              <span className="sr-only">Search worlds</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search worlds"
              />
            </label>
          )}
          <SelectMenu
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: "recent", label: "Recently played" },
              { value: "name", label: "Name" },
              { value: "backup", label: "Last backup" },
              { value: "status", label: "Backup status" },
            ]}
          />
          {props.state.roots.length > 1 && (
            <SelectMenu
              label="Folder"
              value={root}
              onChange={setRoot}
              options={[
                { value: "all", label: "All folders" },
                ...props.state.roots.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          )}
        </div>
        {visible.length ? (
          <div className="world-grid">
            {visible.map((world) => (
              <button
                className="world-card"
                key={world.id}
                onClick={() => setSelected(world.id)}
              >
                <WorldThumbnail world={world} />
                <span className="world-card-copy">
                  <strong>{world.displayName}</strong>
                  <small>
                    {props.state.roots.find((root) => root.id === world.rootId)
                      ?.name || "Missing folder"}
                  </small>
                  <span>
                    {world.lastBackupAt
                      ? `Last backup ${relativeTime(world.lastBackupAt)}`
                      : "Never backed up"}
                  </span>
                  <em className={statusTone(world.protectionStatus)}>
                    <StatusIcon status={statusTone(world.protectionStatus)} />
                    {statusLabel(world.protectionStatus)}
                  </em>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="page-empty">
            <Icon name="library" />
            <strong>No worlds found</strong>
            <p>
              {props.state.roots.length
                ? "No Minecraft worlds found in this folder."
                : "Add a Minecraft saves folder or launcher instance."}
            </p>
            {!props.state.roots.length && (
              <Button onPress={props.onAddRoot}>Add save folder</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WorldThumbnail({ world }: { world: MinecraftWorld }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    if (world.missing) {
      setUrl(undefined);
      return;
    }
    command<ThumbnailDto>("get_world_thumbnail", { worldId: world.id })
      .then((value) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(value.bytes)], { type: "image/png" }),
        );
        setUrl(objectUrl);
      })
      .catch(() => active && setUrl(undefined));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [world.id, world.iconRevision, world.missing]);
  return (
    <span className="world-thumbnail">
      <img src={url || fallback} alt="" />
    </span>
  );
}

function WorldDetail(
  props: Props & { world: MinecraftWorld; onBack: () => void },
) {
  const { world, state } = props;
  const root = state.roots.find((item) => item.id === world.rootId);
  const snapshots = state.snapshots.filter((item) => item.worldId === world.id);
  const destinations = state.destinations.filter((item) =>
    world.effectivePolicy.destinationIds.includes(item.id),
  );
  const setMode = (mode: string) =>
    props.onWorldPolicy(world, {
      ...world.effectivePolicy,
      mode: mode as BackupPolicy["mode"],
    });
  return (
    <div className="page minecraft-page">
      <div className="page-inner">
        <header className="minecraft-head">
          <Button
            isIconOnly
            variant="ghost"
            onPress={props.onBack}
            aria-label="Back to worlds"
          >
            <Icon name="collapse" />
          </Button>
          <span>
            <h1>{world.displayName}</h1>
            <p>{root?.name || "Missing folder"}</p>
          </span>
          <div>
            <Button
              variant="outline"
              onPress={() => props.onReveal("world", world.id)}
              isDisabled={world.missing}
            >
              <Icon name="storage" />
              Open folder
            </Button>
            <Button
              className="primary"
              onPress={() => props.onBackupWorld(world.id)}
              isDisabled={world.missing || !props.nativeEnabled}
            >
              <Icon name="upload" />
              Back Up Now
            </Button>
          </div>
        </header>
        <div className="world-detail-layout">
          <section className="world-detail-main">
            <div className="world-profile">
              <WorldThumbnail world={world} />
              <div>
                <h2>{world.displayName}</h2>
                <p>
                  {world.metadata.versionName || "Unknown Minecraft version"} ·{" "}
                  {world.metadata.gameMode || "Unknown mode"}
                  {world.metadata.hardcore ? " · Hardcore" : ""}
                </p>
                <span
                  className={`status-label ${statusTone(world.protectionStatus)}`}
                >
                  <StatusIcon status={statusTone(world.protectionStatus)} />
                  {statusLabel(world.protectionStatus)}
                </span>
              </div>
            </div>
            <div className="detail-facts">
              <span>
                <small>Last played</small>
                <b>
                  {world.metadata.lastPlayed
                    ? formatDate(
                        new Date(world.metadata.lastPlayed).toISOString(),
                      )
                    : "Unknown"}
                </b>
              </span>
              <span>
                <small>Last backup</small>
                <b>
                  {world.lastBackupAt
                    ? relativeTime(world.lastBackupAt)
                    : "Never"}
                </b>
              </span>
              <span>
                <small>Folder</small>
                <b>{root?.name || "Unavailable"}</b>
              </span>
            </div>
            <div className="section-label">Backup history</div>
            <div className="history-list">
              {snapshots.length ? (
                snapshots.map((snapshot) => (
                  <div className="history-row" key={snapshot.id}>
                    <span>
                      <strong>{formatDate(snapshot.createdAt)}</strong>
                      <small>
                        {formatBytes(snapshot.archiveSize)} ·{" "}
                        {snapshot.fileCount} files ·{" "}
                        {statusLabel(snapshot.status)}
                      </small>
                    </span>
                    <span className="providers">
                      {snapshot.replicas.map((replica) => (
                        <ProviderIcon
                          key={replica.id}
                          type={
                            state.destinations.find(
                              (item) => item.id === replica.destinationId,
                            )?.destinationType || "local"
                          }
                        />
                      ))}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => props.onRestore(snapshot)}
                    >
                      <Icon name="restore" size={15} />
                      Restore
                    </Button>
                  </div>
                ))
              ) : (
                <div className="empty">No backups yet.</div>
              )}
            </div>
          </section>
          <aside className="world-detail-settings">
            <div className="section-label">World settings</div>
            <div className="settings-section">
              <div>
                <Switch
                  isSelected={
                    !world.excluded && world.effectivePolicy.automatic
                  }
                  onChange={(automatic) =>
                    props.onWorldPolicy(world, {
                      ...world.effectivePolicy,
                      automatic,
                    })
                  }
                  className="setting-switch"
                >
                  <Switch.Content>
                    <span>
                      <strong>Automatic backup</strong>
                      <small>
                        {policyLabel(
                          world.effectivePolicy.mode,
                          world.effectivePolicy.intervalMinutes,
                        )}
                      </small>
                    </span>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
                <div className="inline-setting">
                  <span>
                    <strong>Settings source</strong>
                    <small>
                      {world.policyInheritedFrom === "world"
                        ? "Custom settings"
                        : `Using ${world.policyInheritedFrom} defaults`}
                    </small>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      props.onWorldPolicy(
                        world,
                        world.policyOverride
                          ? null
                          : { ...world.effectivePolicy },
                      )
                    }
                  >
                    {world.policyOverride ? "Use defaults" : "Customize"}
                  </Button>
                </div>
                {world.policyOverride && (
                  <>
                    <div className="inline-setting">
                      <span>
                        <strong>Mode</strong>
                      </span>
                      <SelectMenu
                        label="Mode"
                        value={world.effectivePolicy.mode}
                        onChange={setMode}
                        options={[
                          { value: "manual", label: "Manual" },
                          { value: "on_change", label: "On change" },
                          { value: "interval", label: "Interval" },
                          { value: "both", label: "On change + interval" },
                        ]}
                      />
                    </div>
                    <div className="inline-setting">
                      <span>
                        <strong>Interval</strong>
                      </span>
                      <SelectMenu
                        label="Interval"
                        value={String(world.effectivePolicy.intervalMinutes)}
                        onChange={(value) =>
                          props.onWorldPolicy(world, {
                            ...world.effectivePolicy,
                            intervalMinutes: Number(value),
                          })
                        }
                        options={[5, 10, 15, 30, 60, 120, 360].map((value) => ({
                          value: String(value),
                          label:
                            value < 60
                              ? `${value} min`
                              : `${value / 60} hour${value === 60 ? "" : "s"}`,
                        }))}
                      />
                    </div>
                    <div className="inline-setting">
                      <span>
                        <strong>Retention</strong>
                        <small>Applied after a successful backup</small>
                      </span>
                      <SelectMenu
                        label="Retention"
                        value={`${world.effectivePolicy.retention.kind}:${world.effectivePolicy.retention.value ?? ""}`}
                        onChange={(value) => {
                          const [kind, amount] = value.split(":");
                          props.onWorldPolicy(world, {
                            ...world.effectivePolicy,
                            retention: {
                              kind: kind as BackupPolicy["retention"]["kind"],
                              value: amount ? Number(amount) : undefined,
                            },
                          });
                        }}
                        options={[
                          { value: "keep_all:", label: "Keep all" },
                          { value: "count:10", label: "Last 10" },
                          { value: "count:25", label: "Last 25" },
                          { value: "count:50", label: "Last 50" },
                          { value: "age_days:7", label: "7 days" },
                          { value: "age_days:30", label: "30 days" },
                        ]}
                      />
                    </div>
                  </>
                )}
                <Switch
                  isSelected={world.excluded}
                  onChange={() => props.onExclude(world)}
                  className="setting-switch"
                >
                  <Switch.Content>
                    <span>
                      <strong>Excluded</strong>
                      <small>Keep history but stop automatic protection</small>
                    </span>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            </div>
            <div className="section-label">Source</div>
            <p className="world-path" title={world.path}>
              {world.path}
            </p>
            <div className="section-label">Destinations</div>
            <div className="destination-chips">
              {state.destinations.length ? (
                state.destinations.map((item) => (
                  <button
                    className={
                      destinations.some((value) => value.id === item.id)
                        ? "selected"
                        : ""
                    }
                    key={item.id}
                    onClick={() => {
                      const selected =
                        world.effectivePolicy.destinationIds.includes(item.id);
                      props.onWorldPolicy(world, {
                        ...world.effectivePolicy,
                        destinationIds: selected
                          ? world.effectivePolicy.destinationIds.filter(
                              (id) => id !== item.id,
                            )
                          : [...world.effectivePolicy.destinationIds, item.id],
                      });
                    }}
                  >
                    <ProviderIcon type={item.destinationType} />
                    {item.name}
                  </button>
                ))
              ) : (
                <small>No backup location assigned</small>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
