import { describe, expect, it } from "vitest";
import { applyCostProfile } from "./costProfiles";
import { cloneScene } from "./optimizer";
import { galleyKitchen } from "./presets";
import { scoreScene } from "./scoring";
import type { RelationshipRule } from "./types";

function relationshipRaw(scene: ReturnType<typeof cloneScene>): number {
  return scoreScene(scene).terms.find((term) => term.key === "proximity")!.raw;
}

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

  it("scores configurable near prop-to-fixture rules", () => {
    const rule: RelationshipRule = {
      id: "soap-sink",
      label: "Soap near sink",
      enabled: true,
      mode: "near",
      subject: { propIds: ["soap"] },
      target: { kind: "fixture", fixtureIds: ["sink"] },
      distance: 70,
      tolerance: 120,
      strength: 1
    };
    const near = cloneScene(galleyKitchen);
    const far = cloneScene(galleyKitchen);
    near.relationships = [rule];
    far.relationships = [rule];
    near.props.find((prop) => prop.id === "soap")!.pose = { x: 365, y: 138, rotation: 0, surfaceId: "back-run" };
    far.props.find((prop) => prop.id === "soap")!.pose = { x: 780, y: 190, rotation: 0, surfaceId: "back-run" };
    expect(relationshipRaw(near)).toBeLessThan(relationshipRaw(far));
  });

  it("scores configurable near prop-to-prop rules", () => {
    const rule: RelationshipRule = {
      id: "board-soap",
      label: "Board near soap",
      enabled: true,
      mode: "near",
      subject: { propIds: ["board"] },
      target: { kind: "prop", propIds: ["soap"] },
      distance: 70,
      tolerance: 140,
      strength: 1
    };
    const near = cloneScene(galleyKitchen);
    const far = cloneScene(galleyKitchen);
    near.relationships = [rule];
    far.relationships = [rule];
    near.props.find((prop) => prop.id === "board")!.pose = { x: 430, y: 156, rotation: 0, surfaceId: "back-run" };
    near.props.find((prop) => prop.id === "soap")!.pose = { x: 365, y: 156, rotation: 0, surfaceId: "back-run" };
    far.props.find((prop) => prop.id === "board")!.pose = { x: 760, y: 156, rotation: 0, surfaceId: "back-run" };
    far.props.find((prop) => prop.id === "soap")!.pose = { x: 365, y: 156, rotation: 0, surfaceId: "back-run" };
    expect(relationshipRaw(near)).toBeLessThan(relationshipRaw(far));
  });

  it("scores configurable avoid prop-to-prop rules", () => {
    const rule: RelationshipRule = {
      id: "display-utility",
      label: "Display away from utility",
      enabled: true,
      mode: "avoid",
      subject: { propIds: ["plant"] },
      target: { kind: "prop", propIds: ["kettle"] },
      distance: 140,
      tolerance: 160,
      strength: 1
    };
    const near = cloneScene(galleyKitchen);
    const far = cloneScene(galleyKitchen);
    near.relationships = [rule];
    far.relationships = [rule];
    near.props.find((prop) => prop.id === "plant")!.pose = { x: 175, y: 250, rotation: 0, surfaceId: "left-run" };
    far.props.find((prop) => prop.id === "plant")!.pose = { x: 720, y: 150, rotation: 0, surfaceId: "back-run" };
    expect(relationshipRaw(near)).toBeGreaterThan(relationshipRaw(far));
  });

  it("lets disabled and empty relationship rules contribute zero", () => {
    const disabled = cloneScene(galleyKitchen);
    disabled.relationships = [
      {
        id: "disabled",
        label: "Disabled",
        enabled: false,
        mode: "near",
        subject: { tags: ["soap"] },
        target: { kind: "fixture", fixtureKinds: ["sink"] },
        distance: 72,
        tolerance: 120,
        strength: 1
      }
    ];
    const empty = cloneScene(galleyKitchen);
    empty.relationships = [];
    expect(relationshipRaw(disabled)).toBe(0);
    expect(relationshipRaw(empty)).toBe(0);
  });

  it("uses default relationship rules for old scenes without relationships", () => {
    const legacy = cloneScene(galleyKitchen);
    const disabled = cloneScene(galleyKitchen);
    delete legacy.relationships;
    disabled.relationships = [];
    expect(relationshipRaw(legacy)).toBeGreaterThan(relationshipRaw(disabled));
    expect(scoreScene(legacy).terms.find((term) => term.key === "proximity")!.label).toBe("Relationships");
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
