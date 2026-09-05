import type { MinecraftState } from "../types";
import { relativeTime, statusTone } from "../lib/format";
import { Icon, ProviderIcon, StatusIcon } from "./Icons";
import { GameArtwork } from "./GameArtwork";
import { Button } from "@heroui/react";

export function GameList({
  state,
  selected,
  onSelect,
  visible = true,
}: {
  state: MinecraftState;
  selected: boolean;
  onSelect: () => void;
  visible?: boolean;
}) {
  const assigned = new Set(
    state.worlds.flatMap((world) => world.effectivePolicy.destinationIds),
  );
  const destinations = state.destinations.filter((destination) =>
    assigned.has(destination.id),
  );
  const latest = state.snapshots[0]?.createdAt;
  return (
    <section className="game-panel">
      <div className="game-head">
        <span>Games</span>
        <span>{visible ? 1 : 0} in library</span>
      </div>
      <div className="game-rows">
        {visible ? (
          <Button
            variant="ghost"
            className={`game-row ${selected ? "selected" : ""}`}
            onPress={onSelect}
            aria-pressed={selected}
          >
            <GameArtwork gameId="minecraft-java" name="Minecraft" />
            <span className="game-copy">
              <strong>Minecraft</strong>
              <small>Java Edition</small>
            </span>
            <span className="game-summary">
              <span>
                {state.protection.protectedWorlds} of{" "}
                {state.protection.totalWorlds} protected
              </span>
              <small>
                {latest
                  ? `Last backup ${relativeTime(latest)}`
                  : "Never backed up"}
              </small>
            </span>
            <span className="game-state">
              <span className="providers">
                {destinations.map((destination) => (
                  <ProviderIcon
                    key={destination.id}
                    type={destination.destinationType}
                  />
                ))}
              </span>
              <StatusIcon
                status={statusTone(
                  state.protection.status === "idle"
                    ? "protected"
                    : state.protection.status,
                )}
              />
              <Icon name="chevron" size={16} />
            </span>
          </Button>
        ) : (
          <div className="empty">No games match your search.</div>
        )}
      </div>
    </section>
  );
}
