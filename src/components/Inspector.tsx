import { useState } from "react";
import { Button, Switch } from "@heroui/react";
import type {
  BackupPolicy,
  MinecraftSettings,
  MinecraftState,
  MinecraftWorld,
  Snapshot,
} from "../types";
import {
  formatBytes,
  formatDate,
  policyLabel,
  relativeTime,
  statusLabel,
  statusTone,
} from "../lib/format";
import { Icon, ProviderIcon, StatusIcon } from "./Icons";
import { GameArtwork } from "./GameArtwork";
import { getGameArtwork } from "../lib/gameArtwork";
import { SelectMenu } from "./SelectMenu";

type Tab = "Worlds" | "Backups" | "Folders" | "Settings";
type Props = {
  state: MinecraftState;
  busy: boolean;
  nativeEnabled: boolean;
  onAddRoot: () => void;
  onViewWorlds: () => void;
  onBackupAll: () => void;
  onBackupWorld: (id: string) => void;
  onRestore: (snapshot: Snapshot) => void;
  onWorldPolicy: (world: MinecraftWorld, policy: BackupPolicy | null) => void;
  onExclude: (world: MinecraftWorld) => void;
  onReveal: (type: string, id: string) => void;
  onRescanRoot: (id: string) => void;
  onRenameRoot: (id: string) => void;
  onRemoveRoot: (id: string) => void;
  onSettings: (settings: MinecraftSettings) => void;
};

