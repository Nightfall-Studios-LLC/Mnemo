use crate::{archive, db::Database, minecraft, models::*};
use chrono::{DateTime, Utc};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, Weak},
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct AppService {
    pub database: Database,
    staging: PathBuf,
    app: Mutex<Option<AppHandle>>,
    active_worlds: Mutex<HashSet<String>>,
    operations: Mutex<HashMap<String, OperationProgress>>,
    watchers: Mutex<HashMap<String, RecommendedWatcher>>,
    pending_roots: Mutex<HashMap<String, Instant>>,
}

impl AppService {
    pub fn new(app_data: PathBuf) -> Result<Arc<Self>, String> {
        let database = Database::open(&app_data.join("mnemo.sqlite3"))?;
        let service = Arc::new(Self {
            database,
            staging: app_data.join("staging"),
            app: Mutex::new(None),
            active_worlds: Mutex::new(HashSet::new()),
            operations: Mutex::new(HashMap::new()),
            watchers: Mutex::new(HashMap::new()),
            pending_roots: Mutex::new(HashMap::new()),
        });
        let settings: MinecraftSettings =
            service.database.setting("minecraft")?.unwrap_or_default();
        minecraft::register_default_root(&service.database, &settings)?;
        for root in service.database.roots()? {
            let _ = minecraft::scan_root(&service.database, &root.id, &settings);
        }
        Ok(service)
    }

    pub fn attach(self: &Arc<Self>, app: AppHandle) -> Result<(), String> {
        *self
            .app
            .lock()
            .map_err(|_| "Application lock is poisoned")? = Some(app);
        self.restart_watchers()?;
        Self::start_scheduler(Arc::downgrade(self));
        Ok(())
    }

    fn notify_state(&self) {
        if let Ok(app) = self.app.lock() {
            if let Some(app) = app.as_ref() {
                let _ = app.emit("minecraft-state-changed", ());
            }
        }
    }

    fn report_progress(&self, progress: OperationProgress) {
        if progress.stage == "done" {
            if let Ok(mut operations) = self.operations.lock() {
                operations.remove(&progress.operation_id);
            }
        } else if let Ok(mut operations) = self.operations.lock() {
            operations.insert(progress.operation_id.clone(), progress.clone());
        }
        if let Ok(app) = self.app.lock() {
            if let Some(app) = app.as_ref() {
                let _ = app.emit("operation-progress", &progress);
            }
        }
    }

    pub fn state(&self) -> Result<MinecraftState, String> {
        let settings: MinecraftSettings = self.database.setting("minecraft")?.unwrap_or_default();
        let mut roots = self.database.roots()?;
        let mut worlds = self.database.worlds()?;
        let snapshots = self.database.snapshots()?;
        for root in &mut roots {
            root.effective_policy = root
                .policy_override
                .clone()
                .unwrap_or_else(|| settings.default_policy.clone());
            root.world_count = worlds
                .iter()
                .filter(|world| world.root_id == root.id && !world.missing)
                .count() as u32;
        }
        for world in &mut worlds {
            if let Some(root) = roots.iter().find(|root| root.id == world.root_id) {
                world.effective_policy = world
                    .policy_override
                    .clone()
                    .unwrap_or_else(|| root.effective_policy.clone());
                world.policy_inherited_from = if world.policy_override.is_some() {
                    "world".into()
                } else if root.policy_override.is_some() {
                    "folder".into()
                } else {
                    "minecraft".into()
                };
            }
            let active = self
                .active_worlds
                .lock()
                .map(|set| set.contains(&world.id))
                .unwrap_or(false);
            world.protection_status = if active {
                "backing_up".into()
            } else {
                minecraft::protection_status(
                    world,
                    &snapshots
                        .iter()
                        .filter(|snapshot| snapshot.world_id == world.id)
                        .cloned()
                        .collect::<Vec<_>>(),
                )
            };
        }
        let total = worlds.iter().filter(|world| !world.excluded).count() as u32;
        let protected = worlds
            .iter()
            .filter(|world| world.protection_status == "protected")
            .count() as u32;
        let operations = self
            .operations
            .lock()
            .map_err(|_| "Operation lock is poisoned")?
            .values()
            .cloned()
            .collect::<Vec<_>>();
        let (status, label) = if let Some(operation) = operations.first() {
            ("active", operation.message.clone())
        } else if worlds
            .iter()
            .any(|world| world.protection_status == "failed")
        {
            ("failure", "Backup failed".into())
        } else if let Some(destination) = self
            .database
            .destinations()?
            .into_iter()
            .find(|destination| destination.enabled && destination.health != "healthy")
        {
            ("attention", format!("{} unavailable", destination.name))
        } else if worlds.iter().any(|world| {
            matches!(
                world.protection_status.as_str(),
                "needs_attention" | "partial" | "missing"
            )
        }) {
            let count = worlds
                .iter()
                .filter(|world| {
                    matches!(
                        world.protection_status.as_str(),
                        "needs_attention" | "partial" | "missing"
                    )
                })
                .count();
            (
                "attention",
                format!(
                    "{count} world{} need attention",
                    if count == 1 { "" } else { "s" }
                ),
            )
        } else {
            ("idle", "Ready".into())
        };
        let mut destinations = self.database.destinations()?;
        for destination in &mut destinations {
            destination.stored_bytes = snapshots
                .iter()
                .flat_map(|snapshot| &snapshot.replicas)
                .filter(|replica| {
                    replica.destination_id == destination.id
                        && matches!(replica.status.as_str(), "available" | "verified")
                })
                .map(|replica| replica.stored_size)
                .sum();
        }
        Ok(MinecraftState {
            backend_available: true,
            roots,
            worlds,
            destinations,
            snapshots,
            activity: self.database.activity(500)?,
            operations,
            global_settings: self.database.setting("global")?.unwrap_or_default(),
            minecraft_settings: settings,
            protection: ProtectionSummary {
                status: status.into(),
                label,
                protected_worlds: protected,
                total_worlds: total,
            },
        })
    }

