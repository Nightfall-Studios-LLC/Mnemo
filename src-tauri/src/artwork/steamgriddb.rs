use super::models::{ApiResponse, RemoteArtwork, RemoteGame};
use async_trait::async_trait;
use reqwest::{header, Client};

#[async_trait]
pub trait ArtworkProvider {
    async fn search_game(&self, name: &str) -> Result<Option<RemoteGame>, String>;
    async fn get_grid(&self, game_id: u64, steam_app_id: Option<u64>) -> Result<Option<RemoteArtwork>, String>;
    fn provider_name(&self) -> &'static str;
}

pub struct SteamGridDbArtworkProvider {
    client: Client,
}

impl SteamGridDbArtworkProvider {
    pub fn new(api_key: &str) -> Result<Self, String> {
        let mut headers = header::HeaderMap::new();
        let value = header::HeaderValue::from_str(&format!("Bearer {api_key}"))
            .map_err(|_| "Invalid SteamGridDB API key".to_string())?;
        headers.insert(header::AUTHORIZATION, value);
        let client = Client::builder()
            .default_headers(headers)
            .user_agent("Mnemo/0.1")
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self { client })
    }

    async fn get<T: serde::de::DeserializeOwned>(&self, url: &str) -> Result<T, String> {
        let response = self.client.get(url).send().await.map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            return Err(format!("SteamGridDB returned {}", response.status()));
        }
        let envelope: ApiResponse<T> = response.json().await.map_err(|e| e.to_string())?;
        if !envelope.success { return Err("SteamGridDB request was not successful".into()); }
        envelope.data.ok_or_else(|| "SteamGridDB returned no data".into())
    }
}

#[async_trait]
impl ArtworkProvider for SteamGridDbArtworkProvider {
    async fn search_game(&self, name: &str) -> Result<Option<RemoteGame>, String> {
        let url = format!("https://www.steamgriddb.com/api/v2/search/autocomplete/{}", urlencoding::encode(name));
        let matches: Vec<RemoteGame> = self.get(&url).await?;
        let wanted = normalize_title(name);
        Ok(matches.into_iter().filter(|game| normalize_title(&game.name) == wanted)
            .max_by_key(|game| game.verified))
    }

    async fn get_grid(&self, game_id: u64, steam_app_id: Option<u64>) -> Result<Option<RemoteArtwork>, String> {
        let (kind, id) = steam_app_id.map(|id| ("steam", id)).unwrap_or(("game", game_id));
        let url = format!("https://www.steamgriddb.com/api/v2/grids/{kind}/{id}?dimensions=460x215,920x430&types=static&nsfw=false&humor=false");
        let images: Vec<RemoteArtwork> = self.get(&url).await?;
        Ok(images.into_iter().filter(|image| image.width == 0 || image.width > image.height)
            .max_by_key(|image| (image.score, image.upvotes - image.downvotes)))
    }

    fn provider_name(&self) -> &'static str { "steamgriddb" }
}

fn normalize_title(value: &str) -> String {
    value.chars().filter(|c| c.is_alphanumeric()).flat_map(char::to_lowercase).collect()
}

#[cfg(test)]
mod tests {
    use super::normalize_title;
    #[test]
    fn normalizes_titles_deterministically() {
        assert_eq!(normalize_title("Baldur's Gate 3"), normalize_title("Baldurs Gate 3"));
    }
}
