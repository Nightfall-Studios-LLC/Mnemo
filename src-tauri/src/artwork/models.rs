use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    #[allow(dead_code)]
    pub errors: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RemoteGame {
    pub id: u64,
    pub name: String,
    #[serde(default)]
    pub verified: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RemoteArtwork {
    pub id: u64,
    pub url: String,
    #[serde(default)]
    pub score: i64,
    #[serde(default)]
    pub upvotes: i64,
    #[serde(default)]
    pub downvotes: i64,
    #[serde(default)]
    pub width: u32,
    #[serde(default)]
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtworkCacheMetadata {
    pub provider: String,
    pub source_url: String,
    pub fetched_timestamp: String,
    pub game_id: String,
    pub artwork_id: String,
    pub file_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtworkResult {
    pub local_path: Option<String>,
    pub source: String,
    pub remote_id: Option<String>,
    pub status: String,
}