    pub fn inspect_root(&self, path: &str) -> Result<RootInspection, String> {
        minecraft::inspect_root(&self.database, path)
    }

    pub fn add_root(
        self: &Arc<Self>,
        request: CreateRootRequest,
    ) -> Result<MinecraftSaveRoot, String> {
        validate_policy(&request.policy)?;
        let inspection = self.inspect_root(&request.path)?;
        if inspection.duplicate_root_id.is_some() {
            return Err("This save folder is already registered".into());
        }
        let settings: MinecraftSettings = self.database.setting("minecraft")?.unwrap_or_default();
        let path = PathBuf::from(&inspection.resolved_path);
        let normalized = minecraft::normalize_path(&path)?;
        let root = MinecraftSaveRoot {
            id: Uuid::new_v4().to_string(),
            name: if request.name.trim().is_empty() {
                inspection.suggested_name
            } else {
                request.name.trim().into()
            },
            path: inspection.resolved_path,
            source_type: inspection.source_type,
            enabled: request.enabled,
            auto_detect_worlds: true,
            protect_new_worlds: request.protect_new_worlds,
            created_at: Utc::now().to_rfc3339(),
            last_scan_at: None,
            status: "available".into(),
            policy_override: Some(request.policy.clone()),
            effective_policy: request.policy,
            world_count: 0,
        };
        self.database.upsert_root(&root, &normalized)?;
        minecraft::scan_root(&self.database, &root.id, &settings)?;
        self.add_activity(
            "folder",
            "neutral",
            "Save folder added",
            &root.name,
            Some(root.path.clone()),
            None,
            Some(root.id.clone()),
            None,
            None,
        )?;
        self.restart_watchers()?;
        self.notify_state();
        self.database
            .root(&root.id)?
            .ok_or("Save folder disappeared".into())
    }

