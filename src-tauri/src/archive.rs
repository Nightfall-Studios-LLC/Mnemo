use crate::{db::Database, minecraft::world_fingerprint, models::*};
use chrono::{Duration, Utc};
use fs2::FileExt;
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{self, Read, Write},
    path::{Path, PathBuf},
    thread,
    time::Duration as StdDuration,
};
use uuid::Uuid;
use walkdir::WalkDir;
use zip::{read::ZipArchive, write::SimpleFileOptions, CompressionMethod, ZipWriter};

pub fn create_snapshot<F>(
    database: &Database,
    staging_root: &Path,
    world_id: &str,
    mode: &str,
    progress: F,
) -> Result<Snapshot, String>
where
    F: Fn(OperationProgress),
{
    let mut world = database.world(world_id)?.ok_or("World not found")?;
    if world.missing || !Path::new(&world.path).is_dir() {
        return Err("World folder is unavailable".into());
    }
    let root = database
        .root(&world.root_id)?
        .ok_or("Save folder not found")?;
    let destination_ids = if world.effective_policy.destination_ids.is_empty() {
        database
            .destinations()?
            .into_iter()
            .filter(|item| item.enabled && item.is_default)
            .map(|item| item.id)
            .collect::<Vec<_>>()
    } else {
        world.effective_policy.destination_ids.clone()
    };
    if destination_ids.is_empty() {
        return Err("No backup location is assigned to this world".into());
    }
    let operation_id = Uuid::new_v4().to_string();
    let report = |stage: &str, done: u64, total: u64, message: String| {
        progress(OperationProgress {
            operation_id: operation_id.clone(),
            world_id: Some(world_id.into()),
            kind: "backup".into(),
            stage: stage.into(),
            bytes_done: done,
            bytes_total: total,
            message,
        })
    };
    report(
        "preparing",
        0,
        0,
        format!("Preparing {}", world.display_name),
    );
    let (before, mut source_size, mut file_count) = world_fingerprint(Path::new(&world.path))?;
    if mode != "manual"
        && world.effective_policy.skip_unchanged
        && world.last_successful_fingerprint.as_deref() == Some(&before)
    {
        return Err("World has not changed since its last successful backup".into());
    }
    fs::create_dir_all(staging_root).map_err(|error| error.to_string())?;
    let snapshot_id = Uuid::new_v4().to_string();
    let stage_path = staging_root.join(format!("{snapshot_id}.zip.part"));
    archive_world(Path::new(&world.path), &stage_path, source_size, |done| {
        report(
            "archiving",
            done,
            source_size,
            format!("Archiving {}", world.display_name),
        )
    })?;
    let after = world_fingerprint(Path::new(&world.path))?.0;
    let mut final_fingerprint = after.clone();
    if before != after {
        let _ = fs::remove_file(&stage_path);
        thread::sleep(StdDuration::from_secs(
            world.effective_policy.debounce_seconds.min(30) as u64,
        ));
        let (retry_before, retry_size, retry_count) = world_fingerprint(Path::new(&world.path))?;
        archive_world(Path::new(&world.path), &stage_path, retry_size, |done| {
            report(
                "archiving",
                done,
                retry_size,
                format!("Retrying {}", world.display_name),
            )
        })?;
        let retry_after = world_fingerprint(Path::new(&world.path))?.0;
        if retry_before != retry_after {
            let _ = fs::remove_file(&stage_path);
            return Err("World kept changing while the snapshot was being created".into());
        }
        final_fingerprint = retry_after;
        source_size = retry_size;
        file_count = retry_count;
    }
    let archive_size = fs::metadata(&stage_path)
        .map_err(|error| error.to_string())?
        .len();
    let checksum = checksum_file(&stage_path)?;
    let created_at = Utc::now().to_rfc3339();
    let manifest = Manifest {
        format_version: 1,
        snapshot_id: snapshot_id.clone(),
        created_at: created_at.clone(),
        game: "minecraft-java".into(),
        save_root_id: root.id.clone(),
        world_id: world.id.clone(),
        world_folder: world.folder_name.clone(),
        world_display_name: world.display_name.clone(),
        source_path: world.path.clone(),
        minecraft_version: world.metadata.version_name.clone(),
        data_version: world.metadata.data_version,
        file_count,
        source_size,
        archive_size,
        checksum: checksum.clone(),
        fingerprint: final_fingerprint.clone(),
        mnemo_version: env!("CARGO_PKG_VERSION").into(),
        requested_destinations: destination_ids.clone(),
    };
    let mut replicas = Vec::new();
    for destination_id in &destination_ids {
        let replica_id = Uuid::new_v4().to_string();
        let mut replica = SnapshotReplica {
            id: replica_id,
            snapshot_id: snapshot_id.clone(),
            destination_id: destination_id.clone(),
            path: String::new(),
            stored_size: 0,
            status: "failed".into(),
            checksum: None,
            error: None,
            verified_at: None,
        };
        match database.destination(destination_id)? {
            Some(destination) => {
                report(
                    "writing_destination",
                    0,
                    archive_size,
                    format!("Writing {}", destination.name),
                );
                match write_replica(
                    &stage_path,
                    &manifest,
                    &destination,
                    &root.id,
                    &world.id,
                    &snapshot_id,
                    |done| {
                        report(
                            "writing_destination",
                            done,
                            archive_size,
                            format!("Writing {}", destination.name),
                        )
                    },
                ) {
                    Ok(path) => {
                        replica.path = path.to_string_lossy().to_string();
                        replica.stored_size = archive_size;
                        replica.status = "available".into();
                        replica.checksum = Some(checksum.clone());
                    }
                    Err(error) => replica.error = Some(error),
                }
            }
            None => replica.error = Some("Destination is no longer configured".into()),
        }
        database.upsert_replica(&replica)?;
        replicas.push(replica);
    }
    let successful = replicas
        .iter()
        .filter(|replica| replica.status == "available" || replica.status == "verified")
        .count();
    let status = if successful == replicas.len() {
        "available"
    } else if successful > 0 {
        "partial"
    } else {
        "failed"
    }
    .to_string();
    let snapshot = Snapshot {
        id: snapshot_id.clone(),
        world_id: world.id.clone(),
        created_at: created_at.clone(),
        mode: mode.into(),
        status: status.clone(),
        fingerprint: final_fingerprint.clone(),
        file_count,
        source_size,
        archive_size,
        checksum,
        replicas,
    };
    database.upsert_snapshot(&snapshot)?;
    let _ = fs::remove_file(&stage_path);
    if successful > 0 {
        world.last_successful_fingerprint = Some(final_fingerprint);
        world.last_backup_at = Some(created_at.clone());
        world.current_fingerprint = world.last_successful_fingerprint.clone();
        database.upsert_world(&world)?;
        apply_retention(database, &world)?;
    }
    let title = if status == "available" {
        "Backup completed"
    } else if status == "partial" {
        "Backup partially completed"
    } else {
        "Backup failed"
    };
    let event = ActivityEvent {
        id: Uuid::new_v4().to_string(),
        kind: "backup".into(),
        status: if status == "available" {
            "healthy".into()
        } else if status == "partial" {
            "warning".into()
        } else {
            "error".into()
        },
        title: title.into(),
        subject: world.display_name.clone(),
        detail: Some(format!(
            "{} files · {} bytes · {} destination(s) succeeded",
            file_count, source_size, successful
        )),
        world_id: Some(world.id.clone()),
        root_id: Some(root.id),
        snapshot_id: Some(snapshot_id),
        destination_id: None,
        created_at,
    };
    database.add_activity(&event)?;
    report("done", archive_size, archive_size, title.into());
    if successful == 0 {
        Err("Backup failed at every destination".into())
    } else {
        Ok(snapshot)
    }
}

