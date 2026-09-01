use crate::models::{BackupSnapshot, SaveTarget};
use chrono::Local;
use std::{fs, path::{Path, PathBuf}};

fn copy_tree(source: &Path, destination: &Path) -> Result<(u64, u64), String> {
    if source.is_file() {
        fs::create_dir_all(destination.parent().ok_or("Invalid destination")?).map_err(|e| e.to_string())?;
        fs::copy(source, destination).map_err(|e| e.to_string())?;
        return Ok((source.metadata().map_err(|e| e.to_string())?.len(), 1));
    }
    fs::create_dir_all(destination).map_err(|e| e.to_string())?;
    let mut size = 0; let mut count = 0;
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let to = destination.join(entry.file_name());
        let (child_size, child_count) = copy_tree(&entry.path(), &to)?;
        size += child_size; count += child_count;
    }
    Ok((size, count))
}

pub(crate) fn expand_path(raw: &str) -> PathBuf {
    let mut value = raw.to_string();
    for (key, val) in std::env::vars() {
        value = value.replace(&format!("%{}%", key), &val);
        value = value.replace(&format!("${{{}}}", key), &val);
    }
    PathBuf::from(value)
}

#[tauri::command]
pub async fn create_backup(game_id: String, target: SaveTarget, destination: String) -> Result<BackupSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let source = expand_path(&target.source_path);
        let destination = expand_path(&destination);
        if !source.exists() { return Err(format!("Source does not exist: {}", source.display())); }
        if destination.as_os_str().is_empty() { return Err("No backup destination configured".into()); }
        fs::create_dir_all(&destination).map_err(|e| format!("Destination is not writable: {e}"))?;
        let now = Local::now();
        let folder = now.format("%Y-%m-%d_%H-%M-%S").to_string();
        let snapshot_dir = destination.join("Mnemo").join(&game_id).join(&target.id).join(&folder);
        let files_dir = snapshot_dir.join("files");
        let (size, file_count) = copy_tree(&source, &files_dir)?;
        let snapshot = BackupSnapshot { id: format!("{}-{}", target.id, now.timestamp()), game_id, save_target_id: target.id, timestamp: now.to_rfc3339(), provider_id: target.provider_ids.first().cloned().unwrap_or_else(|| "local".into()), snapshot_path: snapshot_dir.to_string_lossy().to_string(), size, file_count };
        let metadata = serde_json::to_vec_pretty(&snapshot).map_err(|e| e.to_string())?;
        fs::write(snapshot_dir.join("snapshot.json"), metadata).map_err(|e| e.to_string())?;
        Ok(snapshot)
    }).await.map_err(|e| e.to_string())?
}
