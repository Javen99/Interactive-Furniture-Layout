import { describe, expect, it } from "vitest";
import { cloneScene } from "./optimizer";
import { galleyKitchen } from "./presets";
import { defaultWeights } from "./scoring";
import { importScene } from "./serialization";
import type { LayoutScene } from "./types";

describe("serialization", () => {
  it("imports older scenes without optional access primitives or new weights", () => {
    const oldScene = cloneScene(galleyKitchen) as unknown as Omit<LayoutScene, "weights"> & { weights: Partial<LayoutScene["weights"]> };
    delete oldScene.room.accessZones;
    delete oldScene.room.pathways;
    delete oldScene.weights.accessibility;

    const imported = importScene(JSON.stringify(oldScene));
    expect(imported.room.accessZones).toBeUndefined();
    expect(imported.room.pathways).toBeUndefined();
    expect(imported.weights.accessibility).toBe(defaultWeights.accessibility);
    expect(imported.weights.collision).toBe(oldScene.weights.collision);
  });

  it("imports scenes with or without pathway waypoints", () => {
    const scene = cloneScene(galleyKitchen);
    delete scene.room.pathways![0].waypoints;
    expect(importScene(JSON.stringify(scene)).room.pathways![0].waypoints).toBeUndefined();

    scene.room.pathways![0].waypoints = [{ x: 120, y: 320 }];
    expect(importScene(JSON.stringify(scene)).room.pathways![0].waypoints).toEqual([{ x: 120, y: 320 }]);
  });
});
