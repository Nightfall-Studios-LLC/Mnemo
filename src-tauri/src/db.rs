use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{de::DeserializeOwned, Serialize};
use std::{path::Path, sync::Mutex};

pub struct Database {
    connection: Mutex<Connection>,
}

fn json<T: Serialize>(value: &T) -> Result<String, String> {
    serde_json::to_string(value).map_err(|error| error.to_string())
}
fn parse<T: DeserializeOwned>(value: String) -> Result<T, String> {
    serde_json::from_str(&value).map_err(|error| error.to_string())
}

impl Database {
    pub fn open(path: &Path) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let mut connection = Connection::open(path).map_err(|error| error.to_string())?;
        connection
            .pragma_update(None, "journal_mode", "WAL")
            .map_err(|error| error.to_string())?;
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .map_err(|error| error.to_string())?;
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;
        if version < 1 {
            let transaction = connection
                .transaction()
                .map_err(|error| error.to_string())?;
            transaction
                .execute_batch(
                    r#"
                CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
                CREATE TABLE save_roots (
                    id TEXT PRIMARY KEY,
                    normalized_path TEXT NOT NULL UNIQUE,
                    value_json TEXT NOT NULL
                );
                CREATE TABLE worlds (
                    id TEXT PRIMARY KEY,
                    root_id TEXT NOT NULL,
                    normalized_path TEXT NOT NULL,
                    value_json TEXT NOT NULL,
                    UNIQUE(root_id, normalized_path)
                );
                CREATE INDEX worlds_root_idx ON worlds(root_id);
                CREATE TABLE destinations (
                    id TEXT PRIMARY KEY,
                    normalized_path TEXT NOT NULL UNIQUE,
                    value_json TEXT NOT NULL
                );
                CREATE TABLE snapshots (
                    id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    value_json TEXT NOT NULL
                );
                CREATE INDEX snapshots_world_idx ON snapshots(world_id, created_at DESC);
                CREATE TABLE replicas (
                    id TEXT PRIMARY KEY,
                    snapshot_id TEXT NOT NULL,
                    destination_id TEXT NOT NULL,
                    value_json TEXT NOT NULL,
                    UNIQUE(snapshot_id, destination_id)
                );
                CREATE INDEX replicas_snapshot_idx ON replicas(snapshot_id);
                CREATE TABLE activity (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    value_json TEXT NOT NULL
                );
                CREATE INDEX activity_created_idx ON activity(created_at DESC);
                CREATE TABLE scheduler_state (
                    world_id TEXT PRIMARY KEY,
                    last_evaluated_at TEXT,
                    pending_change_at TEXT,
                    last_error TEXT
                );
                PRAGMA user_version = 1;
            "#,
                )
                .map_err(|error| error.to_string())?;
            transaction.commit().map_err(|error| error.to_string())?;
        }
        let database = Self {
            connection: Mutex::new(connection),
        };
        if database.setting::<GlobalSettings>("global")?.is_none() {
            database.set_setting("global", &GlobalSettings::default())?;
        }
        if database
            .setting::<MinecraftSettings>("minecraft")?
            .is_none()
        {
            database.set_setting("minecraft", &MinecraftSettings::default())?;
        }
        Ok(database)
    }

    pub fn setting<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let value: Option<String> = connection
            .query_row(
                "SELECT value_json FROM settings WHERE key=?1",
                [key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        value.map(parse).transpose()
    }

    pub fn set_setting<T: Serialize>(&self, key: &str, value: &T) -> Result<(), String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        connection.execute("INSERT INTO settings(key,value_json) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json", params![key, json(value)?]).map_err(|error| error.to_string())?;
        Ok(())
    }

    pub fn roots(&self) -> Result<Vec<MinecraftSaveRoot>, String> {
        self.list("SELECT value_json FROM save_roots ORDER BY rowid")
    }
    pub fn root(&self, id: &str) -> Result<Option<MinecraftSaveRoot>, String> {
        self.one("SELECT value_json FROM save_roots WHERE id=?1", id)
    }
    pub fn root_by_path(&self, normalized: &str) -> Result<Option<MinecraftSaveRoot>, String> {
        self.one(
            "SELECT value_json FROM save_roots WHERE normalized_path=?1",
            normalized,
        )
    }
    pub fn upsert_root(&self, root: &MinecraftSaveRoot, normalized: &str) -> Result<(), String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        connection.execute("INSERT INTO save_roots(id,normalized_path,value_json) VALUES(?1,?2,?3) ON CONFLICT(id) DO UPDATE SET normalized_path=excluded.normalized_path,value_json=excluded.value_json", params![root.id, normalized, json(root)?]).map_err(|error| error.to_string())?;
        Ok(())
    }
    pub fn delete_root(&self, id: &str) -> Result<(), String> {
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;
        transaction
            .execute("DELETE FROM worlds WHERE root_id=?1", [id])
            .map_err(|error| error.to_string())?;
        transaction
            .execute("DELETE FROM save_roots WHERE id=?1", [id])
            .map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())
    }

    pub fn worlds(&self) -> Result<Vec<MinecraftWorld>, String> {
        self.list("SELECT value_json FROM worlds ORDER BY rowid")
    }
    pub fn worlds_for_root(&self, root_id: &str) -> Result<Vec<MinecraftWorld>, String> {
        self.list_param(
            "SELECT value_json FROM worlds WHERE root_id=?1 ORDER BY rowid",
            root_id,
        )
    }
    pub fn world(&self, id: &str) -> Result<Option<MinecraftWorld>, String> {
        self.one("SELECT value_json FROM worlds WHERE id=?1", id)
    }
    pub fn upsert_world(&self, world: &MinecraftWorld) -> Result<(), String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        connection.execute("INSERT INTO worlds(id,root_id,normalized_path,value_json) VALUES(?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET root_id=excluded.root_id,normalized_path=excluded.normalized_path,value_json=excluded.value_json", params![world.id, world.root_id, world.normalized_path, json(world)?]).map_err(|error| error.to_string())?;
        Ok(())
    }
    pub fn delete_world(&self, id: &str) -> Result<(), String> {
        self.connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?
            .execute("DELETE FROM worlds WHERE id=?1", [id])
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    pub fn destinations(&self) -> Result<Vec<StorageDestination>, String> {
        self.list("SELECT value_json FROM destinations ORDER BY rowid")
    }
    pub fn destination(&self, id: &str) -> Result<Option<StorageDestination>, String> {
        self.one("SELECT value_json FROM destinations WHERE id=?1", id)
    }
    pub fn destination_by_path(
        &self,
        normalized: &str,
    ) -> Result<Option<StorageDestination>, String> {
        self.one(
            "SELECT value_json FROM destinations WHERE normalized_path=?1",
            normalized,
        )
    }
    pub fn upsert_destination(
        &self,
        destination: &StorageDestination,
        normalized: &str,
    ) -> Result<(), String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        connection.execute("INSERT INTO destinations(id,normalized_path,value_json) VALUES(?1,?2,?3) ON CONFLICT(id) DO UPDATE SET normalized_path=excluded.normalized_path,value_json=excluded.value_json", params![destination.id, normalized, json(destination)?]).map_err(|error| error.to_string())?;
        Ok(())
    }
    pub fn delete_destination(&self, id: &str) -> Result<(), String> {
        self.connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?
            .execute("DELETE FROM destinations WHERE id=?1", [id])
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    pub fn snapshots(&self) -> Result<Vec<Snapshot>, String> {
        let mut snapshots: Vec<Snapshot> =
            self.list("SELECT value_json FROM snapshots ORDER BY created_at DESC")?;
        for snapshot in &mut snapshots {
            snapshot.replicas = self.replicas_for_snapshot(&snapshot.id)?;
        }
        Ok(snapshots)
    }
    pub fn snapshots_for_world(&self, world_id: &str) -> Result<Vec<Snapshot>, String> {
        let mut snapshots: Vec<Snapshot> = self.list_param(
            "SELECT value_json FROM snapshots WHERE world_id=?1 ORDER BY created_at DESC",
            world_id,
        )?;
        for snapshot in &mut snapshots {
            snapshot.replicas = self.replicas_for_snapshot(&snapshot.id)?;
        }
        Ok(snapshots)
    }
    pub fn snapshot(&self, id: &str) -> Result<Option<Snapshot>, String> {
        let mut snapshot: Option<Snapshot> =
            self.one("SELECT value_json FROM snapshots WHERE id=?1", id)?;
        if let Some(value) = &mut snapshot {
            value.replicas = self.replicas_for_snapshot(id)?;
        }
        Ok(snapshot)
    }
    pub fn upsert_snapshot(&self, snapshot: &Snapshot) -> Result<(), String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let mut stored = snapshot.clone();
        stored.replicas.clear();
        connection.execute("INSERT INTO snapshots(id,world_id,created_at,value_json) VALUES(?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json", params![stored.id, stored.world_id, stored.created_at, json(&stored)?]).map_err(|error| error.to_string())?;
        Ok(())
    }
    pub fn upsert_replica(&self, replica: &SnapshotReplica) -> Result<(), String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        connection.execute("INSERT INTO replicas(id,snapshot_id,destination_id,value_json) VALUES(?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json", params![replica.id, replica.snapshot_id, replica.destination_id, json(replica)?]).map_err(|error| error.to_string())?;
        Ok(())
    }
    pub fn replicas_for_snapshot(&self, snapshot_id: &str) -> Result<Vec<SnapshotReplica>, String> {
        self.list_param(
            "SELECT value_json FROM replicas WHERE snapshot_id=?1 ORDER BY rowid",
            snapshot_id,
        )
    }
    pub fn delete_snapshot_record(&self, id: &str) -> Result<(), String> {
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;
        transaction
            .execute("DELETE FROM replicas WHERE snapshot_id=?1", [id])
            .map_err(|error| error.to_string())?;
        transaction
            .execute("DELETE FROM snapshots WHERE id=?1", [id])
            .map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())
    }

    pub fn activity(&self, limit: usize) -> Result<Vec<ActivityEvent>, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let mut statement = connection
            .prepare("SELECT value_json FROM activity ORDER BY created_at DESC LIMIT ?1")
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map([limit as i64], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?;
        rows.map(|row| row.map_err(|error| error.to_string()).and_then(parse))
            .collect()
    }
    pub fn add_activity(&self, event: &ActivityEvent) -> Result<(), String> {
        self.connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?
            .execute(
                "INSERT OR REPLACE INTO activity(id,created_at,value_json) VALUES(?1,?2,?3)",
                params![event.id, event.created_at, json(event)?],
            )
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    pub fn scheduler_state(
        &self,
        world_id: &str,
    ) -> Result<(Option<String>, Option<String>), String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        connection
            .query_row(
                "SELECT last_evaluated_at,pending_change_at FROM scheduler_state WHERE world_id=?1",
                [world_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|error| error.to_string())
            .map(|value| value.unwrap_or((None, None)))
    }
    pub fn set_scheduler_state(
        &self,
        world_id: &str,
        evaluated: Option<&str>,
        pending: Option<&str>,
        error: Option<&str>,
    ) -> Result<(), String> {
        self.connection.lock().map_err(|_| "Database lock is poisoned".to_string())?.execute("INSERT INTO scheduler_state(world_id,last_evaluated_at,pending_change_at,last_error) VALUES(?1,?2,?3,?4) ON CONFLICT(world_id) DO UPDATE SET last_evaluated_at=COALESCE(excluded.last_evaluated_at,scheduler_state.last_evaluated_at),pending_change_at=excluded.pending_change_at,last_error=excluded.last_error", params![world_id,evaluated,pending,error]).map_err(|error| error.to_string())?;
        Ok(())
    }

    fn list<T: DeserializeOwned>(&self, sql: &str) -> Result<Vec<T>, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let mut statement = connection.prepare(sql).map_err(|error| error.to_string())?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?;
        rows.map(|row| row.map_err(|error| error.to_string()).and_then(parse))
            .collect()
    }
    fn list_param<T: DeserializeOwned>(
        &self,
        sql: &str,
        parameter: &str,
    ) -> Result<Vec<T>, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let mut statement = connection.prepare(sql).map_err(|error| error.to_string())?;
        let rows = statement
            .query_map([parameter], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?;
        rows.map(|row| row.map_err(|error| error.to_string()).and_then(parse))
            .collect()
    }
    fn one<T: DeserializeOwned>(&self, sql: &str, parameter: &str) -> Result<Option<T>, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Database lock is poisoned".to_string())?;
        let value: Option<String> = connection
            .query_row(sql, [parameter], |row| row.get(0))
            .optional()
            .map_err(|error| error.to_string())?;
        value.map(parse).transpose()
    }
}
