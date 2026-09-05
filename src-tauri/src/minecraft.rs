use crate::{db::Database, models::*};
use chrono::Utc;
use flate2::read::GzDecoder;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
    time::UNIX_EPOCH,
};
use uuid::Uuid;
use walkdir::WalkDir;

pub fn expand_path(raw: &str) -> PathBuf {
    let mut value = raw.to_string();
    for (key, item) in std::env::vars() {
        value = value
            .replace(&format!("%{key}%"), &item)
            .replace(&format!("${{{key}}}"), &item);
    }
    if let Some(rest) = value
        .strip_prefix("~/")
        .or_else(|| value.strip_prefix("~\\"))
    {
        if let Some(home) = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }) {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(value)
}

pub fn normalize_path(path: &Path) -> Result<String, String> {
    let absolute = if path.exists() {
        fs::canonicalize(path)
            .map_err(|error| format!("Could not resolve {}: {error}", path.display()))?
    } else if path.is_absolute() {
        clean_path(path)
    } else {
        clean_path(
            &std::env::current_dir()
                .map_err(|error| error.to_string())?
                .join(path),
        )
    };
    let value = absolute
        .to_string_lossy()
        .trim_end_matches(['/', '\\'])
        .replace('/', &std::path::MAIN_SEPARATOR.to_string());
    Ok(if cfg!(windows) {
        value.to_lowercase()
    } else {
        value
    })
}

fn clean_path(path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                result.pop();
            }
            other => result.push(other.as_os_str()),
        }
    }
    result
}

pub fn default_saves_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .map(|path| path.join(".minecraft").join("saves"))
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|path| path.join("Library/Application Support/minecraft/saves"))
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|path| path.join(".minecraft/saves"))
    }
}

pub fn resolve_save_root(selected: &Path) -> Result<PathBuf, String> {
    let selected = expand_path(&selected.to_string_lossy());
    if !selected.exists() {
        return Err(format!("Folder does not exist: {}", selected.display()));
    }
    if !selected.is_dir() {
        return Err("Choose a folder, not a file".into());
    }
    let name = selected
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if name.eq_ignore_ascii_case("saves") || has_direct_worlds(&selected)? {
        return Ok(fs::canonicalize(selected).map_err(|error| error.to_string())?);
    }
    let direct = selected.join("saves");
    if direct.is_dir() {
        return Ok(fs::canonicalize(direct).map_err(|error| error.to_string())?);
    }
    let instance = selected.join(".minecraft").join("saves");
    if instance.is_dir() {
        return Ok(fs::canonicalize(instance).map_err(|error| error.to_string())?);
    }
    // Explicit empty custom roots are valid.
    Ok(fs::canonicalize(selected).map_err(|error| error.to_string())?)
}

fn has_direct_worlds(path: &Path) -> Result<bool, String> {
    for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
            && entry.path().join("level.dat").is_file()
        {
            return Ok(true);
        }
    }
    Ok(false)
}

pub fn source_type(path: &Path) -> String {
    let lower = path.to_string_lossy().to_lowercase();
    if lower.contains("prismlauncher") || lower.contains("prism launcher") {
        "prism"
    } else if lower.contains("multimc") {
        "multimc"
    } else if lower.contains("curseforge") {
        "curseforge"
    } else if lower.contains("modrinth") {
        "modrinth"
    } else if default_saves_path().and_then(|item| normalize_path(&item).ok())
        == normalize_path(path).ok()
    {
        "vanilla"
    } else {
        "custom"
    }
    .into()
}

pub fn suggested_root_name(path: &Path) -> String {
    if default_saves_path().and_then(|item| normalize_path(&item).ok()) == normalize_path(path).ok()
    {
        return "Default Minecraft".into();
    }
    let mut candidate = path;
    if candidate
        .file_name()
        .and_then(|v| v.to_str())
        .is_some_and(|v| v.eq_ignore_ascii_case("saves"))
    {
        candidate = candidate.parent().unwrap_or(candidate);
    }
    if candidate
        .file_name()
        .and_then(|v| v.to_str())
        .is_some_and(|v| v.eq_ignore_ascii_case(".minecraft"))
    {
        candidate = candidate.parent().unwrap_or(candidate);
    }
    candidate
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("Minecraft saves")
        .to_string()
}

