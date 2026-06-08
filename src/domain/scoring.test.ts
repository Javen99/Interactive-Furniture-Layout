import { describe, expect, it } from "vitest";
import { applyCostProfile } from "./costProfiles";
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

  it("penalizes props blocking routed pathway segments", () => {
    const clear = cloneScene(galleyKitchen);
    const blocked = cloneScene(galleyKitchen);
    clear.room.pathways = [
      { id: "route", label: "Route", start: { x: 100, y: 500 }, waypoints: [{ x: 100, y: 260 }], end: { x: 520, y: 260 }, width: 64, importance: 1 }
    ];
    blocked.room.pathways = clear.room.pathways;
    clear.props.find((prop) => prop.id === "board")!.pose = { x: 740, y: 140, rotation: 0, surfaceId: "back-run" };
    blocked.props.find((prop) => prop.id === "board")!.pose = { x: 100, y: 210, rotation: 0, surfaceId: "back-run" };
    const clearAccess = scoreScene(clear).terms.find((term) => term.key === "accessibility")!.weighted;
    const blockedAccess = scoreScene(blocked).terms.find((term) => term.key === "accessibility")!.weighted;
    expect(blockedAccess).toBeGreaterThan(clearAccess);
  });

  it("reweights cost profiles without changing raw term facts", () => {
    const balanced = scoreScene(applyCostProfile(cloneScene(galleyKitchen), "balanced"));
    const accessibilityFirst = scoreScene(applyCostProfile(cloneScene(galleyKitchen), "accessibility-first"));
    const balancedAccess = balanced.terms.find((term) => term.key === "accessibility")!;
    const accessibilityFirstAccess = accessibilityFirst.terms.find((term) => term.key === "accessibility")!;
    expect(accessibilityFirstAccess.raw).toBe(balancedAccess.raw);
    expect(accessibilityFirstAccess.weighted).toBeGreaterThanOrEqual(balancedAccess.weighted);
  });
});
