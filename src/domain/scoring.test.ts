import { describe, expect, it } from "vitest";
import { cloneScene } from "./optimizer";
import { galleyKitchen } from "./presets";
import { scoreScene } from "./scoring";

describe("scoring", () => {
  it("penalizes collisions", () => {
    const scene = cloneScene(galleyKitchen);
    const separated = scoreScene(scene).total;
    scene.props[1].pose.x = scene.props[0].pose.x;
    scene.props[1].pose.y = scene.props[0].pose.y;
    expect(scoreScene(scene).total).toBeGreaterThan(separated);
  });

  it("penalizes movement of pinned props against the baseline", () => {
    const baseline = cloneScene(galleyKitchen);
    const moved = cloneScene(galleyKitchen);
    const pinned = moved.props.find((prop) => prop.pinned);
    expect(pinned).toBeDefined();
    pinned!.pose.x += 80;
    expect(scoreScene(moved, baseline).terms.find((term) => term.key === "pinned")!.weighted).toBeGreaterThan(0);
  });

  it("scores soap closer to the sink better than far away", () => {
    const near = cloneScene(galleyKitchen);
    const far = cloneScene(galleyKitchen);
    near.props.find((prop) => prop.id === "soap")!.pose = { x: 365, y: 138, rotation: 0, surfaceId: "back-run" };
    far.props.find((prop) => prop.id === "soap")!.pose = { x: 780, y: 190, rotation: 0, surfaceId: "back-run" };
    const nearProximity = scoreScene(near).terms.find((term) => term.key === "proximity")!.weighted;
    const farProximity = scoreScene(far).terms.find((term) => term.key === "proximity")!.weighted;
    expect(nearProximity).toBeLessThan(farProximity);
  });

  it("penalizes blocked access zones", () => {
    const clear = cloneScene(galleyKitchen);
    const blocked = cloneScene(galleyKitchen);
    blocked.props.find((prop) => prop.id === "board")!.pose = { x: 296, y: 194, rotation: 0, surfaceId: "back-run" };
    const clearAccess = scoreScene(clear).terms.find((term) => term.key === "accessibility")!.weighted;
    const blockedAccess = scoreScene(blocked).terms.find((term) => term.key === "accessibility")!.weighted;
    expect(blockedAccess).toBeGreaterThan(clearAccess);
  });
});