pub fn inspect_root(database: &Database, raw: &str) -> Result<RootInspection, String> {
    let resolved = resolve_save_root(Path::new(raw))?;
    let normalized = normalize_path(&resolved)?;
    let duplicate_root_id = database.root_by_path(&normalized)?.map(|root| root.id);
    let world_count = direct_world_paths(&resolved)?.len() as u32;
    Ok(RootInspection {
        resolved_path: resolved.to_string_lossy().to_string(),
        suggested_name: suggested_root_name(&resolved),
        source_type: source_type(&resolved),
        world_count,
        duplicate_root_id,
    })
}

pub fn register_default_root(
    database: &Database,
    settings: &MinecraftSettings,
) -> Result<(), String> {
    let Some(path) = default_saves_path() else {
        return Ok(());
    };
    if !path.is_dir() {
        return Ok(());
    }
    let resolved = fs::canonicalize(&path).map_err(|error| error.to_string())?;
    let normalized = normalize_path(&resolved)?;
    if database.root_by_path(&normalized)?.is_some() {
        return Ok(());
    }
    let root = MinecraftSaveRoot {
        id: Uuid::new_v4().to_string(),
        name: "Default Minecraft".into(),
        path: resolved.to_string_lossy().to_string(),
        source_type: "vanilla".into(),
        enabled: true,
        auto_detect_worlds: true,
        protect_new_worlds: settings.protect_new_worlds,
        created_at: Utc::now().to_rfc3339(),
        last_scan_at: None,
        status: "available".into(),
        policy_override: None,
        effective_policy: settings.default_policy.clone(),
        world_count: 0,
    };
    database.upsert_root(&root, &normalized)?;
    Ok(())
}

fn direct_world_paths(root: &Path) -> Result<Vec<PathBuf>, String> {
    if !root.is_dir() {
        return Ok(Vec::new());
    }
    let mut paths = Vec::new();
    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let file_type = entry.file_type().map_err(|error| error.to_string())?;
        if file_type.is_dir() && !file_type.is_symlink() && entry.path().join("level.dat").is_file()
        {
            paths.push(entry.path());
        }
    }
    paths.sort();
    Ok(paths)
}

#[derive(Deserialize, Default)]
struct LevelRoot {
    #[serde(rename = "Data", default)]
    data: LevelData,
}
#[derive(Deserialize, Default)]
struct LevelData {
    #[serde(rename = "LevelName")]
    level_name: Option<String>,
    #[serde(rename = "LastPlayed")]
    last_played: Option<i64>,
    #[serde(rename = "GameType")]
    game_type: Option<i32>,
    #[serde(rename = "hardcore")]
    hardcore: Option<i8>,
    #[serde(rename = "Difficulty")]
    difficulty: Option<i8>,
    #[serde(rename = "Version")]
    version: Option<LevelVersion>,
    #[serde(rename = "DataVersion")]
    data_version: Option<i32>,
}
#[derive(Deserialize, Default)]
struct LevelVersion {
    #[serde(rename = "Name")]
    name: Option<String>,
}

pub fn parse_level_dat(path: &Path) -> WorldMetadata {
    let parsed = (|| -> Result<LevelRoot, String> {
        let file = fs::File::open(path).map_err(|error| error.to_string())?;
        let mut decoder = GzDecoder::new(file);
        let mut bytes = Vec::new();
        decoder
            .read_to_end(&mut bytes)
            .map_err(|error| error.to_string())?;
        fastnbt::from_bytes(&bytes).map_err(|error| error.to_string())
    })();
    match parsed {
        Ok(root) => WorldMetadata {
            level_name: root.data.level_name,
            last_played: root.data.last_played,
            game_mode: root.data.game_type.map(|value| {
                match value {
                    0 => "Survival",
                    1 => "Creative",
                    2 => "Adventure",
                    3 => "Spectator",
                    _ => "Unknown",
                }
                .into()
            }),
            hardcore: root.data.hardcore.map(|value| value != 0),
            difficulty: root.data.difficulty.map(|value| {
                match value {
                    0 => "Peaceful",
                    1 => "Easy",
                    2 => "Normal",
                    3 => "Hard",
                    _ => "Unknown",
                }
                .into()
            }),
            version_name: root.data.version.and_then(|version| version.name),
            data_version: root.data.data_version,
            parse_error: None,
        },
        Err(error) => WorldMetadata {
            parse_error: Some(error),
            ..WorldMetadata::default()
        },
    }
}

