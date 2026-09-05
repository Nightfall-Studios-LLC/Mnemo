import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import "./App.css";
import { Sidebar, type Page, type SystemIndicator } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { TitleBar } from "./components/TitleBar";
import { GameList } from "./components/GameList";
import { Inspector } from "./components/Inspector";
import {
  AddRootDialog,
  ConfirmDialog,
  DestinationDialog,
  RenameRootDialog,
  RestoreDialog,
} from "./components/Dialogs";
import {
  ActivityPage,
  BackupsPage,
  ProvidersPage,
  SettingsPage,
} from "./pages/SimplePages";
import { MinecraftPage } from "./pages/MinecraftPage";
import {
  backendAvailable,
  command,
  errorMessage,
  loadMinecraftState,
} from "./lib/backend";
import type {
  BackupPolicy,
  DestinationRequest,
  MinecraftSettings,
  MinecraftState,
  MinecraftWorld,
  OperationProgress,
  Snapshot,
  StorageDestination,
} from "./types";

type Dialog =
  | { kind: "root" }
  | { kind: "storage"; type: "local" | "nas"; item?: StorageDestination }
  | { kind: "restore"; snapshot: Snapshot }
  | { kind: "rename-root"; id: string }
  | { kind: "remove-root"; id: string }
  | { kind: "remove-destination"; id: string }
  | null;
