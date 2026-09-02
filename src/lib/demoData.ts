import type { BackupSnapshot, Game, ProviderKind, SaveTarget } from "../types";

const targets = (gameId: string, names: string[], sourcePath: string, providers: ProviderKind[], lastBackup: string): SaveTarget[] =>
  names.map((name, index) => ({ id: `${gameId}-${index + 1}`, gameId, name, sourcePath, enabled: true, providerIds: providers, lastBackup, status: "healthy" }));

export const demoGames: Game[] = [
  {
    id: "minecraft-java", name: "Minecraft", launcher: "Minecraft Launcher", accent: "#25b8a8", status: "healthy", lastBackup: "Today, 7:42 PM",
    saveTargets: [
      { id: "survival-world", gameId: "minecraft-java", name: "Survival World", sourcePath: "%APPDATA%/.minecraft/saves/Survival World", enabled: true, providerIds: ["drive", "nas"], lastBackup: "Today, 7:42 PM", status: "healthy", icon: "🌳" },
      { id: "creative-test", gameId: "minecraft-java", name: "Creative Test", sourcePath: "%APPDATA%/.minecraft/saves/Creative Test", enabled: true, providerIds: ["local"], lastBackup: "Today, 6:15 PM", status: "healthy", icon: "🌿" },
      { id: "hardcore-world", gameId: "minecraft-java", name: "Hardcore World", sourcePath: "%APPDATA%/.minecraft/saves/Hardcore World", enabled: false, providerIds: [], status: "warning", icon: "🧱" },
      { id: "player-data", gameId: "minecraft-java", name: "Player Data", sourcePath: "%APPDATA%/.minecraft", enabled: true, providerIds: ["drive", "local"], lastBackup: "Today, 5:02 PM", status: "healthy", icon: "🧑" },
    ],
  },
  { id: "elden-ring", name: "Elden Ring", launcher: "Steam", steamAppId: 1245620, accent: "#bd8d33", status: "healthy", lastBackup: "Today, 7:42 PM", saveTargets: targets("elden-ring", ["Character Slot 1", "Character Slot 2"], "%APPDATA%/EldenRing", ["drive", "nas"], "Today, 7:42 PM") },
  { id: "cyberpunk-2077", name: "Cyberpunk 2077", launcher: "GOG Galaxy", steamAppId: 1091500, accent: "#eacb19", status: "healthy", lastBackup: "Yesterday, 11:08 PM", saveTargets: targets("cyberpunk-2077", ["Entire Save Directory"], "%USERPROFILE%/Saved Games/CD Projekt Red/Cyberpunk 2077", ["drive", "mega"], "Yesterday, 11:08 PM") },
  { id: "baldurs-gate-3", name: "Baldur's Gate 3", launcher: "Steam", steamAppId: 1086940, accent: "#8e4d2a", status: "healthy", lastBackup: "2d ago, 4:31 PM", saveTargets: targets("baldurs-gate-3", ["Campaign 1", "Campaign 2", "Campaign 3", "Campaign 4"], "%LOCALAPPDATA%/Larian Studios", ["drive", "nas", "mega"], "2d ago, 4:31 PM") },
  { id: "stardew-valley", name: "Stardew Valley", launcher: "Steam", steamAppId: 413150, accent: "#63a8d5", status: "healthy", lastBackup: "3d ago, 9:12 AM", saveTargets: targets("stardew-valley", ["Willow Farm", "River Farm"], "%APPDATA%/StardewValley/Saves", ["drive", "local"], "3d ago, 9:12 AM") },
];

export const demoSnapshots: BackupSnapshot[] = [
  { id: "snap-1", gameId: "minecraft-java", saveTargetId: "survival-world", timestamp: "Today, 7:42 PM", providerId: "drive", snapshotPath: "Mnemo/minecraft-java/survival-world/latest", size: 186646528, fileCount: 482 },
  { id: "snap-2", gameId: "minecraft-java", saveTargetId: "creative-test", timestamp: "Today, 6:15 PM", providerId: "local", snapshotPath: "Mnemo/minecraft-java/creative-test/latest", size: 47185920, fileCount: 133 },
  { id: "snap-3", gameId: "minecraft-java", saveTargetId: "player-data", timestamp: "Yesterday, 9:04 PM", providerId: "nas", snapshotPath: "Mnemo/minecraft-java/player-data/previous", size: 2097152, fileCount: 16 },
];
