import { useState } from "react";
import { Button, Switch } from "@heroui/react";
import type {
  BackupPolicy,
  CreateRootRequest,
  DestinationRequest,
  MinecraftState,
  MinecraftSaveRoot,
  RootInspection,
  Snapshot,
  StorageDestination,
} from "../types";
import { command, errorMessage } from "../lib/backend";
import { Icon, ProviderIcon } from "./Icons";
import { SelectMenu } from "./SelectMenu";

export function AddRootDialog({
  state,
  onChoose,
  onClose,
  onConfirm,
}: {
  state: MinecraftState;
  onChoose: () => Promise<string | undefined>;
  onClose: () => void;
  onConfirm: (request: CreateRootRequest) => void;
}) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [inspection, setInspection] = useState<RootInspection>();
  const [error, setError] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [mode, setMode] = useState<BackupPolicy["mode"]>("both");
  const [interval, setInterval] = useState("30");
  const [destinationIds, setDestinationIds] = useState(() =>
    state.destinations.filter((item) => item.isDefault).map((item) => item.id),
  );
  const inspect = async (value: string) => {
    setError("");
    setInspection(undefined);
    try {
      const result = await command<RootInspection>("inspect_minecraft_root", {
        path: value,
      });
      setInspection(result);
      setPath(result.resolvedPath);
      setName(result.suggestedName);
      if (result.duplicateRootId)
        setError("This save folder is already registered");
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  const choose = async () => {
    const value = await onChoose();
    if (value) await inspect(value);
  };
  const toggleDestination = (id: string) =>
    setDestinationIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        className="modal minecraft-folder-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (!inspection || error) return;
          onConfirm({
            path: inspection.resolvedPath,
            name,
            enabled: true,
            protectNewWorlds: true,
            policy: {
              ...state.minecraftSettings.defaultPolicy,
              automatic,
              mode,
              intervalMinutes: Number(interval),
              destinationIds,
            },
          });
        }}
      >
        <h3>Add Minecraft folder</h3>
        <p>Choose a saves folder or Minecraft instance.</p>
        <label>
          Folder
          <div className="path-input">
            <input readOnly value={path} placeholder="Choose folder" />
            <Button
              type="button"
              isIconOnly
              variant="ghost"
              onPress={choose}
              aria-label="Choose folder"
            >
              <Icon name="folder" />
            </Button>
          </div>
        </label>
        {inspection && (
          <>
            <div className="inspection-result">
              <strong>{inspection.suggestedName}</strong>
              <small>{inspection.resolvedPath}</small>
              <span>
                {inspection.worldCount} world
                {inspection.worldCount === 1 ? "" : "s"} found
              </span>
            </div>
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <Switch
              isSelected={automatic}
              onChange={setAutomatic}
              className="setting-switch"
            >
              <Switch.Content>
                <span>
                  <strong>Automatic backups</strong>
                  <small>Protect worlds in this folder</small>
                </span>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
            <div className="modal-fields">
              <label>
                Mode
                <SelectMenu
                  label="Mode"
                  value={mode}
                  onChange={(value) => setMode(value as BackupPolicy["mode"])}
                  options={[
                    { value: "manual", label: "Manual" },
                    { value: "on_change", label: "On change" },
                    { value: "interval", label: "Interval" },
                    { value: "both", label: "On change + interval" },
                  ]}
                />
              </label>
              <label>
                Interval
                <SelectMenu
                  label="Interval"
                  value={interval}
                  onChange={setInterval}
                  options={[5, 10, 15, 30, 60, 120, 360].map((value) => ({
                    value: String(value),
                    label:
                      value < 60
                        ? `${value} min`
                        : `${value / 60} hour${value === 60 ? "" : "s"}`,
                  }))}
                />
              </label>
            </div>
            {state.destinations.length > 0 && (
              <fieldset className="destination-checks">
                <legend>Destinations</legend>
                {state.destinations.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={destinationIds.includes(item.id)}
                      onChange={() => toggleDestination(item.id)}
                    />
                    <ProviderIcon type={item.destinationType} />
                    {item.name}
                  </label>
                ))}
              </fieldset>
            )}
          </>
        )}
        {error && <p className="modal-error">{error}</p>}
        <div>
          <Button type="button" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          {!inspection ? (
            <Button type="button" className="primary" onPress={choose}>
              Choose folder
            </Button>
          ) : (
            <Button
              type="submit"
              className="primary"
              isDisabled={!!error || !name.trim()}
            >
              Add folder
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export function DestinationDialog({
  type,
  item,
  onChoose,
  onClose,
  onConfirm,
}: {
  type: "local" | "nas";
  item?: StorageDestination;
  onChoose: () => Promise<string | undefined>;
  onClose: () => void;
  onConfirm: (request: DestinationRequest) => void;
}) {
  const [name, setName] = useState(
    item?.name || (type === "nas" ? "Network Backups" : "Local Backups"),
  );
  const [path, setPath] = useState(item?.path || "");
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && path.trim())
            onConfirm({
              name: name.trim(),
              path: path.trim(),
              destinationType: type,
            });
        }}
      >
        <h3>{item ? "Edit storage" : "Add storage folder"}</h3>
        <p>
          {type === "nas"
            ? "Choose a mounted network or NAS path."
            : "Choose a local folder for Minecraft backups."}
        </p>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Folder
          <div className="path-input">
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder={
                type === "nas" ? "\\\\NAS\\Backups" : "Choose folder"
              }
            />
            <Button
              type="button"
              isIconOnly
              variant="ghost"
              onPress={async () => {
                const value = await onChoose();
                if (value) setPath(value);
              }}
              aria-label="Choose folder"
            >
              <Icon name="folder" />
            </Button>
          </div>
        </label>
        <div>
          <Button type="button" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="primary"
            isDisabled={!name.trim() || !path.trim()}
          >
            {item ? "Save" : "Add folder"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div>
          <Button variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className={danger ? "danger" : "primary"}
            onPress={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RenameRootDialog({
  root,
  onClose,
  onConfirm,
}: {
  root: MinecraftSaveRoot;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(root.name);
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onConfirm(name.trim());
        }}
      >
        <h3>Rename save folder</h3>
        <p>The filesystem folder will not be renamed.</p>
        <label>
          Name
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div>
          <Button type="button" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="primary" isDisabled={!name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export function RestoreDialog({
  state,
  snapshot,
  onClose,
  onConfirm,
}: {
  state: MinecraftState;
  snapshot: Snapshot;
  onClose: () => void;
  onConfirm: (rootId?: string) => void;
}) {
  const world = state.worlds.find((item) => item.id === snapshot.worldId);
  const original = state.roots.find((item) => item.id === world?.rootId);
  const available = state.roots.filter((item) => item.status === "available");
  const needsRoot = !!world?.missing || original?.status !== "available";
  const [rootId, setRootId] = useState(
    original?.status === "available" ? original.id : available[0]?.id || "",
  );
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Restore “{world?.displayName || "world"}”?</h3>
        <p>
          Your current world will be backed up first. Close Minecraft before
          restoring.
        </p>
        {needsRoot && (
          <label>
            Restore to
            <SelectMenu
              label="Save folder"
              value={rootId}
              onChange={setRootId}
              options={available.map((root) => ({
                value: root.id,
                label: root.name,
              }))}
            />
          </label>
        )}
        {needsRoot && !available.length && (
          <p className="modal-error">
            Add or reconnect a save folder before restoring.
          </p>
        )}
        <div>
          <Button variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="danger"
            variant="danger"
            isDisabled={needsRoot && !rootId}
            onPress={() => onConfirm(needsRoot ? rootId : undefined)}
          >
            Restore
          </Button>
        </div>
      </div>
    </div>
  );
}
