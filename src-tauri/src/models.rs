use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTarget {
    pub id: String,
    pub game_id: String,
    pub name: String,
    pub source_path: String,
    pub enabled: bool,
    pub provider_ids: Vec<String>,
    pub last_backup: Option<String>,
    pub status: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSnapshot {
    pub id: String,
    pub game_id: String,
    pub save_target_id: String,
    pub timestamp: String,
    pub provider_id: String,
    pub snapshot_path: String,
    pub size: u64,
    pub file_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupProvider {
    pub id: String,
    pub provider_type: String,
    pub name: String,
    pub destination: String,
    pub connected: bool,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameDefinition {
    pub id: String,
    pub name: String,
    pub launcher: String,
    pub save_detection: SaveDetection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDetection {
    #[serde(rename = "type")]
    pub detection_type: String,
    pub root: String,
    pub pattern: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedGame {
    pub id: String,
    pub name: String,
    pub launcher: String,
    pub save_targets: Vec<SaveTarget>,
}
