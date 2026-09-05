import { describe, expect, it } from "vitest";
import { policyLabel, statusLabel, statusTone } from "./format";

describe("Minecraft presentation rules", () => {
  it("uses the central protection status mapping", () => {
    expect(statusTone("protected")).toBe("healthy");
    expect(statusTone("partial")).toBe("warning");
    expect(statusTone("failed")).toBe("error");
    expect(statusLabel("needs_attention")).toBe("Needs attention");
  });

  it("formats each automatic policy without invented timing", () => {
    expect(policyLabel("manual", 30)).toBe("Manual");
    expect(policyLabel("on_change", 30)).toBe("On change");
    expect(policyLabel("interval", 30)).toBe("Every 30 min");
    expect(policyLabel("both", 60)).toBe("On change · every 1 hour");
  });
});