    pub fn rescan_root(&self, id: &str) -> Result<(), String> {
        let settings = self.database.setting("minecraft")?.unwrap_or_default();
        minecraft::scan_root(&self.database, id, &settings)?;
        self.notify_state();
        Ok(())
    }
    pub fn rename_root(&self, id: &str, name: &str) -> Result<(), String> {
        let mut root = self.database.root(id)?.ok_or("Save folder not found")?;
        if name.trim().is_empty() {
            return Err("Folder name is required".into());
        }
        root.name = name.trim().into();
        let normalized = minecraft::normalize_path(Path::new(&root.path))?;
        self.database.upsert_root(&root, &normalized)?;
        self.notify_state();
        Ok(())
    }
    pub fn update_root_policy(
        &self,
        id: &str,
        policy: Option<BackupPolicy>,
        protect_new_worlds: bool,
    ) -> Result<(), String> {
        if let Some(value) = &policy {
            validate_policy(value)?;
        }
        let mut root = self.database.root(id)?.ok_or("Save folder not found")?;
        root.policy_override = policy;
        root.protect_new_worlds = protect_new_worlds;
        let normalized = minecraft::normalize_path(Path::new(&root.path))?;
        self.database.upsert_root(&root, &normalized)?;
        let settings = self.database.setting("minecraft")?.unwrap_or_default();
        minecraft::scan_root(&self.database, id, &settings)?;
        self.notify_state();
        Ok(())
    }
    pub fn remove_root(self: &Arc<Self>, id: &str) -> Result<(), String> {
        let root = self.database.root(id)?.ok_or("Save folder not found")?;
        self.database.delete_root(id)?;
        self.add_activity(
            "folder",
            "neutral",
            "Save folder removed",
            &root.name,
            Some("Removed from Mnemo only; files were not deleted.".into()),
            None,
            Some(id.into()),
            None,
            None,
        )?;
        self.restart_watchers()?;
        self.notify_state();
        Ok(())
    }

    pub fn update_world_policy(
        &self,
        id: &str,
        policy: Option<BackupPolicy>,
    ) -> Result<(), String> {
        if let Some(value) = &policy {
            validate_policy(value)?;
        }
        let mut world = self.database.world(id)?.ok_or("World not found")?;
        world.policy_override = policy;
        let root = self
            .database
            .root(&world.root_id)?
            .ok_or("Save folder not found")?;
        let settings: MinecraftSettings = self.database.setting("minecraft")?.unwrap_or_default();
        world.effective_policy = world.policy_override.clone().unwrap_or_else(|| {
            root.policy_override
                .clone()
                .unwrap_or(settings.default_policy)
        });
        self.database.upsert_world(&world)?;
        self.notify_state();
        Ok(())
    }
    pub fn set_world_excluded(&self, id: &str, excluded: bool) -> Result<(), String> {
        let mut world = self.database.world(id)?.ok_or("World not found")?;
        world.excluded = excluded;
        self.database.upsert_world(&world)?;
        self.notify_state();
        Ok(())
    }
    pub fn remove_world(&self, id: &str) -> Result<(), String> {
        self.database.delete_world(id)?;
        self.notify_state();
        Ok(())
    }

