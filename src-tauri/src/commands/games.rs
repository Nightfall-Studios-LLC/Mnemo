use crate::{commands::backup::expand_path, models::{DetectedGame, GameDefinition, SaveTarget}};
use std::fs;

const DEFINITIONS: [&str; 3] = [include_str!("../../game-definitions/minecraft-java.json"), include_str!("../../game-definitions/stardew-valley.json"), include_str!("../../game-definitions/witcher-3.json")];

#[tauri::command]
pub async fn detect_games() -> Result<Vec<DetectedGame>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut games = Vec::new();
        for raw in DEFINITIONS {
            let def: GameDefinition = serde_json::from_str(raw).map_err(|e| e.to_string())?;
            let root = expand_path(&def.save_detection.root);
            if !root.exists() { continue; }
            let mut targets = Vec::new();
            match def.save_detection.detection_type.as_str() {
                "subdirectories" => for entry in fs::read_dir(&root).map_err(|e| e.to_string())? { let entry = entry.map_err(|e| e.to_string())?; if entry.path().is_dir() { let name = entry.file_name().to_string_lossy().to_string(); targets.push(target(&def.id, &name, &entry.path().to_string_lossy())); } },
                "files" => for entry in fs::read_dir(&root).map_err(|e| e.to_string())? { let entry = entry.map_err(|e| e.to_string())?; if entry.path().is_file() { let name = entry.file_name().to_string_lossy().to_string(); if def.save_detection.pattern.as_ref().map(|p| name.ends_with(p.trim_start_matches('*'))).unwrap_or(true) { targets.push(target(&def.id, &name, &entry.path().to_string_lossy())); } } },
                _ => targets.push(target(&def.id, "Entire Save Directory", &root.to_string_lossy())),
            }
            if !targets.is_empty() { games.push(DetectedGame { id: def.id, name: def.name, launcher: def.launcher, steam_app_id: def.steam_app_id, save_targets: targets }); }
        }
        Ok(games)
    }).await.map_err(|e| e.to_string())?
}
fn target(game: &str, name: &str, path: &str) -> SaveTarget { SaveTarget { id: name.to_lowercase().replace(' ', "-"), game_id: game.into(), name: name.into(), source_path: path.into(), enabled: true, provider_ids: vec![], last_backup: None, status: "warning".into(), icon: None } }
