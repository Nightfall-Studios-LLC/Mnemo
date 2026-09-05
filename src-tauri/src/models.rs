use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PolicyMode {
    Manual,
    OnChange,
    Interval,
    Both,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RetentionKind {
    KeepAll,
    Count,
    AgeDays,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionPolicy {
    pub kind: RetentionKind,
    pub value: Option<u32>,
}

impl Default for RetentionPolicy {
    fn default() -> Self {
        Self {
            kind: RetentionKind::KeepAll,
            value: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupPolicy {
    pub automatic: bool,
    pub mode: PolicyMode,
    pub interval_minutes: u32,
    pub debounce_seconds: u32,
    pub skip_unchanged: bool,
    pub destination_ids: Vec<String>,
    pub retention: RetentionPolicy,
}

impl Default for BackupPolicy {
    fn default() -> Self {
        Self {
            automatic: true,
            mode: PolicyMode::Both,
            interval_minutes: 30,
            debounce_seconds: 30,
            skip_unchanged: true,
            destination_ids: Vec::new(),
            retention: RetentionPolicy::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalSettings {
    pub launch_at_startup: bool,
    pub notify_failures: bool,
    pub notify_manual_completions: bool,
    pub interface_motion: bool,
}

impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            launch_at_startup: false,
            notify_failures: true,
            notify_manual_completions: true,
            interface_motion: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftSettings {
    pub default_policy: BackupPolicy,
    pub watch_save_folders: bool,
    pub protect_new_worlds: bool,
    pub safety_backup_before_restore: bool,
    pub require_minecraft_closed: bool,
}

impl Default for MinecraftSettings {
    fn default() -> Self {
        Self {
            default_policy: BackupPolicy::default(),
            watch_save_folders: true,
            protect_new_worlds: true,
            safety_backup_before_restore: true,
            require_minecraft_closed: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorldMetadata {
    pub level_name: Option<String>,
    pub last_played: Option<i64>,
    pub game_mode: Option<String>,
    pub hardcore: Option<bool>,
    pub difficulty: Option<String>,
    pub version_name: Option<String>,
    pub data_version: Option<i32>,
    pub parse_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftSaveRoot {
    pub id: String,
    pub name: String,
    pub path: String,
    pub source_type: String,
    pub enabled: bool,
    pub auto_detect_worlds: bool,
    pub protect_new_worlds: bool,
    pub created_at: String,
    pub last_scan_at: Option<String>,
    pub status: String,
    pub policy_override: Option<BackupPolicy>,
    pub effective_policy: BackupPolicy,
    pub world_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftWorld {
    pub id: String,
    pub root_id: String,
    pub folder_name: String,
    pub display_name: String,
    pub path: String,
    pub normalized_path: String,
    pub missing: bool,
    pub excluded: bool,
    pub metadata: WorldMetadata,
    pub metadata_fingerprint: String,
    pub current_fingerprint: Option<String>,
    pub last_successful_fingerprint: Option<String>,
    pub policy_override: Option<BackupPolicy>,
    pub effective_policy: BackupPolicy,
    pub policy_inherited_from: String,
    pub protection_status: String,
    pub last_backup_at: Option<String>,
    pub icon_revision: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DestinationType {
    Local,
    Nas,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageDestination {
    pub id: String,
    pub name: String,
    pub path: String,
    pub destination_type: DestinationType,
    pub enabled: bool,
    pub is_default: bool,
    pub health: String,
    pub health_message: Option<String>,
    pub last_checked_at: Option<String>,
    pub available_bytes: Option<u64>,
    pub stored_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotReplica {
    pub id: String,
    pub snapshot_id: String,
    pub destination_id: String,
    pub path: String,
    pub stored_size: u64,
    pub status: String,
    pub checksum: Option<String>,
    pub error: Option<String>,
    pub verified_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: String,
    pub world_id: String,
    pub created_at: String,
    pub mode: String,
    pub status: String,
    pub fingerprint: String,
    pub file_count: u64,
    pub source_size: u64,
    pub archive_size: u64,
    pub checksum: String,
    pub replicas: Vec<SnapshotReplica>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: String,
    pub kind: String,
    pub status: String,
    pub title: String,
    pub subject: String,
    pub detail: Option<String>,
    pub world_id: Option<String>,
    pub root_id: Option<String>,
    pub snapshot_id: Option<String>,
    pub destination_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationProgress {
    pub operation_id: String,
    pub world_id: Option<String>,
    pub kind: String,
    pub stage: String,
    pub bytes_done: u64,
    pub bytes_total: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtectionSummary {
    pub status: String,
    pub label: String,
    pub protected_worlds: u32,
    pub total_worlds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftState {
    pub backend_available: bool,
    pub roots: Vec<MinecraftSaveRoot>,
    pub worlds: Vec<MinecraftWorld>,
    pub destinations: Vec<StorageDestination>,
    pub snapshots: Vec<Snapshot>,
    pub activity: Vec<ActivityEvent>,
    pub operations: Vec<OperationProgress>,
    pub global_settings: GlobalSettings,
    pub minecraft_settings: MinecraftSettings,
    pub protection: ProtectionSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RootInspection {
    pub resolved_path: String,
    pub suggested_name: String,
    pub source_type: String,
    pub world_count: u32,
    pub duplicate_root_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldThumbnail {
    pub bytes: Vec<u8>,
    pub revision: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRootRequest {
    pub path: String,
    pub name: String,
    pub enabled: bool,
    pub protect_new_worlds: bool,
    pub policy: BackupPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DestinationRequest {
    pub name: String,
    pub path: String,
    pub destination_type: DestinationType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub format_version: u32,
    pub snapshot_id: String,
    pub created_at: String,
    pub game: String,
    pub save_root_id: String,
    pub world_id: String,
    pub world_folder: String,
    pub world_display_name: String,
    pub source_path: String,
    pub minecraft_version: Option<String>,
    pub data_version: Option<i32>,
    pub file_count: u64,
    pub source_size: u64,
    pub archive_size: u64,
    pub checksum: String,
    pub fingerprint: String,
    pub mnemo_version: String,
    pub requested_destinations: Vec<String>,
}