export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [worldsPage, setWorldsPage] = useState(
    () => window.location.hash === "#Minecraft",
  );
  const [state, setState] = useState<MinecraftState>();
  const [loading, setLoading] = useState(backendAvailable);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(false);
  const [sort, setSort] = useState("last");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState("");
  const refresh = useCallback(async () => {
    if (!backendAvailable) return;
    try {
      setState(await loadMinecraftState());
      setError("");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    if (!backendAvailable) {
      setLoading(false);
      setError(
        "Mnemo’s desktop backend is unavailable in browser development mode.",
      );
      return;
    }
    let offState: (() => void) | undefined;
    let offProgress: (() => void) | undefined;
    void listen("minecraft-state-changed", () => void refresh()).then(
      (value) => (offState = value),
    );
    void listen<OperationProgress>("operation-progress", (event) =>
      setState((current) =>
        current
          ? {
              ...current,
              operations:
                event.payload.stage === "done"
                  ? current.operations.filter(
                      (item) => item.operationId !== event.payload.operationId,
                    )
                  : [
                      ...current.operations.filter(
                        (item) =>
                          item.operationId !== event.payload.operationId,
                      ),
                      event.payload,
                    ],
            }
          : current,
      ),
    ).then((value) => (offProgress = value));
    return () => {
      offState?.();
      offProgress?.();
    };
  }, [refresh]);
  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      worldsPage ? "#Minecraft" : `#${page}`,
    );
  }, [page, worldsPage]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };
  const run = async <T,>(
    name: string,
    args: Record<string, unknown> = {},
    success?: string,
  ) => {
    try {
      const result = await command<T>(name, args);
      if (success) notify(success);
      await refresh();
      return result;
    } catch (reason) {
      notify(errorMessage(reason));
      return undefined;
    }
  };
  const chooseFolder = async () => {
    if (!backendAvailable) return undefined;
    const value = await open({ directory: true, multiple: false });
    return typeof value === "string" ? value : undefined;
  };
  const desktopNotice = async (title: string, body: string) => {
    if (!backendAvailable) return;
    let allowed = await isPermissionGranted();
    if (!allowed) allowed = (await requestPermission()) === "granted";
    if (allowed) sendNotification({ title, body });
  };
  const backupWorld = (id: string) =>
    void (async () => {
      const result = await run<Snapshot>(
        "backup_minecraft_world",
        { worldId: id },
        "Backup completed",
      );
      if (result && state?.globalSettings.notifyManualCompletions)
        void desktopNotice(
          "Backup completed",
          state.worlds.find((world) => world.id === id)?.displayName ||
            "Minecraft world",
        );
      if (!result && state?.globalSettings.notifyFailures)
        void desktopNotice(
          "Backup failed",
          state.worlds.find((world) => world.id === id)?.displayName ||
            "Minecraft world",
        );
    })();
  const backupAll = () =>
    void (async () => {
      const result = await run<Snapshot[]>(
        "backup_all_minecraft_worlds",
        {},
        "Minecraft backup completed",
      );
      if (result && state?.globalSettings.notifyManualCompletions)
        void desktopNotice(
          "Minecraft backup completed",
          `${result.length} world${result.length === 1 ? "" : "s"} backed up`,
        );
      if (!result && state?.globalSettings.notifyFailures)
        void desktopNotice("Minecraft backup failed", "Open Mnemo for details");
    })();
  const restore = (snapshot: Snapshot) =>
    setDialog({ kind: "restore", snapshot });
  const reveal = (entityType: string, entityId: string) =>
    void run("reveal_persisted_path", { entityType, entityId });
  const worldPolicy = (world: MinecraftWorld, policy: BackupPolicy | null) =>
    void run(
      "update_minecraft_world_policy",
      { worldId: world.id, policy },
      "World settings saved",
    );
  const inspectorProps = state
    ? {
        state,
        busy: state.operations.length > 0,
        nativeEnabled: backendAvailable,
        onAddRoot: () => setDialog({ kind: "root" }),
        onViewWorlds: () => setWorldsPage(true),
        onBackupAll: backupAll,
        onBackupWorld: backupWorld,
        onRestore: restore,
        onWorldPolicy: worldPolicy,
        onExclude: (world: MinecraftWorld) =>
          void run(
            "set_minecraft_world_excluded",
            { worldId: world.id, excluded: !world.excluded },
            world.excluded ? "World included" : "World excluded",
          ),
        onReveal: reveal,
        onRescanRoot: (id: string) =>
          void run(
            "rescan_minecraft_root",
            { rootId: id },
            "Save folder rescanned",
          ),
        onRenameRoot: (id: string) => setDialog({ kind: "rename-root", id }),
        onRemoveRoot: (id: string) => setDialog({ kind: "remove-root", id }),
        onSettings: (settings: MinecraftSettings) =>
          void run(
            "set_minecraft_settings",
            { settings },
            "Minecraft settings saved",
          ),
      }
    : undefined;
  const setMainPage = (next: Page) => {
    setWorldsPage(false);
    setPage(next);
  };
  const system = state
    ? {
        state: state.protection.status as SystemIndicator,
        label: state.protection.label,
      }
    : {
        state: error ? "failure" : ("idle" as SystemIndicator),
        label: error ? "Backend unavailable" : "Starting…",
      };
  let content: React.ReactNode;
  if (worldsPage && state && inspectorProps)
    content = (
      <MinecraftPage {...inspectorProps} onBack={() => setWorldsPage(false)} />
    );
  else if (page === "Library")
    content = (
      <>
        <Toolbar
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={() => setFilter((value) => !value)}
          sort={sort}
          onSort={setSort}
          onBackupAll={backupAll}
          disabled={!backendAvailable || !state?.worlds.length}
        />
        <div className="library">
          {state ? (
            <>
              <GameList
                state={state}
                selected={selected}
                onSelect={() => setSelected(true)}
                visible={
                  "minecraft java edition".includes(search.toLowerCase()) &&
                  (!filter || state.protection.status !== "idle")
                }
              />
              <Inspector {...inspectorProps!} />
            </>
          ) : (
            <>
              <section className="game-panel">
                <div className="game-head">
                  <span>Games</span>
                  <span>0 in library</span>
                </div>
              </section>
              <aside className="inspector backend-empty">
                <div>
                  <strong>
                    {loading ? "Starting Mnemo…" : "Backend unavailable"}
                  </strong>
                  <p>{error || "Connecting to the desktop backend."}</p>
                </div>
              </aside>
            </>
          )}
        </div>
      </>
    );
  else if (page === "Backups" && state)
    content = (
      <BackupsPage
        state={state}
        onRestore={restore}
        onVerify={(id) =>
          void run(
            "verify_minecraft_snapshot",
            { snapshotId: id },
            "Backup verified",
          )
        }
        onReveal={reveal}
      />
    );
  else if (page === "Providers" && state)
    content = (
      <ProvidersPage
        state={state}
        onAdd={(type) => setDialog({ kind: "storage", type })}
        onVerify={(id) =>
          void run(
            "verify_storage_destination",
            { destinationId: id },
            "Storage verified",
          )
        }
        onReveal={reveal}
        onDefault={(id) =>
          void run(
            "set_default_storage_destination",
            { destinationId: id },
            "Default storage updated",
          )
        }
        onEdit={(item) =>
          setDialog({ kind: "storage", type: item.destinationType, item })
        }
        onRemove={(id) => setDialog({ kind: "remove-destination", id })}
      />
    );
  else if (page === "Activity" && state)
    content = <ActivityPage state={state} onRestore={restore} />;
  else if (page === "Settings" && state)
    content = (
      <SettingsPage
        settings={state.globalSettings}
        onChange={(settings) =>
          void run("set_global_settings", { settings }, "Settings saved")
        }
      />
    );
  else
    content = (
      <div className="page">
        <div className="page-empty">
          <strong>Backend unavailable</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  return (
    <main
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${state?.globalSettings.interfaceMotion === false ? "animations-off" : ""}`}
    >
      <TitleBar />
      <Sidebar
        page={worldsPage ? "Library" : page}
        collapsed={sidebarCollapsed}
        system={system}
        onChange={setMainPage}
        onCollapse={() => setSidebarCollapsed((value) => !value)}
      />
      <div className="workspace">{content}</div>
      {dialog?.kind === "root" && state && (
        <AddRootDialog
          state={state}
          onChoose={chooseFolder}
          onClose={() => setDialog(null)}
          onConfirm={(request) => {
            setDialog(null);
            void run("add_minecraft_root", { request }, "Save folder added");
          }}
        />
      )}
      {dialog?.kind === "storage" && state && (
        <DestinationDialog
          type={dialog.type}
          item={dialog.item}
          onChoose={chooseFolder}
          onClose={() => setDialog(null)}
          onConfirm={(request: DestinationRequest) => {
            const current = dialog.item;
            setDialog(null);
            void (current
              ? run(
                  "update_storage_destination",
                  {
                    destinationId: current.id,
                    name: request.name,
                    path: request.path,
                  },
                  "Storage updated",
                )
              : run("add_storage_destination", { request }, "Storage added"));
          }}
        />
      )}
      {dialog?.kind === "restore" && state && (
        <RestoreDialog
          state={state}
          snapshot={dialog.snapshot}
          onClose={() => setDialog(null)}
          onConfirm={(rootId) => {
            const snapshot = dialog.snapshot;
            setDialog(null);
            void run(
              "restore_minecraft_snapshot",
              { snapshotId: snapshot.id, rootId: rootId ?? null },
              "World restored",
            );
          }}
        />
      )}
      {dialog?.kind === "rename-root" &&
        state &&
        (() => {
          const root = state.roots.find((item) => item.id === dialog.id);
          return root ? (
            <RenameRootDialog
              root={root}
              onClose={() => setDialog(null)}
              onConfirm={(name) => {
                setDialog(null);
                void run(
                  "rename_minecraft_root",
                  { rootId: root.id, name },
                  "Save folder renamed",
                );
              }}
            />
          ) : null;
        })()}
      {dialog?.kind === "remove-root" && (
        <ConfirmDialog
          title="Remove save folder from Mnemo?"
          message="Mnemo will stop tracking this folder. Minecraft files will not be deleted."
          confirmLabel="Remove from Mnemo"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const id = dialog.id;
            setDialog(null);
            void run(
              "remove_minecraft_root",
              { rootId: id },
              "Save folder removed",
            );
          }}
        />
      )}
      {dialog?.kind === "remove-destination" && (
        <ConfirmDialog
          title="Remove storage location?"
          message="Existing backup files will remain on disk, but Mnemo will stop writing to this location."
          confirmLabel="Remove"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const id = dialog.id;
            setDialog(null);
            void run(
              "remove_storage_destination",
              { destinationId: id },
              "Storage removed",
            );
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
function readPage(): Page {
  const value = window.location.hash.slice(1);
  return (
    ["Library", "Backups", "Providers", "Activity", "Settings"] as Page[]
  ).includes(value as Page)
    ? (value as Page)
    : "Library";
}
