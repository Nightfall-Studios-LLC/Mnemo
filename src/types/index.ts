export type Status = "healthy" | "warning" | "error";
export type ProviderKind = "drive" | "local" | "nas" | "mega";

export interface SaveTarget {
  id: string;
  gameId: string;
  name: string;
  sourcePath: string;
  enabled: boolean;
  providerIds: ProviderKind[];
  lastBackup?: string;
  status: Status;
  icon?: string;
}

export interface Game {
  id: string;
  name: string;
  launcher: string;
  artwork: string;
  accent: string;
  saveTargets: SaveTarget[];
  status: Status;
  lastBackup?: string;
}

export interface BackupSnapshot {
  id: string;
  gameId: string;
  saveTargetId: string;
  timestamp: string;
  providerId: string;
  snapshotPath: string;
  size: number;
  fileCount: number;
}

export interface BackupProvider {
  id: string;
  providerType: ProviderKind;
  name: string;
  destination: string;
  connected: boolean;
  enabled: boolean;
}