export function Inspector(props: Props) {
  const { state } = props;
  const [tab, setTab] = useState<Tab>("Worlds");
  const artwork = getGameArtwork("minecraft-java");
  const latest = state.snapshots[0];
  return (
    <aside className="inspector">
      <div
        className="inspector-head"
        style={
          artwork
            ? ({
                "--hero-image": `url(${artwork.hero})`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {artwork && <div className="inspector-hero" aria-hidden="true" />}
        <div className="inspector-identity">
          <GameArtwork
            gameId="minecraft-java"
            name="Minecraft"
            className="large"
          />
          <span>
            <h2>Minecraft</h2>
            <p>Java Edition</p>
          </span>
        </div>
        <div className="inspector-facts">
          <span>
            <b>
              {state.protection.protectedWorlds} of{" "}
              {state.protection.totalWorlds}
            </b>
            <small>worlds protected</small>
          </span>
          <span>
            <b>{latest ? relativeTime(latest.createdAt) : "Never"}</b>
            <small>last backup</small>
          </span>
        </div>
        <div className="header-actions">
          <Button
            className="mnemo-button secondary"
            variant="outline"
            isDisabled={!latest || !props.nativeEnabled || props.busy}
            onPress={() => latest && props.onRestore(latest)}
          >
            <Icon name="restore" />
            Restore
          </Button>
          <Button
            className="mnemo-button primary"
            isDisabled={
              !props.nativeEnabled || props.busy || !state.worlds.length
            }
            onPress={props.onBackupAll}
          >
            <Icon name="upload" />
            {props.busy ? "Backing up…" : "Back Up Now"}
          </Button>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Minecraft details">
        {(["Worlds", "Backups", "Folders", "Settings"] as Tab[]).map((item) => (
          <button
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel">
        {tab === "Worlds" && <Worlds {...props} />}{" "}
        {tab === "Backups" && (
          <Backups state={state} onRestore={props.onRestore} />
        )}{" "}
        {tab === "Folders" && <Folders {...props} />}{" "}
        {tab === "Settings" && (
          <MinecraftSettingsPane state={state} onSave={props.onSettings} />
        )}
      </div>
    </aside>
  );
}

function Worlds(props: Props) {
  const [menu, setMenu] = useState<string>();
  return (
    <>
      <div className="compact-pane-action">
        <Button variant="ghost" onPress={props.onViewWorlds}>
          <Icon name="library" size={16} />
          View All Worlds
        </Button>
      </div>
      <div className="target-list">
        {props.state.worlds.length ? (
          props.state.worlds.map((world) => {
            const destinations = props.state.destinations.filter((item) =>
              world.effectivePolicy.destinationIds.includes(item.id),
            );
            return (
              <div className="target-row" key={world.id}>
                <div className="target-title">
                  <span className="target-icon">◆</span>
                  <strong>{world.displayName}</strong>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="target-menu-trigger"
                    aria-label={`More options for ${world.displayName}`}
                    onPress={() =>
                      setMenu((current) =>
                        current === world.id ? undefined : world.id,
                      )
                    }
                  >
                    <Icon name="more" size={17} />
                  </Button>
                </div>
                {menu === world.id && (
                  <div className="target-menu" role="menu">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenu(undefined);
                        props.onBackupWorld(world.id);
                      }}
                    >
                      <strong>Back Up Now</strong>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenu(undefined);
                        props.onReveal("world", world.id);
                      }}
                    >
                      <strong>Open folder</strong>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenu(undefined);
                        props.onExclude(world);
                      }}
                    >
                      <strong>
                        {world.excluded
                          ? "Include in protection"
                          : "Exclude from protection"}
                      </strong>
                    </button>
                  </div>
                )}
                <div className="target-automation">
                  <span>
                    <b>Automatic backup</b>
                    <small>
                      {policyLabel(
                        world.effectivePolicy.mode,
                        world.effectivePolicy.intervalMinutes,
                      )}
                    </small>
                  </span>
                  <Switch
                    isSelected={
                      world.effectivePolicy.automatic && !world.excluded
                    }
                    isDisabled={world.missing}
                    onChange={(selected) =>
                      props.onWorldPolicy(world, {
                        ...world.effectivePolicy,
                        automatic: selected,
                        mode:
                          selected && world.effectivePolicy.mode === "manual"
                            ? "both"
                            : world.effectivePolicy.mode,
                      })
                    }
                    aria-label={`Automatic backup for ${world.displayName}`}
                    className="mnemo-switch"
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>
                <div className="target-meta">
                  <span className="destination-summary">
                    {destinations.length ? (
                      <>
                        <span className="providers">
                          {destinations.map((destination) => (
                            <ProviderIcon
                              key={destination.id}
                              type={destination.destinationType}
                            />
                          ))}
                        </span>
                        {destinations
                          .map((destination) => destination.name)
                          .join(" · ")}
                      </>
                    ) : (
                      "No active destinations"
                    )}
                  </span>
                  <span>
                    {world.lastBackupAt
                      ? `Last backup ${relativeTime(world.lastBackupAt)}`
                      : "Never backed up"}
                  </span>
                  <span
                    className={`status-label ${statusTone(world.protectionStatus)}`}
                  >
                    <StatusIcon status={statusTone(world.protectionStatus)} />
                    {statusLabel(world.protectionStatus)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">
            No worlds found. Add a Minecraft saves folder.
          </div>
        )}
      </div>
      {!props.state.roots.length && (
        <Button
          className="add-target"
          variant="ghost"
          onPress={props.onAddRoot}
        >
          <Icon name="plus" />
          Add save folder
        </Button>
      )}
    </>
  );
}

function Backups({
  state,
  onRestore,
}: {
  state: MinecraftState;
  onRestore: (snapshot: Snapshot) => void;
}) {
  return (
    <div className="history-list">
      {state.snapshots.length ? (
        state.snapshots.slice(0, 12).map((snapshot) => {
          const world = state.worlds.find(
            (item) => item.id === snapshot.worldId,
          );
          return (
            <div className="history-row" key={snapshot.id}>
              <span>
                <strong>{world?.displayName || "Missing world"}</strong>
                <small>{formatDate(snapshot.createdAt)}</small>
              </span>
              <span className="providers">
                {snapshot.replicas.map((replica) => {
                  const destination = state.destinations.find(
                    (item) => item.id === replica.destinationId,
                  );
                  return (
                    <ProviderIcon
                      key={replica.id}
                      type={destination?.destinationType || "local"}
                    />
                  );
                })}
              </span>
              <span className="meta">
                {formatBytes(snapshot.archiveSize)} · {snapshot.fileCount} files
              </span>
              <Button
                size="sm"
                variant="outline"
                className="mini"
                onPress={() => onRestore(snapshot)}
              >
                <Icon name="restore" size={16} />
                Restore
              </Button>
            </div>
          );
        })
      ) : (
        <div className="empty">No backups yet.</div>
      )}
    </div>
  );
}

function Folders(props: Props) {
  const [menu, setMenu] = useState<string>();
  return (
    <div className="locations">
      <div className="section-label">Save folders</div>
      {props.state.roots.map((root) => (
        <div className="path-row root-path-row" key={root.id}>
          <span>
            <strong>{root.name}</strong>
            <small title={root.path}>
              {root.path} · {root.worldCount} world
              {root.worldCount === 1 ? "" : "s"}
              {root.status !== "available" ? " · Unavailable" : ""}
            </small>
          </span>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() =>
              setMenu((current) => (current === root.id ? undefined : root.id))
            }
            aria-label={`More options for ${root.name}`}
          >
            <Icon name="more" size={17} />
          </Button>
          {menu === root.id && (
            <div className="target-menu root-menu">
              <button
                onClick={() => {
                  setMenu(undefined);
                  props.onReveal("root", root.id);
                }}
              >
                Open folder
              </button>
              <button
                onClick={() => {
                  setMenu(undefined);
                  props.onRescanRoot(root.id);
                }}
              >
                Rescan
              </button>
              <button
                onClick={() => {
                  setMenu(undefined);
                  props.onRenameRoot(root.id);
                }}
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setMenu(undefined);
                  props.onRemoveRoot(root.id);
                }}
              >
                Remove from Mnemo
              </button>
            </div>
          )}
        </div>
      ))}
      <Button className="add-target" variant="ghost" onPress={props.onAddRoot}>
        <Icon name="plus" />
        Add save folder
      </Button>
    </div>
  );
}

function MinecraftSettingsPane({
  state,
  onSave,
}: {
  state: MinecraftState;
  onSave: (settings: MinecraftSettings) => void;
}) {
  const settings = state.minecraftSettings;
  const update = (patch: Partial<MinecraftSettings>) =>
    onSave({ ...settings, ...patch });
  const policy = settings.defaultPolicy;
  const updatePolicy = (patch: Partial<BackupPolicy>) =>
    update({ defaultPolicy: { ...policy, ...patch } });
  return (
    <div className="settings-list">
      <div className="section-label">Backup defaults</div>
      <Setting
        title="Automatic backups"
        description="Protect newly discovered worlds"
        selected={policy.automatic}
        onChange={(automatic) => updatePolicy({ automatic })}
      />
      <div className="inline-setting">
        <span>
          <strong>Default mode</strong>
          <small>Used unless a folder or world overrides it</small>
        </span>
        <SelectMenu
          label="Mode"
          value={policy.mode}
          onChange={(mode) =>
            updatePolicy({ mode: mode as BackupPolicy["mode"] })
          }
          options={policyOptions}
        />
      </div>
      <div className="inline-setting">
        <span>
          <strong>Default interval</strong>
          <small>Unchanged worlds are skipped</small>
        </span>
        <SelectMenu
          label="Interval"
          value={String(policy.intervalMinutes)}
          onChange={(value) => updatePolicy({ intervalMinutes: Number(value) })}
          options={intervalOptions}
        />
      </div>
      <div className="inline-setting destination-defaults">
        <span>
          <strong>Destinations</strong>
          <small>Default locations for protected worlds</small>
        </span>
        <span className="providers">
          {state.destinations.map((destination) => (
            <button
              key={destination.id}
              className={
                policy.destinationIds.includes(destination.id) ? "selected" : ""
              }
              aria-label={`${policy.destinationIds.includes(destination.id) ? "Remove" : "Add"} ${destination.name}`}
              onClick={() =>
                updatePolicy({
                  destinationIds: policy.destinationIds.includes(destination.id)
                    ? policy.destinationIds.filter(
                        (id) => id !== destination.id,
                      )
                    : [...policy.destinationIds, destination.id],
                })
              }
            >
              <ProviderIcon type={destination.destinationType} />
            </button>
          ))}
        </span>
      </div>
      <div className="section-label">Detection</div>
      <Setting
        title="Watch save folders"
        description="Detect worlds and changes while Mnemo is open"
        selected={settings.watchSaveFolders}
        onChange={(watchSaveFolders) => update({ watchSaveFolders })}
      />
      <Setting
        title="Protect new worlds"
        description="Apply folder defaults automatically"
        selected={settings.protectNewWorlds}
        onChange={(protectNewWorlds) => update({ protectNewWorlds })}
      />
      <div className="section-label">Restore</div>
      <Setting
        title="Safety backup before restore"
        description="Back up the current world before replacement"
        selected={settings.safetyBackupBeforeRestore}
        onChange={(safetyBackupBeforeRestore) =>
          update({ safetyBackupBeforeRestore })
        }
      />
      <Setting
        title="Require Minecraft closed"
        description="Block restore when session.lock is active"
        selected={settings.requireMinecraftClosed}
        onChange={(requireMinecraftClosed) =>
          update({ requireMinecraftClosed })
        }
      />
    </div>
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
      className="game-setting-switch"
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
const policyOptions = [
  { value: "manual", label: "Manual" },
  { value: "on_change", label: "On change" },
  { value: "interval", label: "Interval" },
  { value: "both", label: "On change + interval" },
];
const intervalOptions = [5, 10, 15, 30, 60, 120, 360].map((value) => ({
  value: String(value),
  label:
    value < 60
      ? `${value} min`
      : `${value / 60} hour${value === 60 ? "" : "s"}`,
}));
