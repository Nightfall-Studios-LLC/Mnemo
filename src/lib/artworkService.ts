import { invoke } from "@tauri-apps/api/core";
import type { ArtworkMetadata } from "../types";

export interface ArtworkResult {
  localPath?: string;
  source: ArtworkMetadata["source"];
  remoteId?: string;
  status: string;
}

export interface ArtworkRequest {
  gameId: string;
  gameName: string;
  steamAppId?: number;
  existingLocalPath?: string;
}

export interface ArtworkProvider {
  getGrid(request: ArtworkRequest): Promise<ArtworkResult>;
}

class TauriArtworkProvider implements ArtworkProvider {
  getGrid(request: ArtworkRequest) {
    return invoke<ArtworkResult>("get_game_artwork", { ...request });
  }
}

class ArtworkService {
  private readonly requests = new Map<string, Promise<ArtworkResult>>();
  constructor(private readonly provider: ArtworkProvider) {}

  getGameArtwork(request: ArtworkRequest) {
    const key = `${request.gameId}:${request.steamAppId ?? "name"}`;
    const existing = this.requests.get(key);
    if (existing) return existing;
    const pending = this.provider.getGrid(request).catch(() => ({ source: "placeholder", status: "unavailable" }) as ArtworkResult);
    this.requests.set(key, pending);
    return pending;
  }
}

export const artworkService = new ArtworkService(new TauriArtworkProvider());