    pub fn add_destination(
        &self,
        request: DestinationRequest,
    ) -> Result<StorageDestination, String> {
        if request.name.trim().is_empty() {
            return Err("Storage name is required".into());
        }
        let path = minecraft::expand_path(&request.path);
        let normalized = minecraft::normalize_path(&path)?;
        if self.database.destination_by_path(&normalized)?.is_some() {
            return Err("This storage folder is already configured".into());
        }
        let is_default = self.database.destinations()?.is_empty();
        let mut destination = StorageDestination {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().into(),
            path: path.to_string_lossy().to_string(),
            destination_type: request.destination_type,
            enabled: true,
            is_default,
            health: "needs_attention".into(),
            health_message: None,
            last_checked_at: None,
            available_bytes: None,
            stored_bytes: 0,
        };
        let _ = self.probe_destination(&mut destination);
        self.database
            .upsert_destination(&destination, &normalized)?;
        if is_default {
            let mut settings: MinecraftSettings =
                self.database.setting("minecraft")?.unwrap_or_default();
            if settings.default_policy.destination_ids.is_empty() {
                settings
                    .default_policy
                    .destination_ids
                    .push(destination.id.clone());
                self.database.set_setting("minecraft", &settings)?;
            }
            for root in self.database.roots()? {
                let _ = minecraft::scan_root(&self.database, &root.id, &settings);
            }
        }
        self.add_activity(
            "storage",
            "neutral",
            "Storage added",
            &destination.name,
            Some(destination.path.clone()),
            None,
            None,
            None,
            Some(destination.id.clone()),
        )?;
        self.notify_state();
        Ok(destination)
    }
    pub fn verify_destination(&self, id: &str) -> Result<StorageDestination, String> {
        let mut destination = self
            .database
            .destination(id)?
            .ok_or("Storage location not found")?;
        let result = self.probe_destination(&mut destination);
        let normalized = minecraft::normalize_path(Path::new(&destination.path))?;
        self.database
            .upsert_destination(&destination, &normalized)?;
        let healthy = result.is_ok();
        self.add_activity(
            "storage",
            if healthy { "healthy" } else { "error" },
            if healthy {
                "Storage verified"
            } else {
                "Storage unavailable"
            },
            &destination.name,
            destination.health_message.clone(),
            None,
            None,
            None,
            Some(destination.id.clone()),
        )?;
        self.notify_state();
        result.map(|_| destination)
    }
    fn probe_destination(&self, destination: &mut StorageDestination) -> Result<(), String> {
        destination.last_checked_at = Some(Utc::now().to_rfc3339());
        let path = Path::new(&destination.path);
        let result = (|| -> Result<(), String> {
            fs::create_dir_all(path).map_err(|error| error.to_string())?;
            let probe = path.join(format!(".mnemo-probe-{}", Uuid::new_v4()));
            let mut file = fs::File::create(&probe)
                .map_err(|error| format!("Location is not writable: {error}"))?;
            use std::io::Write;
            file.write_all(b"mnemo")
                .map_err(|error| error.to_string())?;
            file.sync_all().map_err(|error| error.to_string())?;
            let mut content = String::new();
            use std::io::Read;
            fs::File::open(&probe)
                .map_err(|error| error.to_string())?
                .read_to_string(&mut content)
                .map_err(|error| error.to_string())?;
            let _ = fs::remove_file(&probe);
            if content != "mnemo" {
                return Err("Storage read probe failed".into());
            }
            destination.available_bytes = fs2::available_space(path).ok();
            Ok(())
        })();
        match &result {
            Ok(()) => {
                destination.health = "healthy".into();
                destination.health_message = None;
            }
            Err(error) => {
                destination.health = if path.exists() {
                    "read_only".into()
                } else {
                    "unavailable".into()
                };
                destination.health_message = Some(error.clone());
            }
        }
        result
    }
    pub fn update_destination(
        &self,
        id: &str,
        name: &str,
        path: &str,
    ) -> Result<StorageDestination, String> {
        let mut destination = self
            .database
            .destination(id)?
            .ok_or("Storage location not found")?;
        if !name.trim().is_empty() {
            destination.name = name.trim().into();
        }
        if !path.trim().is_empty() {
            destination.path = minecraft::expand_path(path).to_string_lossy().to_string();
        }
        let _ = self.probe_destination(&mut destination);
        let normalized = minecraft::normalize_path(Path::new(&destination.path))?;
        self.database
            .upsert_destination(&destination, &normalized)?;
        self.notify_state();
        Ok(destination)
    }
    pub fn set_default_destination(&self, id: &str) -> Result<(), String> {
        let destinations = self.database.destinations()?;
        if !destinations.iter().any(|item| item.id == id) {
            return Err("Storage location not found".into());
        }
        for mut destination in destinations {
            destination.is_default = destination.id == id;
            let normalized = minecraft::normalize_path(Path::new(&destination.path))?;
            self.database
                .upsert_destination(&destination, &normalized)?;
        }
        self.notify_state();
        Ok(())
    }
    pub fn remove_destination(&self, id: &str) -> Result<(), String> {
        self.database.delete_destination(id)?;
        self.notify_state();
        Ok(())
    }