pub fn metadata_fingerprint(metadata: &WorldMetadata, folder_name: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(
        metadata
            .level_name
            .as_deref()
            .unwrap_or(folder_name)
            .as_bytes(),
    );
    digest.update(metadata.data_version.unwrap_or_default().to_le_bytes());
    digest.update(metadata.last_played.unwrap_or_default().to_le_bytes());
    hex::encode(digest.finalize())
}

pub fn world_fingerprint(path: &Path) -> Result<(String, u64, u64), String> {
    let root = fs::canonicalize(path).map_err(|error| error.to_string())?;
    let mut entries = Vec::new();
    let mut total = 0u64;
    let mut count = 0u64;
    for entry in WalkDir::new(&root).follow_links(false).into_iter() {
        let entry = entry.map_err(|error| error.to_string())?;
        if entry.path() == root {
            continue;
        }
        let metadata = fs::symlink_metadata(entry.path()).map_err(|error| error.to_string())?;
        if metadata.file_type().is_symlink() {
            return Err(format!(
                "World contains an unsupported link: {}",
                entry.path().display()
            ));
        }
        let canonical = fs::canonicalize(entry.path()).map_err(|error| error.to_string())?;
        if !canonical.starts_with(&root) {
            return Err(format!(
                "World entry escapes its folder: {}",
                entry.path().display()
            ));
        }
        if metadata.is_file() {
            let relative = entry
                .path()
                .strip_prefix(&root)
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            let modified = metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
                .map(|value| value.as_nanos())
                .unwrap_or_default();
            total = total.saturating_add(metadata.len());
            count += 1;
            entries.push((relative, metadata.len(), modified));
        }
    }
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    let mut digest = Sha256::new();
    for (relative, size, modified) in entries {
        digest.update(relative.as_bytes());
        digest.update(size.to_le_bytes());
        digest.update(modified.to_le_bytes());
    }
    Ok((hex::encode(digest.finalize()), total, count))
}

fn icon_revision(path: &Path) -> Option<String> {
    let metadata = fs::metadata(path.join("icon.png")).ok()?;
    if metadata.len() > 5 * 1024 * 1024 {
        return None;
    }
    let modified = metadata
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_nanos();
    Some(format!("{}-{modified}", metadata.len()))
}

