import type { BackupSnapshot, Game } from "../types";

export const demoGames: Game[] = [
  {
    id: "elden-ring", name: "Elden Ring", launcher: "Steam", steamAppId: 1245620, accent: "#b89a55", status: "healthy", lastBackup: "Today, 7:42 PM",
    saveTargets: [
      { id: "elden-character", gameId: "elden-ring", name: "Character saves", sourcePath: "%APPDATA%/EldenRing", enabled: true, providerIds: ["local", "nas"], lastBackup: "Today, 7:42 PM", status: "healthy", icon: "⚔" },
      { id: "elden-settings", gameId: "elden-ring", name: "Graphics and controls", sourcePath: "%APPDATA%/EldenRing/GraphicsConfig.xml", enabled: true, providerIds: ["local"], lastBackup: "Today, 7:42 PM", status: "healthy", icon: "◈" },
    ],
  },
  {
    id: "satisfactory", name: "Satisfactory", launcher: "Epic Games", accent: "#e58a45", status: "warning", lastBackup: "Yesterday, 9:18 PM",
    saveTargets: [
      { id: "satisfactory-factory", gameId: "satisfactory", name: "Factory saves", sourcePath: "%LOCALAPPDATA%/FactoryGame/Saved/SaveGames", enabled: true, providerIds: ["local"], lastBackup: "Yesterday, 9:18 PM", status: "healthy", icon: "⬡" },
      { id: "satisfactory-settings", gameId: "satisfactory", name: "Game preferences", sourcePath: "%LOCALAPPDATA%/FactoryGame/Saved/Config", enabled: false, providerIds: [], status: "warning", icon: "⚙" },
    ],
  },
];

export const demoSnapshots: BackupSnapshot[] = [
  { id: "elden-snapshot", gameId: "elden-ring", saveTargetId: "elden-character", timestamp: "Today, 7:42 PM", providerId: "local", snapshotPath: "Mnemo/elden-ring/elden-character/latest", size: 31457280, fileCount: 4 },
  { id: "satisfactory-snapshot", gameId: "satisfactory", saveTargetId: "satisfactory-factory", timestamp: "Yesterday, 9:18 PM", providerId: "local", snapshotPath: "Mnemo/satisfactory/satisfactory-factory/latest", size: 78643200, fileCount: 12 },
];
