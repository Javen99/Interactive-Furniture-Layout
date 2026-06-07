import { describe, expect, it } from "vitest";
import { cloneScene } from "./optimizer";
import { presets, galleyKitchen } from "./presets";
import { canRunOptimization, validateScene } from "./validation";

function messages(scene = galleyKitchen) {
  return validateScene(scene).issues.map((issue) => issue.message);
}

describe("validation", () => {
  it("accepts all bundled presets without hard errors", () => {
    for (const preset of presets) {
      expect(validateScene(preset).errors).toEqual([]);
    }
  });

  it("reports duplicate IDs", () => {
    const scene = cloneScene(galleyKitchen);
    scene.room.surfaces[1].id = scene.room.surfaces[0].id;
    expect(messages(scene)).toContain(`Duplicate id "${scene.room.surfaces[0].id}" also appears on surface.`);
    expect(canRunOptimization(validateScene(scene))).toBe(false);
  });

  it("reports missing fixture, access-zone, and prop surface references", () => {
    const scene = cloneScene(galleyKitchen);
    scene.room.fixtures[0].surfaceId = "missing-surface";
    scene.room.accessZones![0].targetId = "missing-target";
    scene.props[0].pose.surfaceId = "missing-prop-surface";
    scene.props[1].allowedSurfaceIds = ["missing-allowed-surface"];
    const report = validateScene(scene);
    expect(report.errors.map((issue) => issue.target.kind)).toEqual(expect.arrayContaining(["fixture", "accessZone", "prop"]));
    expect(report.errors.some((issue) => issue.message.includes("missing surface"))).toBe(true);
    expect(report.errors.some((issue) => issue.message.includes("missing target"))).toBe(true);
    expect(canRunOptimization(report)).toBe(false);
  });

  it("reports invalid dimensions and weights", () => {
    const scene = cloneScene(galleyKitchen);
    scene.room.width = 0;
    scene.room.surfaces[0].width = -10;
    scene.props[0].height = Number.NaN;
    scene.weights.accessibility = -1;
    const report = validateScene(scene);
    expect(report.errors.some((issue) => issue.message.includes("Room width"))).toBe(true);
    expect(report.errors.some((issue) => issue.message.includes("surface width"))).toBe(true);
    expect(report.errors.some((issue) => issue.message.includes("Prop height"))).toBe(true);
    expect(report.errors.some((issue) => issue.message.includes("cannot be negative"))).toBe(true);
  });

  it("reports invalid pathway endpoints, width, and length", () => {
    const scene = cloneScene(galleyKitchen);
    const pathway = scene.room.pathways![0];
    pathway.start = { x: 100, y: 100 };
    pathway.end = { x: 100, y: 100 };
    pathway.width = 0;
    const report = validateScene(scene);
    expect(report.errors.some((issue) => issue.message.includes("same point"))).toBe(true);
    expect(report.errors.some((issue) => issue.message.includes("Pathway width"))).toBe(true);
  });

  it("warns about out-of-room primitives without blocking optimization", () => {
    const scene = cloneScene(galleyKitchen);
    scene.room.surfaces[0].x = -20;
    scene.props[0].pose.x = scene.room.width + 20;
    const report = validateScene(scene);
    expect(report.warnings.some((issue) => issue.message.includes("outside the room"))).toBe(true);
    expect(canRunOptimization(report)).toBe(true);
  });

  it("reports unsupported prop surface assignments", () => {
    const scene = cloneScene(galleyKitchen);
    scene.props[0].allowedSurfaceIds = ["left-run"];
    scene.props[0].pose.surfaceId = "back-run";
    const report = validateScene(scene);
    expect(report.errors.some((issue) => issue.message.includes("does not allow"))).toBe(true);
  });
});
