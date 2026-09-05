use crate::{models::*, service::AppService};
use std::{path::PathBuf, sync::Arc};
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn get_minecraft_state(service: State<'_, Arc<AppService>>) -> Result<MinecraftState, String> {
    service.state()
}
#[tauri::command]
pub fn inspect_minecraft_root(
    service: State<'_, Arc<AppService>>,
    path: String,
) -> Result<RootInspection, String> {
    service.inspect_root(&path)
}
#[tauri::command]
pub fn add_minecraft_root(
    service: State<'_, Arc<AppService>>,
    request: CreateRootRequest,
) -> Result<MinecraftSaveRoot, String> {
    service.inner().add_root(request)
}
#[tauri::command]
pub fn rescan_minecraft_root(
    service: State<'_, Arc<AppService>>,
    root_id: String,
) -> Result<(), String> {
    service.rescan_root(&root_id)
}
#[tauri::command]
pub fn rename_minecraft_root(
    service: State<'_, Arc<AppService>>,
    root_id: String,
    name: String,
) -> Result<(), String> {
    service.rename_root(&root_id, &name)
}
#[tauri::command]
pub fn update_minecraft_root_policy(
    service: State<'_, Arc<AppService>>,
    root_id: String,
    policy: Option<BackupPolicy>,
    protect_new_worlds: bool,
) -> Result<(), String> {
    service.update_root_policy(&root_id, policy, protect_new_worlds)
}
#[tauri::command]
pub fn remove_minecraft_root(
    service: State<'_, Arc<AppService>>,
    root_id: String,
) -> Result<(), String> {
    service.inner().remove_root(&root_id)
}
#[tauri::command]
pub fn update_minecraft_world_policy(
    service: State<'_, Arc<AppService>>,
    world_id: String,
    policy: Option<BackupPolicy>,
) -> Result<(), String> {
    service.update_world_policy(&world_id, policy)
}
#[tauri::command]
pub fn set_minecraft_world_excluded(
    service: State<'_, Arc<AppService>>,
    world_id: String,
    excluded: bool,
) -> Result<(), String> {
    service.set_world_excluded(&world_id, excluded)
}
#[tauri::command]
pub fn remove_minecraft_world(
    service: State<'_, Arc<AppService>>,
    world_id: String,
) -> Result<(), String> {
    service.remove_world(&world_id)
}
#[tauri::command]
pub async fn backup_minecraft_world(
    service: State<'_, Arc<AppService>>,
    world_id: String,
) -> Result<Snapshot, String> {
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || service.backup_world(&world_id, "manual"))
        .await
        .map_err(|error| error.to_string())?
}
#[tauri::command]
pub async fn backup_all_minecraft_worlds(
    service: State<'_, Arc<AppService>>,
) -> Result<Vec<Snapshot>, String> {
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || service.backup_all())
        .await
        .map_err(|error| error.to_string())?
}
#[tauri::command]
pub fn list_minecraft_snapshots(
    service: State<'_, Arc<AppService>>,
    world_id: Option<String>,
) -> Result<Vec<Snapshot>, String> {
    match world_id {
        Some(id) => service.database.snapshots_for_world(&id),
        None => service.database.snapshots(),
    }
}
#[tauri::command]
pub async fn verify_minecraft_snapshot(
    service: State<'_, Arc<AppService>>,
    snapshot_id: String,
    destination_id: Option<String>,
) -> Result<Snapshot, String> {
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        service.verify_snapshot(&snapshot_id, destination_id.as_deref())
    })
    .await
    .map_err(|error| error.to_string())?
}
#[tauri::command]
pub async fn retry_minecraft_replica(
    service: State<'_, Arc<AppService>>,
    snapshot_id: String,
    destination_id: String,
) -> Result<Snapshot, String> {
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        service.retry_replica(&snapshot_id, &destination_id)
    })
    .await
    .map_err(|error| error.to_string())?
}
#[tauri::command]
pub async fn restore_minecraft_snapshot(
    service: State<'_, Arc<AppService>>,
    snapshot_id: String,
    root_id: Option<String>,
) -> Result<(), String> {
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        service.restore_snapshot(&snapshot_id, root_id.as_deref())
    })
    .await
    .map_err(|error| error.to_string())?
}
#[tauri::command]
pub fn add_storage_destination(
    service: State<'_, Arc<AppService>>,
    request: DestinationRequest,
) -> Result<StorageDestination, String> {
    service.add_destination(request)
}
#[tauri::command]
pub fn verify_storage_destination(
    service: State<'_, Arc<AppService>>,
    destination_id: String,
) -> Result<StorageDestination, String> {
    service.verify_destination(&destination_id)
}
#[tauri::command]
pub fn update_storage_destination(
    service: State<'_, Arc<AppService>>,
    destination_id: String,
    name: String,
    path: String,
) -> Result<StorageDestination, String> {
    service.update_destination(&destination_id, &name, &path)
}
#[tauri::command]
pub fn set_default_storage_destination(
    service: State<'_, Arc<AppService>>,
    destination_id: String,
) -> Result<(), String> {
    service.set_default_destination(&destination_id)
}
#[tauri::command]
pub fn remove_storage_destination(
    service: State<'_, Arc<AppService>>,
    destination_id: String,
) -> Result<(), String> {
    service.remove_destination(&destination_id)
}
#[tauri::command]
pub fn list_activity(
    service: State<'_, Arc<AppService>>,
    limit: Option<usize>,
) -> Result<Vec<ActivityEvent>, String> {
    service.database.activity(limit.unwrap_or(500).min(2000))
}
#[tauri::command]
pub fn set_global_settings(
    app: AppHandle,
    service: State<'_, Arc<AppService>>,
    settings: GlobalSettings,
) -> Result<(), String> {
    let autostart = app.autolaunch();
    if settings.launch_at_startup {
        autostart.enable().map_err(|error| error.to_string())?;
    } else {
        autostart.disable().map_err(|error| error.to_string())?;
    }
    service.set_global_settings(settings)
}
#[tauri::command]
pub fn set_minecraft_settings(
    service: State<'_, Arc<AppService>>,
    settings: MinecraftSettings,
) -> Result<(), String> {
    service.set_minecraft_settings(settings)?;
    service.inner().restart_watchers()
}
#[tauri::command]
pub fn get_world_thumbnail(
    service: State<'_, Arc<AppService>>,
    world_id: String,
) -> Result<WorldThumbnail, String> {
    let (bytes, revision) = service.icon(&world_id)?;
    Ok(WorldThumbnail { bytes, revision })
}

#[tauri::command]
pub fn reveal_persisted_path(
    app: AppHandle,
    service: State<'_, Arc<AppService>>,
    entity_type: String,
    entity_id: String,
) -> Result<(), String> {
    let path = match entity_type.as_str() {
        "root" => PathBuf::from(
            service
                .database
                .root(&entity_id)?
                .ok_or("Save folder not found")?
                .path,
        ),
        "world" => PathBuf::from(
            service
                .database
                .world(&entity_id)?
                .ok_or("World not found")?
                .path,
        ),
        "destination" => PathBuf::from(
            service
                .database
                .destination(&entity_id)?
                .ok_or("Storage location not found")?
                .path,
        ),
        "snapshot" => {
            let snapshot = service
                .database
                .snapshot(&entity_id)?
                .ok_or("Snapshot not found")?;
            PathBuf::from(
                snapshot
                    .replicas
                    .into_iter()
                    .find(|replica| !replica.path.is_empty())
                    .ok_or("Snapshot has no stored replica")?
                    .path,
            )
        }
        _ => return Err("Unsupported entity type".into()),
    };
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|error| error.to_string())
}
