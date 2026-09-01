import type { BackupSnapshot, Game } from "../types";

const art = (label: string, colors: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors.split(",")[0]}"/><stop offset="1" stop-color="${colors.split(",")[1]}"/></linearGradient></defs><rect width="160" height="96" rx="7" fill="url(#g)"/><circle cx="128" cy="20" r="26" fill="white" opacity=".12"/><path d="M0 74l35-35 28 24 25-32 72 65H0z" fill="#061117" opacity=".55"/><text x="80" y="52" fill="white" font-size="15" font-family="Segoe UI" font-weight="700" text-anchor="middle">${label}</text></svg>`)} `;

export const demoGames: Game[] = [
  {
    id: "minecraft-java", name: "Minecraft", launcher: "Minecraft Launcher", accent: "#25b8a8",
    artwork: art("MINECRAFT", "#5bb56e,#2b769d"), status: "healthy", lastBackup: "Today, 7:42 PM",
    saveTargets: [
      { id: "survival-world", gameId: "minecraft-java", name: "Survival World", sourcePath: "%APPDATA%/.minecraft/saves/Survival World", enabled: true, providerIds: ["drive", "nas"], lastBackup: "Today, 7:42 PM", status: "healthy", icon: "🌳" },
      { id: "creative-test", gameId: "minecraft-java", name: "Creative Test", sourcePath: "%APPDATA%/.minecraft/saves/Creative Test", enabled: true, providerIds: ["local"], lastBackup: "Today, 6:15 PM", status: "healthy", icon: "🌿" },
      { id: "hardcore-world", gameId: "minecraft-java", name: "Hardcore World", sourcePath: "%APPDATA%/.minecraft/saves/Hardcore World", enabled: false, providerIds: [], status: "warning", icon: "🧱" },
      { id: "player-data", gameId: "minecraft-java", name: "Player Data", sourcePath: "%APPDATA%/.minecraft", enabled: true, providerIds: ["drive", "local"], lastBackup: "Today, 5:02 PM", status: "healthy", icon: "🧑" },
    ],
  },
  { id: "elden-ring", name: "Elden Ring", launcher: "Steam", accent: "#bd8d33", artwork: art("ELDEN RING", "#191c1e,#8f5e20"), status: "healthy", lastBackup: "Today, 7:42 PM", saveTargets: ["Character Slot 1", "Character Slot 2"].map((name, i) => ({ id: `er-${i}`, gameId: "elden-ring", name, sourcePath: "%APPDATA%/EldenRing", enabled: true, providerIds: i ? ["nas"] : ["drive", "nas"], lastBackup: "Today, 7:42 PM", status: "healthy" })) },
  { id: "cyberpunk-2077", name: "Cyberpunk 2077", launcher: "GOG Galaxy", accent: "#eacb19", artwork: art("CYBERPUNK", "#f4da16,#594e09"), status: "healthy", lastBackup: "Yesterday, 11:08 PM", saveTargets: [{ id: "cp-save", gameId: "cyberpunk-2077", name: "Entire Save Directory", sourcePath: "%USERPROFILE%/Saved Games/CD Projekt Red/Cyberpunk 2077", enabled: true, providerIds: ["drive", "mega"], lastBackup: "Yesterday, 11:08 PM", status: "healthy" }] },
  { id: "baldurs-gate-3", name: "Baldur's Gate 3", launcher: "Steam", accent: "#8e4d2a", artwork: art("BALDUR'S GATE", "#274252,#8d4325"), status: "healthy", lastBackup: "2d ago, 4:31 PM", saveTargets: [1,2,3,4].map(i => ({ id: `bg-${i}`, gameId: "baldurs-gate-3", name: `Campaign ${i}`, sourcePath: "%LOCALAPPDATA%/Larian Studios", enabled: true, providerIds: ["drive", "nas", "mega"], lastBackup: "2d ago, 4:31 PM", status: "healthy" })) },
  { id: "stardew-valley", name: "Stardew Valley", launcher: "Steam", accent: "#63a8d5", artwork: art("STARDEW VALLEY", "#42b8dc,#74bb4e"), status: "healthy", lastBackup: "3d ago, 9:12 AM", saveTargets: ["Willow Farm", "River Farm"].map((name, i) => ({ id: `sd-${i}`, gameId: "stardew-valley", name, sourcePath: "%APPDATA%/StardewValley/Saves", enabled: true, providerIds: ["drive", "local"], lastBackup: "3d ago, 9:12 AM", status: "healthy" })) },
];

export const demoSnapshots: BackupSnapshot[] = [
  { id: "snap-1", gameId: "minecraft-java", saveTargetId: "survival-world", timestamp: "Today, 7:42 PM", providerId: "drive", snapshotPath: "Mnemo/minecraft-java/survival-world/latest", size: 186646528, fileCount: 482 },
  { id: "snap-2", gameId: "minecraft-java", saveTargetId: "creative-test", timestamp: "Today, 6:15 PM", providerId: "local", snapshotPath: "Mnemo/minecraft-java/creative-test/latest", size: 47185920, fileCount: 133 },
  { id: "snap-3", gameId: "minecraft-java", saveTargetId: "player-data", timestamp: "Yesterday, 9:04 PM", providerId: "nas", snapshotPath: "Mnemo/minecraft-java/player-data/previous", size: 2097152, fileCount: 16 },
];