fn archive_world<F>(world: &Path, target: &Path, total: u64, progress: F) -> Result<(), String>
where
    F: Fn(u64),
{
    let root = fs::canonicalize(world).map_err(|error| error.to_string())?;
    let output = fs::File::create(target).map_err(|error| error.to_string())?;
    let mut zip = ZipWriter::new(output);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);
    let mut done = 0u64;
    let mut buffer = vec![0u8; 1024 * 128];
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
        let name = entry
            .path()
            .strip_prefix(&root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        if metadata.is_dir() {
            zip.add_directory(format!("{name}/"), options)
                .map_err(|error| error.to_string())?;
            continue;
        }
        zip.start_file(name, options)
            .map_err(|error| error.to_string())?;
        let mut input = fs::File::open(entry.path()).map_err(|error| error.to_string())?;
        loop {
            let read = input.read(&mut buffer).map_err(|error| error.to_string())?;
            if read == 0 {
                break;
            }
            zip.write_all(&buffer[..read])
                .map_err(|error| error.to_string())?;
            done += read as u64;
            progress(done.min(total));
        }
    }
    let output = zip.finish().map_err(|error| error.to_string())?;
    output.sync_all().map_err(|error| error.to_string())
}

fn write_replica<F>(
    archive: &Path,
    manifest: &Manifest,
    destination: &StorageDestination,
    root_id: &str,
    world_id: &str,
    snapshot_id: &str,
    progress: F,
) -> Result<PathBuf, String>
where
    F: Fn(u64),
{
    let directory = Path::new(&destination.path)
        .join("Mnemo")
        .join("minecraft-java")
        .join(root_id)
        .join(world_id)
        .join(snapshot_id);
    let archive_final = directory.join("world.zip");
    let archive_part = directory.join("world.zip.part");
    let manifest_final = directory.join("manifest.json");
    let manifest_part = directory.join("manifest.json.part");
    let mut last_error = String::new();
    for attempt in 0..3 {
        let result = (|| -> Result<(), String> {
            fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
            let mut input = fs::File::open(archive).map_err(|error| error.to_string())?;
            let mut output = fs::File::create(&archive_part).map_err(|error| error.to_string())?;
            let mut buffer = vec![0u8; 1024 * 128];
            let mut done = 0u64;
            loop {
                let read = input.read(&mut buffer).map_err(|error| error.to_string())?;
                if read == 0 {
                    break;
                }
                output
                    .write_all(&buffer[..read])
                    .map_err(|error| error.to_string())?;
                done += read as u64;
                progress(done);
            }
            output.sync_all().map_err(|error| error.to_string())?;
            fs::rename(&archive_part, &archive_final).map_err(|error| error.to_string())?;
            let mut manifest_file =
                fs::File::create(&manifest_part).map_err(|error| error.to_string())?;
            manifest_file
                .write_all(&serde_json::to_vec_pretty(manifest).map_err(|error| error.to_string())?)
                .map_err(|error| error.to_string())?;
            manifest_file
                .sync_all()
                .map_err(|error| error.to_string())?;
            fs::rename(&manifest_part, &manifest_final).map_err(|error| error.to_string())?;
            Ok(())
        })();
        match result {
            Ok(()) => return Ok(directory),
            Err(error) => {
                last_error = error;
                let _ = fs::remove_file(&archive_part);
                let _ = fs::remove_file(&manifest_part);
                let _ = fs::remove_file(&archive_final);
                let _ = fs::remove_file(&manifest_final);
                if attempt < 2 {
                    thread::sleep(StdDuration::from_millis(250 * (attempt + 1)));
                }
            }
        }
    }
    Err(last_error)
}

