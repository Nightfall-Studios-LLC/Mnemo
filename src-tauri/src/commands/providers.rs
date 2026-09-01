use crate::models::BackupProvider;
use std::{fs, path::Path};

#[tauri::command]
pub async fn test_provider(provider: BackupProvider) -> Result<bool, String> {
    if provider.provider_type == "drive" || provider.provider_type == "mega" { return Ok(false); }
    let path = Path::new(&provider.destination);
    fs::create_dir_all(path).map_err(|e| e.to_string())?;
    let probe = path.join(".mnemo-write-test"); fs::write(&probe, b"ok").map_err(|e| e.to_string())?; fs::remove_file(probe).map_err(|e| e.to_string())?; Ok(true)
}
