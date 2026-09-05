import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GameList } from "./GameList";
import type { MinecraftState } from "../types";

const state = {
  backendAvailable: true,
  roots: [],
  worlds: [],
  destinations: [],
  snapshots: [],
  activity: [],
  operations: [],
  globalSettings: {
    launchAtStartup: false,
    notifyFailures: true,
    notifyManualCompletions: true,
    interfaceMotion: true,
  },
  minecraftSettings: {
    defaultPolicy: {
      automatic: true,
      mode: "both",
      intervalMinutes: 30,
      debounceSeconds: 30,
      skipUnchanged: true,
      destinationIds: [],
      retention: { kind: "keep_all" },
    },
    watchSaveFolders: true,
    protectNewWorlds: true,
    safetyBackupBeforeRestore: true,
    requireMinecraftClosed: true,
  },
  protection: {
    status: "attention",
    label: "1 world needs attention",
    protectedWorlds: 1,
    totalWorlds: 2,
  },
} satisfies MinecraftState;

describe("Minecraft Library row", () => {
  it("keeps one Minecraft Java Edition row and renders backend counts", () => {
    const html = renderToStaticMarkup(
      <GameList state={state} selected onSelect={() => undefined} />,
    );
    expect(html).toContain("Minecraft");
    expect(html).toContain("Java Edition");
    expect(html).toContain("1 of 2 protected");
    expect(html.match(/class="game-row/g)).toHaveLength(1);
  });
});
