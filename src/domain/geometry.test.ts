import { describe, expect, it } from "vitest";
import { axisRectToOrientedRect, orientedRectInsideAxisRect, orientedRectsOverlap, propToOrientedRect } from "./geometry";
import type { PropItem, Surface } from "./types";

const surface: Surface = {
  id: "surface",
  label: "Surface",
  kind: "worktop",
  wallEdge: "top",
  x: 0,
  y: 0,
  width: 200,
  height: 100
};

function prop(id: string, x: number, y: number, rotation = 0): PropItem {
  return {
    id,
    label: id,
    tags: [],
    width: 50,
    height: 30,
    pose: { x, y, rotation, surfaceId: "surface" },
    allowedSurfaceIds: ["surface"],
    orientationOptions: [0, 90],
    pinned: false,
    color: "#000",
    preference: "none"
  };
}

describe("geometry", () => {
  it("detects oriented rectangle overlaps", () => {
    expect(orientedRectsOverlap(propToOrientedRect(prop("a", 60, 50, 0)), propToOrientedRect(prop("b", 80, 50, 90)))).toBe(true);
    expect(orientedRectsOverlap(propToOrientedRect(prop("a", 30, 30, 0)), propToOrientedRect(prop("b", 160, 80, 90)))).toBe(false);
  });

  it("checks rotated props remain inside axis-aligned surfaces", () => {
    expect(orientedRectInsideAxisRect(propToOrientedRect(prop("inside", 80, 50, 90)), surface)).toBe(true);
    expect(orientedRectInsideAxisRect(propToOrientedRect(prop("outside", 8, 10, 90)), surface)).toBe(false);
  });

  it("treats touching fixtures as non-overlapping only when separated", () => {
    const fixture = axisRectToOrientedRect({ id: "sink", label: "Sink", x: 100, y: 20, width: 40, height: 40 });
    expect(orientedRectsOverlap(propToOrientedRect(prop("near", 90, 40, 0)), fixture)).toBe(true);
    expect(orientedRectsOverlap(propToOrientedRect(prop("far", 30, 40, 0)), fixture)).toBe(false);
  });
});

