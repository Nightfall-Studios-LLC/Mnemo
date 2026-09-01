use crate::{commands::backup::expand_path, models::{BackupSnapshot, SaveTarget}};
use chrono::Local;
use std::{fs, path::Path};

fn copy_tree(source: &Path, destination: &Path) -> Result<(), String> {
    if source.is_file() { fs::copy(source, destination).map_err(|e| e.to_string())?; return Ok(()); }
    fs::create_dir_all(destination).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? { let entry = entry.map_err(|e| e.to_string())?; copy_tree(&entry.path(), &destination.join(entry.file_name()))?; }
    Ok(())
}

#[tauri::command]
pub async fn restore_backup(snapshot: BackupSnapshot, target: Option<SaveTarget>, confirmed: bool, backup_current: bool) -> Result<(), String> {
    if !confirmed { return Err("Restore requires explicit confirmation".into()); }
    tauri::async_runtime::spawn_blocking(move || {
        let target = target.ok_or("The restore target is required")?;
        let destination = expand_path(&target.source_path);
        let source = Path::new(&snapshot.snapshot_path).join("files");
        if !source.exists() { return Err("Snapshot files could not be found".into()); }
        if destination.exists() {
            if backup_current {
                let preserved = destination.with_extension(format!("mnemo-pre-restore-{}", Local::now().format("%Y%m%d%H%M%S")));
                fs::rename(&destination, preserved).map_err(|e| format!("Could not preserve current save: {e}"))?;
            } else { return Err("Refusing to overwrite current save without preserving it".into()); }
        }
        copy_tree(&source, &destination)
    }).await.map_err(|e| e.to_string())?
}