pub fn checksum_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = vec![0u8; 128 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(hex::encode(digest.finalize()))
}

pub fn verify_replica(
    database: &Database,
    snapshot_id: &str,
    destination_id: Option<&str>,
) -> Result<Snapshot, String> {
    let mut snapshot = database
        .snapshot(snapshot_id)?
        .ok_or("Snapshot not found")?;
    let mut verified_any = false;
    let expected = snapshot.clone();
    for replica in &mut snapshot.replicas {
        if destination_id.is_some_and(|id| id != replica.destination_id) {
            continue;
        }
        let result = verify_replica_files(replica, &expected);
        match result {
            Ok(()) => {
                replica.status = "verified".into();
                replica.verified_at = Some(Utc::now().to_rfc3339());
                replica.error = None;
                verified_any = true;
            }
            Err(error) => {
                replica.status = if Path::new(&replica.path).exists() {
                    "corrupt".into()
                } else {
                    "missing".into()
                };
                replica.error = Some(error);
            }
        }
        database.upsert_replica(replica)?;
    }
    if !verified_any {
        return Err("No healthy replica passed verification".into());
    }
    snapshot.status = if snapshot
        .replicas
        .iter()
        .all(|r| r.status == "verified" || r.status == "available")
    {
        "verified".into()
    } else {
        "partial".into()
    };
    database.upsert_snapshot(&snapshot)?;
    Ok(snapshot)
}