    pub fn backup_world(&self, id: &str, mode: &str) -> Result<Snapshot, String> {
        {
            let mut active = self
                .active_worlds
                .lock()
                .map_err(|_| "Operation lock is poisoned")?;
            if active.contains(id) {
                return Err("A backup or restore is already running for this world".into());
            }
            if active.len() >= 2 {
                return Err("Two backup operations are already running".into());
            }
            active.insert(id.into());
        }
        self.notify_state();
        let result =
            archive::create_snapshot(&self.database, &self.staging, id, mode, |progress| {
                self.report_progress(progress)
            });
        self.active_worlds
            .lock()
            .map_err(|_| "Operation lock is poisoned")?
            .remove(id);
        self.notify_state();
        result
    }
    pub fn backup_all(&self) -> Result<Vec<Snapshot>, String> {
        let worlds = self.database.worlds()?;
        let mut completed = Vec::new();
        let mut errors = Vec::new();
        for world in worlds
            .into_iter()
            .filter(|world| !world.missing && !world.excluded && world.effective_policy.automatic)
        {
            match self.backup_world(&world.id, "manual") {
                Ok(snapshot) => completed.push(snapshot),
                Err(error) => errors.push(format!("{}: {error}", world.display_name)),
            }
        }
        if completed.is_empty() && !errors.is_empty() {
            Err(errors.join("\n"))
        } else {
            Ok(completed)
        }
    }
    pub fn verify_snapshot(&self, id: &str, destination: Option<&str>) -> Result<Snapshot, String> {
        let value = archive::verify_replica(&self.database, id, destination)?;
        self.notify_state();
        Ok(value)
    }
    pub fn retry_replica(&self, snapshot: &str, destination: &str) -> Result<Snapshot, String> {
        let value = archive::retry_replica(&self.database, snapshot, destination)?;
        self.notify_state();
        Ok(value)
    }
    pub fn restore_snapshot(&self, id: &str, root: Option<&str>) -> Result<(), String> {
        let snapshot = self.database.snapshot(id)?.ok_or("Snapshot not found")?;
        let world_id = snapshot.world_id.clone();
        {
            let mut active = self
                .active_worlds
                .lock()
                .map_err(|_| "Operation lock is poisoned")?;
            if active.contains(&world_id) {
                return Err("A backup or restore is already running for this world".into());
            }
            active.insert(world_id.clone());
        }
        let result =
            archive::restore_snapshot(&self.database, &self.staging, id, root, |progress| {
                self.report_progress(progress)
            });
        self.active_worlds
            .lock()
            .map_err(|_| "Operation lock is poisoned")?
            .remove(&world_id);
        self.notify_state();
        result
    }
    pub fn icon(&self, id: &str) -> Result<(Vec<u8>, String), String> {
        minecraft::world_icon(&self.database, id)
    }

    pub fn set_global_settings(&self, settings: GlobalSettings) -> Result<(), String> {
        self.database.set_setting("global", &settings)?;
        self.notify_state();
        Ok(())
    }
    pub fn set_minecraft_settings(&self, settings: MinecraftSettings) -> Result<(), String> {
        validate_policy(&settings.default_policy)?;
        self.database.set_setting("minecraft", &settings)?;
        for root in self.database.roots()? {
            minecraft::scan_root(&self.database, &root.id, &settings)?;
        }
        self.notify_state();
        Ok(())
    }

    fn add_activity(
        &self,
        kind: &str,
        status: &str,
        title: &str,
        subject: &str,
        detail: Option<String>,
        world: Option<String>,
        root: Option<String>,
        snapshot: Option<String>,
        destination: Option<String>,
    ) -> Result<(), String> {
        self.database.add_activity(&ActivityEvent {
            id: Uuid::new_v4().to_string(),
            kind: kind.into(),
            status: status.into(),
            title: title.into(),
            subject: subject.into(),
            detail,
            world_id: world,
            root_id: root,
            snapshot_id: snapshot,
            destination_id: destination,
            created_at: Utc::now().to_rfc3339(),
        })
    }

    pub fn restart_watchers(self: &Arc<Self>) -> Result<(), String> {
        self.watchers
            .lock()
            .map_err(|_| "Watcher lock is poisoned")?
            .clear();
        let settings: MinecraftSettings = self.database.setting("minecraft")?.unwrap_or_default();
        if !settings.watch_save_folders {
            return Ok(());
        }
        for root in self
            .database
            .roots()?
            .into_iter()
            .filter(|root| root.enabled && Path::new(&root.path).is_dir())
        {
            let weak = Arc::downgrade(self);
            let root_id = root.id.clone();
            let mut watcher =
                notify::recommended_watcher(move |event: Result<notify::Event, notify::Error>| {
                    if event.is_ok() {
                        if let Some(service) = weak.upgrade() {
                            if let Ok(mut pending) = service.pending_roots.lock() {
                                pending.insert(root_id.clone(), Instant::now());
                            }
                        }
                    }
                })
                .map_err(|error| error.to_string())?;
            watcher
                .watch(Path::new(&root.path), RecursiveMode::Recursive)
                .map_err(|error| error.to_string())?;
            self.watchers
                .lock()
                .map_err(|_| "Watcher lock is poisoned")?
                .insert(root.id, watcher);
        }
        Ok(())
    }

