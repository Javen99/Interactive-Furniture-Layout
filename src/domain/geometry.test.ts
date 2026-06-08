import { describe, expect, it } from "vitest";
import {
  axisRectsOverlap,
  axisRectToOrientedRect,
  orientedRectBlocksPathway,
  orientedRectBlocksPathwaySegments,
  orientedRectInsideAxisRect,
  orientedRectsOverlap,
  pathwayToSegments,
  propToOrientedRect
} from "./geometry";
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

  it("detects access-zone rectangle intersections", () => {
    expect(
      axisRectsOverlap(
        { id: "a", label: "A", x: 20, y: 20, width: 40, height: 30 },
        { id: "b", label: "B", x: 45, y: 25, width: 30, height: 30 }
      )
    ).toBe(true);
    expect(
      axisRectsOverlap(
        { id: "a", label: "A", x: 20, y: 20, width: 40, height: 30 },
        { id: "b", label: "B", x: 80, y: 25, width: 30, height: 30 }
      )
    ).toBe(false);
  });

  it("detects props blocking pathway clearance", () => {
    const pathway = {
      id: "walk",
      label: "Walkway",
      start: { x: 0, y: 50 },
      end: { x: 200, y: 50 },
      width: 48,
      importance: 1
    };
    expect(orientedRectBlocksPathway(propToOrientedRect(prop("blocked", 100, 56, 0)), pathway)).toBe(true);
    expect(orientedRectBlocksPathway(propToOrientedRect(prop("clear", 100, 96, 0)), pathway)).toBe(false);
  });

  it("segments routed pathways through waypoints", () => {
    const pathway = {
      id: "route",
      label: "Route",
      start: { x: 0, y: 0 },
      waypoints: [
        { x: 80, y: 0 },
        { x: 80, y: 80 }
      ],
      end: { x: 160, y: 80 },
      width: 40,
      importance: 1
    };
    expect(pathwayToSegments(pathway).map((segment) => [segment.start, segment.end])).toEqual([
      [{ x: 0, y: 0 }, { x: 80, y: 0 }],
      [{ x: 80, y: 0 }, { x: 80, y: 80 }],
      [{ x: 80, y: 80 }, { x: 160, y: 80 }]
    ]);
  });

  it("detects props blocking any routed pathway segment", () => {
    const pathway = {
      id: "route",
      label: "Route",
      start: { x: 0, y: 0 },
      waypoints: [{ x: 0, y: 100 }],
      end: { x: 160, y: 100 },
      width: 40,
      importance: 1
    };
    expect(orientedRectBlocksPathwaySegments(propToOrientedRect(prop("corner", 0, 75, 0)), pathway)).toBe(true);
    expect(orientedRectBlocksPathwaySegments(propToOrientedRect(prop("clear", 120, 30, 0)), pathway)).toBe(false);
  });
});