pub fn scan_root(
    database: &Database,
    root_id: &str,
    minecraft_settings: &MinecraftSettings,
) -> Result<Vec<ActivityEvent>, String> {
    let mut root = database
        .root(root_id)?
        .ok_or("Save folder is no longer registered")?;
    let path = PathBuf::from(&root.path);
    let now = Utc::now().to_rfc3339();
    if !path.is_dir() {
        let became_unavailable = root.status != "unavailable";
        root.status = "unavailable".into();
        root.last_scan_at = Some(now.clone());
        root.world_count = 0;
        database.upsert_root(&root, &normalize_path(&path)?)?;
        let mut events = Vec::new();
        for mut world in database.worlds_for_root(root_id)? {
            if !world.missing {
                world.missing = true;
                world.protection_status = "missing".into();
                database.upsert_world(&world)?;
            }
        }
        if became_unavailable {
            let event = ActivityEvent {
                id: Uuid::new_v4().to_string(),
                kind: "folder".into(),
                status: "warning".into(),
                title: "Save folder unavailable".into(),
                subject: root.name.clone(),
                detail: Some(root.path.clone()),
                world_id: None,
                root_id: Some(root.id.clone()),
                snapshot_id: None,
                destination_id: None,
                created_at: now,
            };
            database.add_activity(&event)?;
            events.push(event);
        }
        return Ok(events);
    }
    root.status = "available".into();
    root.last_scan_at = Some(now.clone());
    root.effective_policy = root
        .policy_override
        .clone()
        .unwrap_or_else(|| minecraft_settings.default_policy.clone());
    let existing = database.worlds_for_root(root_id)?;
    let mut by_path: HashMap<String, MinecraftWorld> = existing
        .iter()
        .cloned()
        .map(|world| (world.normalized_path.clone(), world))
        .collect();
    let mut seen_ids = HashSet::new();
    let mut discovered = Vec::new();
    let mut events = Vec::new();
    for world_path in direct_world_paths(&path)? {
        let normalized = normalize_path(&world_path)?;
        let folder_name = world_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("World")
            .to_string();
        let metadata = parse_level_dat(&world_path.join("level.dat"));
        let meta_fingerprint = metadata_fingerprint(&metadata, &folder_name);
        let mut world = if let Some(world) = by_path.remove(&normalized) {
            world
        } else {
            let matches: Vec<_> = existing
                .iter()
                .filter(|candidate| {
                    !seen_ids.contains(&candidate.id)
                        && candidate.normalized_path != normalized
                        && candidate.metadata_fingerprint == meta_fingerprint
                })
                .collect();
            if matches.len() == 1 {
                (*matches[0]).clone()
            } else {
                let id = Uuid::new_v4().to_string();
                events.push(ActivityEvent {
                    id: Uuid::new_v4().to_string(),
                    kind: "world".into(),
                    status: "neutral".into(),
                    title: "World detected".into(),
                    subject: metadata
                        .level_name
                        .clone()
                        .unwrap_or_else(|| folder_name.clone()),
                    detail: Some(world_path.to_string_lossy().to_string()),
                    world_id: Some(id.clone()),
                    root_id: Some(root_id.into()),
                    snapshot_id: None,
                    destination_id: None,
                    created_at: now.clone(),
                });
                MinecraftWorld {
                    id,
                    root_id: root_id.into(),
                    folder_name: folder_name.clone(),
                    display_name: folder_name.clone(),
                    path: world_path.to_string_lossy().to_string(),
                    normalized_path: normalized.clone(),
                    missing: false,
                    excluded: !root.protect_new_worlds,
                    metadata: WorldMetadata::default(),
                    metadata_fingerprint: String::new(),
                    current_fingerprint: None,
                    last_successful_fingerprint: None,
                    policy_override: None,
                    effective_policy: root.effective_policy.clone(),
                    policy_inherited_from: "folder".into(),
                    protection_status: "needs_attention".into(),
                    last_backup_at: None,
                    icon_revision: None,
                }
            }
        };
        world.folder_name = folder_name.clone();
        world.display_name = metadata
            .level_name
            .clone()
            .filter(|name| !name.trim().is_empty())
            .unwrap_or(folder_name);
        world.path = world_path.to_string_lossy().to_string();
        world.normalized_path = normalized;
        world.missing = false;
        world.metadata = metadata;
        world.metadata_fingerprint = meta_fingerprint;
        world.icon_revision = icon_revision(&world_path);
        world.effective_policy = world
            .policy_override
            .clone()
            .unwrap_or_else(|| root.effective_policy.clone());
        world.policy_inherited_from = if world.policy_override.is_some() {
            "world".into()
        } else {
            "folder".into()
        };
        if let Ok((fingerprint, _, _)) = world_fingerprint(&world_path) {
            world.current_fingerprint = Some(fingerprint);
        }
        world.protection_status =
            protection_status(&world, &database.snapshots_for_world(&world.id)?);
        database.upsert_world(&world)?;
        seen_ids.insert(world.id.clone());
        discovered.push(world);
    }
    for mut world in existing {
        if !seen_ids.contains(&world.id) && !world.missing {
            world.missing = true;
            world.protection_status = "missing".into();
            database.upsert_world(&world)?;
            let event = ActivityEvent {
                id: Uuid::new_v4().to_string(),
                kind: "world".into(),
                status: "warning".into(),
                title: "World missing".into(),
                subject: world.display_name.clone(),
                detail: Some(world.path.clone()),
                world_id: Some(world.id.clone()),
                root_id: Some(root_id.into()),
                snapshot_id: None,
                destination_id: None,
                created_at: now.clone(),
            };
            database.add_activity(&event)?;
            events.push(event);
        }
    }
    root.world_count = discovered.len() as u32;
    database.upsert_root(&root, &normalize_path(&path)?)?;
    for event in &events {
        database.add_activity(event)?;
    }
    Ok(events)
}

