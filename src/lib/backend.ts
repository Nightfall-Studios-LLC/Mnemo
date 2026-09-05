import { invoke } from "@tauri-apps/api/core";
import type { MinecraftState } from "../types";

export const backendAvailable =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const loadMinecraftState = () =>
  invoke<MinecraftState>("get_minecraft_state");
export const command = <T = void>(
  name: string,
  args: Record<string, unknown> = {},
) => invoke<T>(name, args);
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "The operation could not be completed";
}
