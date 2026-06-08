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
});