pub fn protection_status(world: &MinecraftWorld, snapshots: &[Snapshot]) -> String {
    if world.missing {
        return "missing".into();
    }
    if world.excluded
        || !world.effective_policy.automatic
        || world.effective_policy.mode == PolicyMode::Manual
    {
        return "manual".into();
    }
    let Some(latest) = snapshots.first() else {
        return "needs_attention".into();
    };
    if latest.status == "failed" {
        return "failed".into();
    }
    if latest.status == "partial"
        || latest.replicas.iter().any(|replica| {
            replica.status == "failed" || replica.status == "missing" || replica.status == "corrupt"
        })
    {
        return "partial".into();
    }
    if world.current_fingerprint.as_deref() != Some(&latest.fingerprint) {
        return "needs_attention".into();
    }
    if matches!(
        world.effective_policy.mode,
        PolicyMode::Interval | PolicyMode::Both
    ) {
        if let Ok(created) = chrono::DateTime::parse_from_rfc3339(&latest.created_at) {
            if Utc::now()
                .signed_duration_since(created.with_timezone(&Utc))
                .num_minutes()
                > world.effective_policy.interval_minutes as i64 * 2
            {
                return "needs_attention".into();
            }
        }
    }
    "protected".into()
}

pub fn world_icon(database: &Database, world_id: &str) -> Result<(Vec<u8>, String), String> {
    let world = database.world(world_id)?.ok_or("World not found")?;
    let path = Path::new(&world.path).join("icon.png");
    let metadata = fs::metadata(&path).map_err(|_| "World icon is unavailable".to_string())?;
    if metadata.len() > 5 * 1024 * 1024 {
        return Err("World icon is too large".into());
    }
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    if bytes.len() < 8 || &bytes[..8] != b"\x89PNG\r\n\x1a\n" {
        return Err("World icon is not a valid PNG".into());
    }
    Ok((bytes, world.icon_revision.unwrap_or_default()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::{write::GzEncoder, Compression};
    use std::io::Write;
    #[test]
    fn launcher_names_are_human() {
        assert_eq!(
            suggested_root_name(Path::new(
                "D:/PrismLauncher/instances/Better MC/.minecraft/saves"
            )),
            "Better MC"
        );
    }
    #[test]
    fn paths_clean_parent_segments() {
        assert!(normalize_path(Path::new("one/../two"))
            .unwrap()
            .ends_with("two"));
    }
    #[test]
    fn corrupt_nbt_falls_back() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("level.dat"), b"bad").unwrap();
        assert!(parse_level_dat(&dir.path().join("level.dat"))
            .parse_error
            .is_some());
    }
    #[test]
    fn reads_java_level_metadata() {
        let dir = tempfile::tempdir().unwrap();
        let nbt = fastnbt::to_bytes(&serde_json::json!({"Data": {"LevelName": "Test World", "LastPlayed": 1234_i64, "GameType": 1_i32, "hardcore": 1_i8, "Difficulty": 3_i8, "DataVersion": 3953_i32, "Version": {"Name": "1.21.4"}}})).unwrap();
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(&nbt).unwrap();
        fs::write(dir.path().join("level.dat"), encoder.finish().unwrap()).unwrap();
        let metadata = parse_level_dat(&dir.path().join("level.dat"));
        assert_eq!(metadata.level_name.as_deref(), Some("Test World"));
        assert_eq!(metadata.game_mode.as_deref(), Some("Creative"));
        assert_eq!(metadata.version_name.as_deref(), Some("1.21.4"));
        assert_eq!(metadata.hardcore, Some(true));
    }
    #[test]
    fn fingerprint_changes() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("level.dat"), b"one").unwrap();
        let first = world_fingerprint(dir.path()).unwrap().0;
        fs::write(dir.path().join("level.dat"), b"longer").unwrap();
        let second = world_fingerprint(dir.path()).unwrap().0;
        assert_ne!(first, second);
    }
    #[test]
    fn manual_world_is_manual() {
        let mut world = MinecraftWorld {
            id: "w".into(),
            root_id: "r".into(),
            folder_name: "w".into(),
            display_name: "w".into(),
            path: "w".into(),
            normalized_path: "w".into(),
            missing: false,
            excluded: false,
            metadata: WorldMetadata::default(),
            metadata_fingerprint: String::new(),
            current_fingerprint: None,
            last_successful_fingerprint: None,
            policy_override: None,
            effective_policy: BackupPolicy::default(),
            policy_inherited_from: "folder".into(),
            protection_status: String::new(),
            last_backup_at: None,
            icon_revision: None,
        };
        world.effective_policy.mode = PolicyMode::Manual;
        assert_eq!(protection_status(&world, &[]), "manual");
    }
}
