export type PolicyMode = "manual" | "on_change" | "interval" | "both";
export type RetentionKind = "keep_all" | "count" | "age_days";
export type DestinationType = "local" | "nas";

export interface RetentionPolicy {
  kind: RetentionKind;
  value?: number;
}
export interface BackupPolicy {
  automatic: boolean;
  mode: PolicyMode;
  intervalMinutes: number;
  debounceSeconds: number;
  skipUnchanged: boolean;
  destinationIds: string[];
  retention: RetentionPolicy;
}
export interface GlobalSettings {
  launchAtStartup: boolean;
  notifyFailures: boolean;
  notifyManualCompletions: boolean;
  interfaceMotion: boolean;
}
export interface MinecraftSettings {
  defaultPolicy: BackupPolicy;
  watchSaveFolders: boolean;
  protectNewWorlds: boolean;
  safetyBackupBeforeRestore: boolean;
  requireMinecraftClosed: boolean;
}
export interface WorldMetadata {
  levelName?: string;
  lastPlayed?: number;
  gameMode?: string;
  hardcore?: boolean;
  difficulty?: string;
  versionName?: string;
  dataVersion?: number;
  parseError?: string;
}
export interface MinecraftSaveRoot {
  id: string;
  name: string;
  path: string;
  sourceType: string;
  enabled: boolean;
  autoDetectWorlds: boolean;
  protectNewWorlds: boolean;
  createdAt: string;
  lastScanAt?: string;
  status: string;
  policyOverride?: BackupPolicy;
  effectivePolicy: BackupPolicy;
  worldCount: number;
}
export interface MinecraftWorld {
  id: string;
  rootId: string;
  folderName: string;
  displayName: string;
  path: string;
  normalizedPath: string;
  missing: boolean;
  excluded: boolean;
  metadata: WorldMetadata;
  metadataFingerprint: string;
  currentFingerprint?: string;
  lastSuccessfulFingerprint?: string;
  policyOverride?: BackupPolicy;
  effectivePolicy: BackupPolicy;
  policyInheritedFrom: string;
  protectionStatus: string;
  lastBackupAt?: string;
  iconRevision?: string;
}
export interface StorageDestination {
  id: string;
  name: string;
  path: string;
  destinationType: DestinationType;
  enabled: boolean;
  isDefault: boolean;
  health: string;
  healthMessage?: string;
  lastCheckedAt?: string;
  availableBytes?: number;
  storedBytes: number;
}
export interface SnapshotReplica {
  id: string;
  snapshotId: string;
  destinationId: string;
  path: string;
  storedSize: number;
  status: string;
  checksum?: string;
  error?: string;
  verifiedAt?: string;
}
export interface Snapshot {
  id: string;
  worldId: string;
  createdAt: string;
  mode: string;
  status: string;
  fingerprint: string;
  fileCount: number;
  sourceSize: number;
  archiveSize: number;
  checksum: string;
  replicas: SnapshotReplica[];
}
export interface ActivityEvent {
  id: string;
  kind: string;
  status: string;
  title: string;
  subject: string;
  detail?: string;
  worldId?: string;
  rootId?: string;
  snapshotId?: string;
  destinationId?: string;
  createdAt: string;
}
export interface OperationProgress {
  operationId: string;
  worldId?: string;
  kind: string;
  stage: string;
  bytesDone: number;
  bytesTotal: number;
  message: string;
}
export interface ProtectionSummary {
  status: string;
  label: string;
  protectedWorlds: number;
  totalWorlds: number;
}
export interface MinecraftState {
  backendAvailable: boolean;
  roots: MinecraftSaveRoot[];
  worlds: MinecraftWorld[];
  destinations: StorageDestination[];
  snapshots: Snapshot[];
  activity: ActivityEvent[];
  operations: OperationProgress[];
  globalSettings: GlobalSettings;
  minecraftSettings: MinecraftSettings;
  protection: ProtectionSummary;
}
export interface RootInspection {
  resolvedPath: string;
  suggestedName: string;
  sourceType: string;
  worldCount: number;
  duplicateRootId?: string;
}
export interface CreateRootRequest {
  path: string;
  name: string;
  enabled: boolean;
  protectNewWorlds: boolean;
  policy: BackupPolicy;
}
export interface DestinationRequest {
  name: string;
  path: string;
  destinationType: DestinationType;
}
export interface WorldThumbnail {
  bytes: number[];
  revision: string;
}

export const defaultPolicy: BackupPolicy = {
  automatic: true,
  mode: "both",
  intervalMinutes: 30,
  debounceSeconds: 30,
  skipUnchanged: true,
  destinationIds: [],
  retention: { kind: "keep_all" },
};
