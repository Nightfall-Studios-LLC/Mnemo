use super::models::ArtworkCacheMetadata;
use std::{fs, path::{Path, PathBuf}};

pub fn read_cached(cache_root: &Path, game_id: &str) -> Option<(PathBuf, ArtworkCacheMetadata)> {
    let directory = cache_root.join("artwork").join(safe_id(game_id));
    let metadata: ArtworkCacheMetadata = serde_json::from_slice(&fs::read(directory.join("metadata.json")).ok()?).ok()?;
    let image = directory.join(&metadata.file_name);
    image.exists().then_some((image, metadata))
}

pub fn write_cache(cache_root: &Path, game_id: &str, bytes: &[u8], extension: &str, metadata: &mut ArtworkCacheMetadata) -> Result<PathBuf, String> {
    let directory = cache_root.join("artwork").join(safe_id(game_id));
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    metadata.file_name = format!("library.{extension}");
    let image_path = directory.join(&metadata.file_name);
    fs::write(&image_path, bytes).map_err(|e| e.to_string())?;
    fs::write(directory.join("metadata.json"), serde_json::to_vec_pretty(metadata).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(image_path)
}

fn safe_id(value: &str) -> String {
    value.chars().map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' }).collect()
}
