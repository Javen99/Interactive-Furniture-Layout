import { describe, expect, it } from "vitest";
import { addPathwayWaypoint, addPrimitive, deletePrimitive, movePrimitiveTo, removePathwayWaypoint, updatePrimitive } from "./authoring";
import { cloneScene } from "./optimizer";
import { galleyKitchen } from "./presets";

describe("authoring", () => {
  it("adds, updates, moves, and deletes access zones", () => {
    const added = addPrimitive(cloneScene(galleyKitchen), "accessZone");
    expect(added.selection.kind).toBe("accessZone");
    expect(added.scene.room.accessZones).toHaveLength((galleyKitchen.room.accessZones?.length ?? 0) + 1);

    const renamed = updatePrimitive(added.scene, added.selection, { label: "Manual access", importance: 1.7 });
    const zone = renamed.room.accessZones?.find((candidate) => candidate.id === added.selection.id);
    expect(zone?.label).toBe("Manual access");
    expect(zone?.importance).toBe(1.7);

    const moved = movePrimitiveTo(renamed, added.selection, { x: 120, y: 180 });
    const movedZone = moved.room.accessZones?.find((candidate) => candidate.id === added.selection.id);
    expect(movedZone?.x).toBeCloseTo(50);
    expect(movedZone?.y).toBeCloseTo(162);

    const removed = deletePrimitive(moved, added.selection);
    expect(removed.room.accessZones?.some((candidate) => candidate.id === added.selection.id)).toBe(false);
  });

  it("edits pathway endpoints independently", () => {
    const added = addPrimitive(cloneScene(galleyKitchen), "pathway");
    const pathwayId = added.selection.id;
    const movedStart = movePrimitiveTo(added.scene, { kind: "pathwayStart", id: pathwayId }, { x: 44, y: 55 });
    const movedEnd = movePrimitiveTo(movedStart, { kind: "pathwayEnd", id: pathwayId }, { x: 500, y: 140 });
    const pathway = movedEnd.room.pathways?.find((candidate) => candidate.id === pathwayId);
    expect(pathway?.start).toEqual({ x: 44, y: 55 });
    expect(pathway?.end).toEqual({ x: 500, y: 140 });
  });

  it("adds, moves, and removes pathway waypoints", () => {
    const added = addPrimitive(cloneScene(galleyKitchen), "pathway");
    const pathwayId = added.selection.id;
    const withWaypoint = addPathwayWaypoint(added.scene, pathwayId);
    const moved = movePrimitiveTo(withWaypoint, { kind: "pathwayWaypoint", id: pathwayId, waypointIndex: 0 }, { x: 300, y: 240 });
    const waypoint = moved.room.pathways?.find((candidate) => candidate.id === pathwayId)?.waypoints?.[0];
    expect(waypoint).toEqual({ x: 300, y: 240 });
    const removed = removePathwayWaypoint(moved, pathwayId, 0);
    expect(removed.room.pathways?.find((candidate) => candidate.id === pathwayId)?.waypoints).toEqual([]);
  });

  it("moves whole pathways with waypoint offsets intact", () => {
    const scene = cloneScene(galleyKitchen);
    scene.room.pathways![0].waypoints = [{ x: 300, y: 320 }];
    const original = scene.room.pathways![0];
    const target = { x: 400, y: 360 };
    const originalCenter = {
      x: (original.start.x + original.end.x) / 2,
      y: (original.start.y + original.end.y) / 2
    };
    const moved = movePrimitiveTo(scene, { kind: "pathway", id: "door-to-sink" }, target);
    const pathway = moved.room.pathways![0];
    expect(pathway.waypoints?.[0].x).toBeCloseTo(300 + target.x - originalCenter.x);
    expect(pathway.waypoints?.[0].y).toBeCloseTo(320 + target.y - originalCenter.y);
  });

  it("keeps scenes usable when deleting a surface", () => {
    const scene = cloneScene(galleyKitchen);
    const deletedSurfaceId = scene.room.surfaces[0].id;
    const edited = deletePrimitive(scene, { kind: "surface", id: deletedSurfaceId });
    expect(edited.room.surfaces.some((surface) => surface.id === deletedSurfaceId)).toBe(false);
    expect(edited.props.every((prop) => edited.room.surfaces.some((surface) => surface.id === prop.pose.surfaceId))).toBe(true);
    expect(edited.room.fixtures.every((fixture) => fixture.surfaceId !== deletedSurfaceId)).toBe(true);
  });
});
