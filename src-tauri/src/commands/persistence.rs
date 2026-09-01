use serde_json::Value;
use std::fs;
use tauri::Manager;

#[tauri::command]
pub fn persist_configuration(app: tauri::AppHandle, configuration: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("configuration.json"), serde_json::to_vec_pretty(&configuration).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_configuration(app: tauri::AppHandle) -> Result<Value, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("configuration.json");
    if !path.exists() { return Ok(serde_json::json!({})); }
    serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}
