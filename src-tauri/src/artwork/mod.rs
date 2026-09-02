mod cache;
mod models;
mod steamgriddb;

use cache::{read_cached, write_cache};
use chrono::Utc;
use models::{ArtworkCacheMetadata, ArtworkResult};
use steamgriddb::{ArtworkProvider, SteamGridDbArtworkProvider};
use std::{env, path::Path};
use tauri::Manager;

#[tauri::command]
pub async fn get_game_artwork(app: tauri::AppHandle, game_id: String, game_name: String, steam_app_id: Option<u64>, existing_local_path: Option<String>) -> Result<ArtworkResult, String> {
    let cache_root = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    if let Some((path, metadata)) = read_cached(&cache_root, &game_id) {
        return Ok(result(path, &metadata.provider, Some(metadata.artwork_id), "cached"));
    }
    if let Some(path) = existing_local_path.filter(|value| Path::new(value).exists()) {
        return Ok(ArtworkResult { local_path: Some(path), source: "local".into(), remote_id: None, status: "ready".into() });
    }
    let api_key = match env::var("STEAMGRIDDB_API_KEY").ok().filter(|key| !key.trim().is_empty()) {
        Some(key) => key,
        None => return Ok(placeholder("not-configured")),
    };
    let provider = match SteamGridDbArtworkProvider::new(&api_key) { Ok(value) => value, Err(_) => return Ok(placeholder("provider-error")) };
    let remote_game = if steam_app_id.is_some() { None } else { match provider.search_game(&game_name).await { Ok(value) => value, Err(_) => return Ok(placeholder("lookup-failed")) } };
    if steam_app_id.is_none() && remote_game.is_none() { return Ok(placeholder("no-exact-match")); }
    let remote_game_id = remote_game.as_ref().map(|game| game.id).unwrap_or_default();
    let artwork = match provider.get_grid(remote_game_id, steam_app_id).await { Ok(Some(value)) => value, _ => return Ok(placeholder("no-artwork")) };
    let response = match reqwest::get(&artwork.url).await { Ok(value) if value.status().is_success() => value, _ => return Ok(placeholder("download-failed")) };
    let content_type = response.headers().get(reqwest::header::CONTENT_TYPE).and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let bytes = match response.bytes().await { Ok(value) => value, Err(_) => return Ok(placeholder("download-failed")) };
    let extension = if content_type.contains("webp") { "webp" } else if content_type.contains("png") { "png" } else { "jpg" };
    let mut metadata = ArtworkCacheMetadata { provider: provider.provider_name().into(), source_url: artwork.url, fetched_timestamp: Utc::now().to_rfc3339(), game_id: game_id.clone(), artwork_id: artwork.id.to_string(), file_name: String::new() };
    let path = match write_cache(&cache_root, &game_id, &bytes, extension, &mut metadata) { Ok(path) => path, Err(_) => return Ok(placeholder("cache-failed")) };
    Ok(result(path, provider.provider_name(), Some(metadata.artwork_id), "downloaded"))
}

fn placeholder(status: &str) -> ArtworkResult { ArtworkResult { local_path: None, source: "placeholder".into(), remote_id: None, status: status.into() } }
fn result(path: std::path::PathBuf, source: &str, remote_id: Option<String>, status: &str) -> ArtworkResult { ArtworkResult { local_path: Some(path.to_string_lossy().into_owned()), source: source.into(), remote_id, status: status.into() } }