    fn start_scheduler(weak: Weak<Self>) {
        thread::spawn(move || loop {
            thread::sleep(Duration::from_secs(5));
            let Some(service) = weak.upgrade() else {
                return;
            };
            let mut recovered_root = false;
            if let Ok(roots) = service.database.roots() {
                for root in roots.into_iter().filter(|root| {
                    root.enabled && root.status == "unavailable" && Path::new(&root.path).is_dir()
                }) {
                    let settings = service
                        .database
                        .setting("minecraft")
                        .ok()
                        .flatten()
                        .unwrap_or_default();
                    if minecraft::scan_root(&service.database, &root.id, &settings).is_ok() {
                        recovered_root = true;
                    }
                }
            }
            if recovered_root {
                let _ = service.restart_watchers();
                service.notify_state();
            }
            let due_roots = service
                .pending_roots
                .lock()
                .map(|mut pending| {
                    let due = pending
                        .iter()
                        .filter(|(_, instant)| instant.elapsed() >= Duration::from_secs(2))
                        .map(|(id, _)| id.clone())
                        .collect::<Vec<_>>();
                    for id in &due {
                        pending.remove(id);
                    }
                    due
                })
                .unwrap_or_default();
            for root_id in due_roots {
                let settings = service
                    .database
                    .setting("minecraft")
                    .ok()
                    .flatten()
                    .unwrap_or_default();
                let _ = minecraft::scan_root(&service.database, &root_id, &settings);
                let now = Utc::now().to_rfc3339();
                if let Ok(worlds) = service.database.worlds_for_root(&root_id) {
                    for world in worlds {
                        let _ =
                            service
                                .database
                                .set_scheduler_state(&world.id, None, Some(&now), None);
                    }
                }
                service.notify_state();
            }
            let Ok(worlds) = service.database.worlds() else {
                continue;
            };
            for world in worlds.into_iter().filter(|world| {
                world.effective_policy.automatic && !world.excluded && !world.missing
            }) {
                let Ok((_, pending)) = service.database.scheduler_state(&world.id) else {
                    continue;
                };
                let now = Utc::now();
                let pending_due = pending
                    .as_deref()
                    .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
                    .is_some_and(|date| {
                        now.signed_duration_since(date.with_timezone(&Utc))
                            .num_seconds()
                            >= world.effective_policy.debounce_seconds as i64
                    });
                let interval_due = world
                    .last_backup_at
                    .as_deref()
                    .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
                    .map(|date| {
                        now.signed_duration_since(date.with_timezone(&Utc))
                            .num_minutes()
                            >= world.effective_policy.interval_minutes as i64
                    })
                    .unwrap_or(true);
                let due = match world.effective_policy.mode {
                    PolicyMode::Manual => false,
                    PolicyMode::OnChange => pending_due,
                    PolicyMode::Interval => interval_due,
                    PolicyMode::Both => pending_due || interval_due,
                };
                if !due {
                    continue;
                }
                let Ok((fingerprint, _, _)) = minecraft::world_fingerprint(Path::new(&world.path))
                else {
                    continue;
                };
                if world.last_successful_fingerprint.as_deref() == Some(&fingerprint) {
                    let _ = service.database.set_scheduler_state(
                        &world.id,
                        Some(&now.to_rfc3339()),
                        None,
                        None,
                    );
                    continue;
                }
                if service
                    .active_worlds
                    .lock()
                    .map(|set| set.len() >= 2 || set.contains(&world.id))
                    .unwrap_or(true)
                {
                    continue;
                }
                let cloned = service.clone();
                let id = world.id.clone();
                thread::spawn(move || {
                    let result = cloned.backup_world(&id, "automatic");
                    let now = Utc::now().to_rfc3339();
                    let _ = cloned.database.set_scheduler_state(
                        &id,
                        Some(&now),
                        None,
                        result.as_ref().err().map(String::as_str),
                    );
                });
            }
        });
    }
}

