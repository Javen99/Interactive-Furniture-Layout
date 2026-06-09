import { describe, expect, it } from "vitest";
import { cloneScene } from "./optimizer";
import { galleyKitchen } from "./presets";
import { applyCandidateSlot, generateCandidateSlots, generateCandidateSlotsForProp } from "./slots";

describe("candidate slots", () => {
  it("orders slots deterministically by quality", () => {
    const scene = cloneScene(galleyKitchen);
    const prop = scene.props.find((candidate) => candidate.id === "soap")!;
    const surface = scene.room.surfaces.find((candidate) => candidate.id === "back-run")!;
    const first = generateCandidateSlots(scene, prop, surface, { includeCurrentRotation: true, maxSlots: 6 });
    const second = generateCandidateSlots(scene, prop, surface, { includeCurrentRotation: true, maxSlots: 6 });
    expect(first.map((slot) => slot.id)).toEqual(second.map((slot) => slot.id));
    expect(first[0].quality).toBeGreaterThanOrEqual(first.at(-1)!.quality);
  });

  it("penalizes slots that collide with fixtures and access zones", () => {
    const scene = cloneScene(galleyKitchen);
    const prop = scene.props.find((candidate) => candidate.id === "board")!;
    const surface = scene.room.surfaces.find((candidate) => candidate.id === "back-run")!;
    const slots = generateCandidateSlots(scene, prop, surface, { includeCurrentRotation: true, maxSlots: 24 });
    const conflicted = slots.filter((slot) => slot.penalties.fixture > 0 || slot.penalties.access > 0);
    expect(conflicted.length).toBeGreaterThan(0);
    expect(slots[0].quality).toBeGreaterThanOrEqual(Math.max(...conflicted.map((slot) => slot.quality)));
  });

  it("includes valid orientation options", () => {
    const scene = cloneScene(galleyKitchen);
    const prop = scene.props.find((candidate) => candidate.id === "pan")!;
    const slots = generateCandidateSlotsForProp(scene, prop, { includeCurrentRotation: true, maxSlots: 20 });
    expect(new Set(slots.map((slot) => slot.rotation))).toEqual(new Set([0, 90]));
  });

  it("returns no slots for oversized props", () => {
    const scene = cloneScene(galleyKitchen);
    const prop = { ...scene.props[0], width: 2000, height: 2000 };
    const surface = scene.room.surfaces[0];
    expect(generateCandidateSlots(scene, prop, surface)).toEqual([]);
  });

  it("applies a selected slot to a prop pose", () => {
    const scene = cloneScene(galleyKitchen);
    const prop = scene.props[0];
    const slot = generateCandidateSlotsForProp(scene, prop, { includeCurrentRotation: true, maxSlots: 1 })[0];
    expect(applyCandidateSlot(prop, slot).pose).toMatchObject({
      surfaceId: slot.surfaceId,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotation
    });
  });

  it("ranks relationship-friendly slots ahead of poor near-rule slots", () => {
    const scene = cloneScene(galleyKitchen);
    scene.room.accessZones = [];
    scene.room.pathways = [];
    scene.room.fixtures = [];
    scene.relationships = [
      {
        id: "soap-kettle",
        label: "Soap near kettle",
        enabled: true,
        mode: "near",
        subject: { propIds: ["soap"] },
        target: { kind: "prop", propIds: ["kettle"] },
        distance: 70,
        tolerance: 120,
        strength: 1
      }
    ];
    const prop = { ...scene.props.find((candidate) => candidate.id === "soap")!, preference: "none" as const };
    const surface = scene.room.surfaces.find((candidate) => candidate.id === "left-run")!;
    const slots = generateCandidateSlots(scene, prop, surface, { includeCurrentRotation: true, maxSlots: 24 });
    const bestRelationship = [...slots].sort((a, b) => a.penalties.proximity - b.penalties.proximity)[0];
    const worstRelationship = [...slots].sort((a, b) => b.penalties.proximity - a.penalties.proximity)[0];
    expect(bestRelationship.penalties.proximity).toBeLessThan(worstRelationship.penalties.proximity);
    expect(bestRelationship.quality).toBeGreaterThan(worstRelationship.quality);
  });

  it("ranks avoid-rule slots away from undesirable prop targets", () => {
    const scene = cloneScene(galleyKitchen);
    scene.room.accessZones = [];
    scene.room.pathways = [];
    scene.relationships = [
      {
        id: "plant-kettle",
        label: "Display away from utility",
        enabled: true,
        mode: "avoid",
        subject: { propIds: ["plant"] },
        target: { kind: "prop", propIds: ["kettle"] },
        distance: 130,
        tolerance: 130,
        strength: 1
      }
    ];
    const prop = { ...scene.props.find((candidate) => candidate.id === "plant")!, preference: "none" as const };
    const surface = scene.room.surfaces.find((candidate) => candidate.id === "left-run")!;
    const slots = generateCandidateSlots(scene, prop, surface, { includeCurrentRotation: true, maxSlots: 24 });
    const bestRelationship = [...slots].sort((a, b) => a.penalties.proximity - b.penalties.proximity)[0];
    const worstRelationship = [...slots].sort((a, b) => b.penalties.proximity - a.penalties.proximity)[0];
    expect(bestRelationship.penalties.proximity).toBeLessThan(worstRelationship.penalties.proximity);
    expect(bestRelationship.quality).toBeGreaterThan(worstRelationship.quality);
  });
});
