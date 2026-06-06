import { clamp, clampPropToSurface } from "./geometry";
import type {
  AccessZone,
  AxisAlignedRect,
  EditablePrimitiveKind,
  EditableSelection,
  Fixture,
  LayoutScene,
  Pathway,
  Surface,
  Vec2
} from "./types";

export type AuthoringAddResult = {
  scene: LayoutScene;
  selection: EditableSelection;
};

export type PrimitivePatch = {
  id?: string;
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  kind?: Surface["kind"] | Fixture["kind"] | AccessZone["kind"];
  wallEdge?: Surface["wallEdge"];
  surfaceId?: string;
  clearance?: number;
  targetId?: string;
  importance?: number;
  start?: Vec2;
  end?: Vec2;
};

const roomInset = 24;

function existingIds(scene: LayoutScene): string[] {
  return [
    ...scene.room.surfaces.map((item) => item.id),
    ...scene.room.fixtures.map((item) => item.id),
    ...(scene.room.accessZones ?? []).map((item) => item.id),
    ...(scene.room.pathways ?? []).map((item) => item.id),
    ...scene.props.map((item) => item.id)
  ];
}

function uniqueId(scene: LayoutScene, base: string): string {
  const ids = new Set(existingIds(scene));
  let index = 1;
  let candidate = `${base}-${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
}

function clampRectToRoom<T extends AxisAlignedRect>(rect: T, scene: LayoutScene): T {
  return {
    ...rect,
    width: Math.max(12, rect.width),
    height: Math.max(12, rect.height),
    x: clamp(rect.x, 0, Math.max(0, scene.room.width - Math.max(12, rect.width))),
    y: clamp(rect.y, 0, Math.max(0, scene.room.height - Math.max(12, rect.height)))
  };
}

function firstSurface(scene: LayoutScene): Surface | undefined {
  return scene.room.surfaces[0];
}

function centerPoint(scene: LayoutScene): Vec2 {
  return { x: scene.room.width / 2, y: scene.room.height / 2 };
}

function defaultSurface(scene: LayoutScene): Surface {
  const id = uniqueId(scene, "surface");
  return clampRectToRoom(
    {
      id,
      label: `Worktop ${scene.room.surfaces.length + 1}`,
      kind: "worktop",
      wallEdge: "none",
      x: centerPoint(scene).x - 130,
      y: centerPoint(scene).y - 42,
      width: 260,
      height: 84
    },
    scene
  );
}

function defaultFixture(scene: LayoutScene): Fixture {
  const id = uniqueId(scene, "fixture");
  const surface = firstSurface(scene);
  const x = surface ? surface.x + surface.width / 2 - 52 : centerPoint(scene).x - 52;
  const y = surface ? surface.y + surface.height / 2 - 34 : centerPoint(scene).y - 34;
  return clampRectToRoom(
    {
      id,
      label: `Fixture ${scene.room.fixtures.length + 1}`,
      kind: "sink",
      surfaceId: surface?.id,
      x,
      y,
      width: 104,
      height: 68,
      clearance: 26
    },
    scene
  );
}

function defaultAccessZone(scene: LayoutScene): AccessZone {
  const id = uniqueId(scene, "access");
  const fixture = scene.room.fixtures[0];
  const surface = firstSurface(scene);
  const x = fixture ? fixture.x - 10 : surface ? surface.x + 20 : centerPoint(scene).x - 70;
  const y = fixture ? fixture.y + fixture.height + 8 : surface ? surface.y + surface.height - 36 : centerPoint(scene).y - 20;
  return clampRectToRoom(
    {
      id,
      label: `Access ${scene.room.accessZones?.length ? scene.room.accessZones.length + 1 : 1}`,
      kind: fixture ? "fixture" : "worktopFront",
      targetId: fixture?.id ?? surface?.id,
      x,
      y,
      width: 140,
      height: 36,
      importance: 1
    },
    scene
  );
}

function defaultPathway(scene: LayoutScene): Pathway {
  const id = uniqueId(scene, "pathway");
  return {
    id,
    label: `Pathway ${scene.room.pathways?.length ? scene.room.pathways.length + 1 : 1}`,
    start: { x: roomInset, y: scene.room.height - roomInset },
    end: { x: scene.room.width / 2, y: scene.room.height / 2 },
    width: 80,
    importance: 0.8
  };
}

export function addPrimitive(scene: LayoutScene, kind: EditablePrimitiveKind): AuthoringAddResult {
  if (kind === "surface") {
    const surface = defaultSurface(scene);
    return {
      scene: { ...scene, room: { ...scene.room, surfaces: [...scene.room.surfaces, surface] } },
      selection: { kind: "surface", id: surface.id }
    };
  }

  if (kind === "fixture") {
    const fixture = defaultFixture(scene);
    return {
      scene: { ...scene, room: { ...scene.room, fixtures: [...scene.room.fixtures, fixture] } },
      selection: { kind: "fixture", id: fixture.id }
    };
  }

  if (kind === "accessZone") {
    const accessZone = defaultAccessZone(scene);
    return {
      scene: { ...scene, room: { ...scene.room, accessZones: [...(scene.room.accessZones ?? []), accessZone] } },
      selection: { kind: "accessZone", id: accessZone.id }
    };
  }

  const pathway = defaultPathway(scene);
  return {
    scene: { ...scene, room: { ...scene.room, pathways: [...(scene.room.pathways ?? []), pathway] } },
    selection: { kind: "pathway", id: pathway.id }
  };
}

export function updatePrimitive(scene: LayoutScene, selection: EditableSelection | null, patch: PrimitivePatch): LayoutScene {
  if (!selection || selection.kind === "prop") {
    return scene;
  }

  if (selection.kind === "surface") {
    return {
      ...scene,
      room: {
        ...scene.room,
        surfaces: scene.room.surfaces.map((surface) =>
          surface.id === selection.id ? clampRectToRoom({ ...surface, ...patch } as Surface, scene) : surface
        )
      }
    };
  }

  if (selection.kind === "fixture") {
    return {
      ...scene,
      room: {
        ...scene.room,
        fixtures: scene.room.fixtures.map((fixture) =>
          fixture.id === selection.id
            ? clampRectToRoom({ ...fixture, ...patch, clearance: Math.max(0, Number(patch.clearance ?? fixture.clearance)) } as Fixture, scene)
            : fixture
        )
      }
    };
  }

  if (selection.kind === "accessZone") {
    return {
      ...scene,
      room: {
        ...scene.room,
        accessZones: (scene.room.accessZones ?? []).map((zone) =>
          zone.id === selection.id
            ? clampRectToRoom({ ...zone, ...patch, importance: Math.max(0, Number(patch.importance ?? zone.importance)) } as AccessZone, scene)
            : zone
        )
      }
    };
  }

  const pathwayKind = selection.kind;
  return {
    ...scene,
    room: {
      ...scene.room,
      pathways: (scene.room.pathways ?? []).map((pathway) => {
        if (pathway.id !== selection.id) {
          return pathway;
        }

        if (pathwayKind === "pathwayStart") {
          return { ...pathway, start: clampPointToRoom((patch.start ?? pathway.start) as Vec2, scene) };
        }
        if (pathwayKind === "pathwayEnd") {
          return { ...pathway, end: clampPointToRoom((patch.end ?? pathway.end) as Vec2, scene) };
        }
        return {
          ...pathway,
          ...patch,
          start: patch.start ? clampPointToRoom(patch.start as Vec2, scene) : pathway.start,
          end: patch.end ? clampPointToRoom(patch.end as Vec2, scene) : pathway.end,
          width: Math.max(8, Number(patch.width ?? pathway.width)),
          importance: Math.max(0, Number(patch.importance ?? pathway.importance))
        } as Pathway;
      })
    }
  };
}

export function movePrimitiveTo(scene: LayoutScene, selection: EditableSelection | null, point: Vec2): LayoutScene {
  if (!selection || selection.kind === "prop") {
    return scene;
  }

  const clampedPoint = clampPointToRoom(point, scene);
  if (selection.kind === "surface") {
    const surface = scene.room.surfaces.find((item) => item.id === selection.id);
    return surface ? updatePrimitive(scene, selection, { x: clampedPoint.x - surface.width / 2, y: clampedPoint.y - surface.height / 2 }) : scene;
  }

  if (selection.kind === "fixture") {
    const fixture = scene.room.fixtures.find((item) => item.id === selection.id);
    return fixture ? updatePrimitive(scene, selection, { x: clampedPoint.x - fixture.width / 2, y: clampedPoint.y - fixture.height / 2 }) : scene;
  }

  if (selection.kind === "accessZone") {
    const zone = scene.room.accessZones?.find((item) => item.id === selection.id);
    return zone ? updatePrimitive(scene, selection, { x: clampedPoint.x - zone.width / 2, y: clampedPoint.y - zone.height / 2 }) : scene;
  }

  const pathway = scene.room.pathways?.find((item) => item.id === selection.id);
  if (!pathway) {
    return scene;
  }

  if (selection.kind === "pathwayStart") {
    return updatePrimitive(scene, selection, { start: clampedPoint } as PrimitivePatch);
  }

  if (selection.kind === "pathwayEnd") {
    return updatePrimitive(scene, selection, { end: clampedPoint } as PrimitivePatch);
  }

  const center = { x: (pathway.start.x + pathway.end.x) / 2, y: (pathway.start.y + pathway.end.y) / 2 };
  const delta = { x: clampedPoint.x - center.x, y: clampedPoint.y - center.y };
  return updatePrimitive(scene, selection, {
    start: clampPointToRoom({ x: pathway.start.x + delta.x, y: pathway.start.y + delta.y }, scene),
    end: clampPointToRoom({ x: pathway.end.x + delta.x, y: pathway.end.y + delta.y }, scene)
  } as PrimitivePatch);
}

export function deletePrimitive(scene: LayoutScene, selection: EditableSelection | null): LayoutScene {
  if (!selection || selection.kind === "prop") {
    return scene;
  }

  if (selection.kind === "surface") {
    if (scene.room.surfaces.length <= 1) {
      return scene;
    }

    const remainingSurfaces = scene.room.surfaces.filter((surface) => surface.id !== selection.id);
    const fallback = remainingSurfaces[0];
    const removedFixtureIds = new Set(scene.room.fixtures.filter((fixture) => fixture.surfaceId === selection.id).map((fixture) => fixture.id));
    return {
      ...scene,
      room: {
        ...scene.room,
        surfaces: remainingSurfaces,
        fixtures: scene.room.fixtures.filter((fixture) => fixture.surfaceId !== selection.id),
        accessZones: (scene.room.accessZones ?? []).filter(
          (zone) => zone.targetId !== selection.id && (!zone.targetId || !removedFixtureIds.has(zone.targetId))
        )
      },
      props: scene.props.map((prop) => {
        if (prop.pose.surfaceId !== selection.id) {
          return prop;
        }
        const reassigned = {
          ...prop,
          allowedSurfaceIds: prop.allowedSurfaceIds.includes(fallback.id) ? prop.allowedSurfaceIds : [...prop.allowedSurfaceIds, fallback.id],
          pose: { ...prop.pose, surfaceId: fallback.id }
        };
        return clampPropToSurface(reassigned, fallback);
      })
    };
  }

  if (selection.kind === "fixture") {
    return {
      ...scene,
      room: {
        ...scene.room,
        fixtures: scene.room.fixtures.filter((fixture) => fixture.id !== selection.id),
        accessZones: (scene.room.accessZones ?? []).filter((zone) => zone.targetId !== selection.id)
      }
    };
  }

  if (selection.kind === "accessZone") {
    return {
      ...scene,
      room: { ...scene.room, accessZones: (scene.room.accessZones ?? []).filter((zone) => zone.id !== selection.id) }
    };
  }

  return {
    ...scene,
    room: { ...scene.room, pathways: (scene.room.pathways ?? []).filter((pathway) => pathway.id !== selection.id) }
  };
}

export function getSelectionLabel(scene: LayoutScene, selection: EditableSelection | null): string {
  if (!selection) {
    return "No selection";
  }

  if (selection.kind === "prop") {
    return scene.props.find((prop) => prop.id === selection.id)?.label ?? "Prop";
  }
  if (selection.kind === "surface") {
    return scene.room.surfaces.find((surface) => surface.id === selection.id)?.label ?? "Surface";
  }
  if (selection.kind === "fixture") {
    return scene.room.fixtures.find((fixture) => fixture.id === selection.id)?.label ?? "Fixture";
  }
  if (selection.kind === "accessZone") {
    return scene.room.accessZones?.find((zone) => zone.id === selection.id)?.label ?? "Access zone";
  }

  const label = scene.room.pathways?.find((pathway) => pathway.id === selection.id)?.label ?? "Pathway";
  if (selection.kind === "pathwayStart") {
    return `${label} start`;
  }
  if (selection.kind === "pathwayEnd") {
    return `${label} end`;
  }
  return label;
}

function clampPointToRoom(point: Vec2, scene: LayoutScene): Vec2 {
  return {
    x: clamp(point.x, 0, scene.room.width),
    y: clamp(point.y, 0, scene.room.height)
  };
}