fn validate_policy(policy: &BackupPolicy) -> Result<(), String> {
    if policy.interval_minutes < 5 || policy.interval_minutes > 7 * 24 * 60 {
        return Err("Backup interval must be between 5 minutes and 7 days".into());
    }
    if policy.debounce_seconds < 5 || policy.debounce_seconds > 600 {
        return Err("Change debounce must be between 5 seconds and 10 minutes".into());
    }
    match policy.retention.kind {
        RetentionKind::Count if policy.retention.value.unwrap_or(0) < 1 => {
            Err("Retention count must be at least 1".into())
        }
        RetentionKind::AgeDays if policy.retention.value.unwrap_or(0) < 1 => {
            Err("Retention age must be at least 1 day".into())
        }
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_absurd_intervals() {
        let mut policy = BackupPolicy::default();
        policy.interval_minutes = 1;
        assert!(validate_policy(&policy).is_err());
    }
    #[test]
    fn default_policy_is_both() {
        assert_eq!(BackupPolicy::default().mode, PolicyMode::Both);
    }

    fn test_service(path: &Path) -> Arc<AppService> {
        Arc::new(AppService {
            database: Database::open(&path.join("mnemo.sqlite3")).unwrap(),
            staging: path.join("staging"),
            app: Mutex::new(None),
            active_worlds: Mutex::new(HashSet::new()),
            operations: Mutex::new(HashMap::new()),
            watchers: Mutex::new(HashMap::new()),
            pending_roots: Mutex::new(HashMap::new()),
        })
    }

    #[test]
    fn service_fixture_discovers_replicates_verifies_and_restores() {
        let temp = tempfile::tempdir().unwrap();
        let service = test_service(temp.path());
        let saves_one = temp.path().join("default").join("saves");
        let saves_two = temp
            .path()
            .join("PrismLauncher")
            .join("instances")
            .join("Pack")
            .join(".minecraft")
            .join("saves");
        for saves in [&saves_one, &saves_two] {
            let world = saves.join("Survival");
            fs::create_dir_all(world.join("region")).unwrap();
            fs::write(world.join("level.dat"), b"disposable nbt fixture").unwrap();
            fs::write(world.join("region").join("r.0.0.mca"), b"original region").unwrap();
        }
        let local = service
            .add_destination(DestinationRequest {
                name: "Local".into(),
                path: temp.path().join("local").to_string_lossy().into(),
                destination_type: DestinationType::Local,
            })
            .unwrap();
        let nas = service
            .add_destination(DestinationRequest {
                name: "NAS".into(),
                path: temp.path().join("nas").to_string_lossy().into(),
                destination_type: DestinationType::Nas,
            })
            .unwrap();
        let mut policy = BackupPolicy::default();
        policy.destination_ids = vec![local.id.clone(), nas.id.clone()];
        for (name, saves) in [("Default", &saves_one), ("Pack", &saves_two)] {
            service
                .add_root(CreateRootRequest {
                    path: saves.to_string_lossy().into(),
                    name: name.into(),
                    enabled: true,
                    protect_new_worlds: true,
                    policy: policy.clone(),
                })
                .unwrap();
        }
        let state = service.state().unwrap();
        assert_eq!(state.worlds.len(), 2);
        assert_ne!(state.worlds[0].id, state.worlds[1].id);
        let world = state.worlds[0].clone();
        let snapshot = service.backup_world(&world.id, "manual").unwrap();
        assert_eq!(
            snapshot
                .replicas
                .iter()
                .filter(|item| item.status == "available")
                .count(),
            2
        );
        service.verify_snapshot(&snapshot.id, None).unwrap();
        fs::write(
            Path::new(&world.path).join("region").join("r.0.0.mca"),
            b"changed region",
        )
        .unwrap();
        let mut settings: MinecraftSettings =
            service.database.setting("minecraft").unwrap().unwrap();
        settings.safety_backup_before_restore = false;
        service
            .database
            .set_setting("minecraft", &settings)
            .unwrap();
        service.restore_snapshot(&snapshot.id, None).unwrap();
        assert_eq!(
            fs::read(Path::new(&world.path).join("region").join("r.0.0.mca")).unwrap(),
            b"original region"
        );
        fs::remove_dir_all(&world.path).unwrap();
        service.rescan_root(&world.root_id).unwrap();
        assert!(service.database.world(&world.id).unwrap().unwrap().missing);
        service
            .restore_snapshot(&snapshot.id, Some(&world.root_id))
            .unwrap();
        assert!(Path::new(&world.path).join("level.dat").is_file());
    }
}