fn verify_replica_files(replica: &SnapshotReplica, snapshot: &Snapshot) -> Result<(), String> {
    let directory = Path::new(&replica.path);
    let archive_path = directory.join("world.zip");
    let manifest_path = directory.join("manifest.json");
    let manifest: Manifest =
        serde_json::from_slice(&fs::read(manifest_path).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    if manifest.format_version != 1 || manifest.snapshot_id != snapshot.id {
        return Err("Manifest is incompatible with this snapshot".into());
    }
    if checksum_file(&archive_path)? != snapshot.checksum {
        return Err("Archive checksum does not match".into());
    }
    let mut archive =
        ZipArchive::new(fs::File::open(archive_path).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    let mut has_level = false;
    let mut sink = io::sink();
    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(|error| error.to_string())?;
        let enclosed = file
            .enclosed_name()
            .ok_or("Archive contains an unsafe path")?;
        if file
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("Archive contains an unsafe symbolic link".into());
        }
        if enclosed == Path::new("level.dat") {
            has_level = true;
        }
        io::copy(&mut file, &mut sink).map_err(|error| error.to_string())?;
    }
    if !has_level {
        return Err("Archive does not contain a root level.dat".into());
    }
    Ok(())
}

pub fn retry_replica(
    database: &Database,
    snapshot_id: &str,
    destination_id: &str,
) -> Result<Snapshot, String> {
    let snapshot = database
        .snapshot(snapshot_id)?
        .ok_or("Snapshot not found")?;
    let source = snapshot
        .replicas
        .iter()
        .find(|r| {
            (r.status == "available" || r.status == "verified")
                && Path::new(&r.path).join("world.zip").is_file()
        })
        .ok_or("No healthy replica is available to copy")?;
    let destination = database
        .destination(destination_id)?
        .ok_or("Destination not found")?;
    let world = database
        .world(&snapshot.world_id)?
        .ok_or("World not found")?;
    let root = database
        .root(&world.root_id)?
        .ok_or("Save folder not found")?;
    let manifest: Manifest = serde_json::from_slice(
        &fs::read(Path::new(&source.path).join("manifest.json"))
            .map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    let path = write_replica(
        &Path::new(&source.path).join("world.zip"),
        &manifest,
        &destination,
        &root.id,
        &world.id,
        &snapshot.id,
        |_| {},
    )?;
    let replica = SnapshotReplica {
        id: Uuid::new_v4().to_string(),
        snapshot_id: snapshot.id.clone(),
        destination_id: destination.id,
        path: path.to_string_lossy().to_string(),
        stored_size: snapshot.archive_size,
        status: "available".into(),
        checksum: Some(snapshot.checksum.clone()),
        error: None,
        verified_at: None,
    };
    database.upsert_replica(&replica)?;
    database
        .snapshot(snapshot_id)?
        .ok_or("Snapshot disappeared".into())
}

pub fn restore_snapshot<F>(
    database: &Database,
    staging_root: &Path,
    snapshot_id: &str,
    alternate_root_id: Option<&str>,
    progress: F,
) -> Result<(), String>
where
    F: Fn(OperationProgress),
{
    let snapshot = database
        .snapshot(snapshot_id)?
        .ok_or("Snapshot not found")?;
    let world = database
        .world(&snapshot.world_id)?
        .ok_or("World not found")?;
    let settings: MinecraftSettings = database.setting("minecraft")?.unwrap_or_default();
    let root = if let Some(id) = alternate_root_id {
        database
            .root(id)?
            .ok_or("Selected save folder was not found")?
    } else {
        database
            .root(&world.root_id)?
            .ok_or("Original save folder was not found")?
    };
    if !Path::new(&root.path).is_dir() {
        return Err("Choose an available save folder for this restore".into());
    }
    let target = if world.missing || alternate_root_id.is_some() {
        Path::new(&root.path).join(&world.folder_name)
    } else {
        PathBuf::from(&world.path)
    };
    if settings.require_minecraft_closed && world_is_active(&target)? {
        return Err("Close Minecraft before restoring this world".into());
    }
    if target.exists() && settings.safety_backup_before_restore {
        create_snapshot(database, staging_root, &world.id, "safety", |_| {})?;
    }
    let replica = snapshot
        .replicas
        .iter()
        .find(|r| {
            (r.status == "available" || r.status == "verified")
                && Path::new(&r.path).join("world.zip").is_file()
        })
        .ok_or("No available replica can be restored")?;
    verify_replica_files(replica, &snapshot)?;
    let operation_id = Uuid::new_v4().to_string();
    let report = |stage: &str, msg: &str| {
        progress(OperationProgress {
            operation_id: operation_id.clone(),
            world_id: Some(world.id.clone()),
            kind: "restore".into(),
            stage: stage.into(),
            bytes_done: 0,
            bytes_total: snapshot.archive_size,
            message: msg.into(),
        })
    };
    report("preparing", "Preparing restore");
    let parent = target.parent().ok_or("World has no parent folder")?;
    let temp = parent.join(format!(".mnemo-restore-{}", Uuid::new_v4()));
    fs::create_dir_all(&temp).map_err(|error| error.to_string())?;
    let result = (|| -> Result<(), String> {
        let mut archive = ZipArchive::new(
            fs::File::open(Path::new(&replica.path).join("world.zip"))
                .map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
        for index in 0..archive.len() {
            let mut file = archive.by_index(index).map_err(|error| error.to_string())?;
            let relative = file
                .enclosed_name()
                .ok_or("Archive contains an unsafe path")?
                .to_path_buf();
            if file
                .unix_mode()
                .is_some_and(|mode| mode & 0o170000 == 0o120000)
            {
                return Err("Archive contains an unsafe symbolic link".into());
            }
            let output = temp.join(relative);
            if file.is_dir() {
                fs::create_dir_all(&output).map_err(|error| error.to_string())?;
            } else {
                if let Some(parent) = output.parent() {
                    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
                }
                let mut out = fs::File::create(&output).map_err(|error| error.to_string())?;
                io::copy(&mut file, &mut out).map_err(|error| error.to_string())?;
            }
        }
        if !temp.join("level.dat").is_file() {
            return Err("Restored archive is not a Minecraft world".into());
        }
        let rollback = parent.join(format!(
            ".{}-mnemo-rollback-{}",
            world.folder_name,
            Uuid::new_v4()
        ));
        let had_target = target.exists();
        if had_target {
            fs::rename(&target, &rollback)
                .map_err(|error| format!("Could not preserve current world: {error}"))?;
        }
        if let Err(error) = fs::rename(&temp, &target) {
            if had_target {
                let _ = fs::rename(&rollback, &target);
            }
            return Err(format!("Could not install restored world: {error}"));
        }
        if had_target {
            let _ = fs::remove_dir_all(&rollback);
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(&temp);
    }
    result?;
    let event = ActivityEvent {
        id: Uuid::new_v4().to_string(),
        kind: "restore".into(),
        status: "healthy".into(),
        title: "Restore completed".into(),
        subject: world.display_name.clone(),
        detail: Some(target.to_string_lossy().to_string()),
        world_id: Some(world.id.clone()),
        root_id: Some(root.id),
        snapshot_id: Some(snapshot.id),
        destination_id: Some(replica.destination_id.clone()),
        created_at: Utc::now().to_rfc3339(),
    };
    database.add_activity(&event)?;
    report("done", "Restore completed");
    Ok(())
}

fn world_is_active(world: &Path) -> Result<bool, String> {
    let lock = world.join("session.lock");
    if !lock.exists() {
        return Ok(false);
    }
    match fs::OpenOptions::new().read(true).write(true).open(lock) {
        Ok(file) => match file.try_lock_exclusive() {
            Ok(()) => {
                let _ = file.unlock();
                Ok(false)
            }
            Err(_) => Ok(true),
        },
        Err(_) => Ok(true),
    }
}

fn apply_retention(database: &Database, world: &MinecraftWorld) -> Result<(), String> {
    let policy = &world.effective_policy.retention;
    if policy.kind == RetentionKind::KeepAll {
        return Ok(());
    }
    let snapshots = database.snapshots_for_world(&world.id)?;
    let cutoff = Utc::now() - Duration::days(policy.value.unwrap_or(0) as i64);
    for (index, snapshot) in snapshots.iter().enumerate() {
        let remove = match policy.kind {
            RetentionKind::Count => index >= policy.value.unwrap_or(10) as usize,
            RetentionKind::AgeDays => chrono::DateTime::parse_from_rfc3339(&snapshot.created_at)
                .map(|date| date.with_timezone(&Utc) < cutoff)
                .unwrap_or(false),
            RetentionKind::KeepAll => false,
        };
        if !remove || snapshot.status == "in_flight" || snapshot.mode == "restore" {
            continue;
        }
        let mut removed = true;
        for replica in &snapshot.replicas {
            if !replica.path.is_empty()
                && Path::new(&replica.path).exists()
                && fs::remove_dir_all(&replica.path).is_err()
            {
                removed = false;
            }
        }
        if removed {
            database.delete_snapshot_record(&snapshot.id)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn traversal_is_rejected_by_zip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bad.zip");
        let file = fs::File::create(&path).unwrap();
        let mut zip = ZipWriter::new(file);
        zip.start_file("../bad", SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"bad").unwrap();
        zip.finish().unwrap();
        let mut archive = ZipArchive::new(fs::File::open(path).unwrap()).unwrap();
        assert!(archive.by_index(0).unwrap().enclosed_name().is_none());
    }
    #[test]
    fn manifest_version_round_trips() {
        let manifest = Manifest {
            format_version: 1,
            snapshot_id: "snapshot".into(),
            created_at: "2026-01-01T00:00:00Z".into(),
            game: "minecraft-java".into(),
            save_root_id: "root".into(),
            world_id: "world".into(),
            world_folder: "Survival".into(),
            world_display_name: "Survival".into(),
            source_path: "saves/Survival".into(),
            minecraft_version: Some("1.21.4".into()),
            data_version: Some(3953),
            file_count: 2,
            source_size: 100,
            archive_size: 80,
            checksum: "checksum".into(),
            fingerprint: "fingerprint".into(),
            mnemo_version: "0.1.0".into(),
            requested_destinations: vec!["local".into()],
        };
        let encoded = serde_json::to_vec(&manifest).unwrap();
        let decoded: Manifest = serde_json::from_slice(&encoded).unwrap();
        assert_eq!(decoded.format_version, 1);
        assert_eq!(decoded.game, "minecraft-java");
    }
}
