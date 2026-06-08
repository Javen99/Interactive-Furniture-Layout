import {
  axisRectToOrientedRect,
  clamp,
  distance,
  findSurfaceForProp,
  frontEdgeDistance,
  getPlacementBounds,
  nearestWallEdgeDistance,
  orientedRectBlocksPathwaySegments,
  orientedRectInsideAxisRect,
  orientedRectsOverlap,
  rectCenter
} from "./geometry";
import type { CandidateSlot, Fixture, LayoutScene, PropItem, SlotGenerationOptions, Surface } from "./types";

const defaultMaxSlots = 24;

const fixtureTargets: Array<{ fixture: Fixture["kind"]; tags: string[]; preferred: number; tolerance: number }> = [
  { fixture: "sink", tags: ["soap", "washing", "towel"], preferred: 72, tolerance: 120 },
  { fixture: "hob", tags: ["pan", "pot", "cooking", "spice"], preferred: 90, tolerance: 140 }
];

function hasAnyTag(prop: PropItem, tags: string[]): boolean {
  return tags.some((tag) => prop.tags.includes(tag));
}

function slotRect(prop: PropItem, surface: Surface, x: number, y: number, rotation: number) {
  return {
    id: `${prop.id}-slot`,
    center: { x, y },
    width: prop.width,
    height: prop.height,
    rotation,
    surfaceId: surface.id
  };
}

function surfacePreferencePenalty(prop: PropItem, surface: Surface, x: number, y: number): number {
  const center = rectCenter(surface);
  const normalizedX = Math.abs(x - center.x) / Math.max(surface.width / 2, 1);
  const normalizedY = Math.abs(y - center.y) / Math.max(surface.height / 2, 1);
  const point = { x, y };

  switch (prop.preference) {
    case "center":
      return clamp((normalizedX + normalizedY) / 2, 0, 1);
    case "backEdge":
      return clamp((nearestWallEdgeDistance(point, surface) / Math.max(surface.height, surface.width, 1)) * 3, 0, 1);
    case "frontEdge":
      return clamp((frontEdgeDistance(point, surface) / Math.max(surface.height, surface.width, 1)) * 3, 0, 1);
    case "sideEdge": {
      const sideDistance = Math.min(Math.abs(x - surface.x), Math.abs(surface.x + surface.width - x));
      return clamp(sideDistance / Math.max(surface.width / 2, 1), 0, 1);
    }
    case "display":
      return clamp((normalizedX + normalizedY) / 2, 0, 1) * 0.65;
    default:
      return 0;
  }
}

function proximityPenalty(scene: LayoutScene, prop: PropItem, x: number, y: number): number {
  let penalty = 0;
  for (const target of fixtureTargets) {
    if (!hasAnyTag(prop, target.tags)) {
      continue;
    }
    const fixtures = scene.room.fixtures.filter((fixture) => fixture.kind === target.fixture);
    const closest = fixtures.reduce((best, fixture) => Math.min(best, distance({ x, y }, rectCenter(fixture))), Number.POSITIVE_INFINITY);
    if (Number.isFinite(closest)) {
      penalty += clamp(Math.abs(closest - target.preferred) / target.tolerance, 0, 1.5);
    }
  }
  return penalty;
}

function candidatePoints(bounds: ReturnType<typeof getPlacementBounds>): Array<{ x: number; y: number }> {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return [];
  }

  const minX = bounds.x;
  const maxX = bounds.x + bounds.width;
  const minY = bounds.y;
  const maxY = bounds.y + bounds.height;
  const midX = minX + bounds.width / 2;
  const midY = minY + bounds.height / 2;
  const thirdX = bounds.width / 3;
  const thirdY = bounds.height / 3;

  const points = [
    { x: minX, y: minY },
    { x: midX, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: midY },
    { x: midX, y: midY },
    { x: maxX, y: midY },
    { x: minX, y: maxY },
    { x: midX, y: maxY },
    { x: maxX, y: maxY },
    { x: minX + thirdX, y: minY + thirdY },
    { x: maxX - thirdX, y: minY + thirdY },
    { x: minX + thirdX, y: maxY - thirdY },
    { x: maxX - thirdX, y: maxY - thirdY }
  ];

  const seen = new Set<string>();
  return points.filter((point) => {
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function rotationsForProp(prop: PropItem, options?: SlotGenerationOptions): number[] {
  const rotations = options?.includeCurrentRotation ? [prop.pose.rotation, ...prop.orientationOptions] : prop.orientationOptions;
  return [...new Set(rotations.map((rotation) => ((rotation % 360) + 360) % 360))];
}

export function generateCandidateSlots(
  scene: LayoutScene,
  prop: PropItem,
  surface: Surface,
  options: SlotGenerationOptions = {}
): CandidateSlot[] {
  if (!prop.allowedSurfaceIds.includes(surface.id)) {
    return [];
  }

  const maxSlots = options.maxSlots ?? defaultMaxSlots;
  const slots: CandidateSlot[] = [];

  for (const rotation of rotationsForProp(prop, options)) {
    const rotatedProp = { ...prop, pose: { ...prop.pose, rotation, surfaceId: surface.id } };
    const bounds = getPlacementBounds(rotatedProp, surface);
    for (const point of candidatePoints(bounds)) {
      const rect = slotRect(prop, surface, point.x, point.y, rotation);
      if (!orientedRectInsideAxisRect(rect, surface)) {
        continue;
      }

      let fixturePenalty = 0;
      for (const fixture of scene.room.fixtures.filter((candidate) => candidate.surfaceId === surface.id && (candidate.kind === "sink" || candidate.kind === "hob"))) {
        if (orientedRectsOverlap(rect, axisRectToOrientedRect(fixture))) {
          fixturePenalty += 10;
        } else {
          const fixtureDistance = distance(point, rectCenter(fixture));
          fixturePenalty += clamp((fixture.clearance + Math.max(prop.width, prop.height) / 2 - fixtureDistance) / Math.max(fixture.clearance, 1), 0, 2);
        }
      }

      let accessPenalty = 0;
      for (const zone of scene.room.accessZones ?? []) {
        if (orientedRectsOverlap(rect, axisRectToOrientedRect(zone))) {
          accessPenalty += zone.importance;
        }
      }

      let pathwayPenalty = 0;
      for (const pathway of scene.room.pathways ?? []) {
        if (orientedRectBlocksPathwaySegments(rect, pathway)) {
          pathwayPenalty += pathway.importance;
        }
      }

      const preference = surfacePreferencePenalty(prop, surface, point.x, point.y);
      const proximity = proximityPenalty(scene, prop, point.x, point.y);
      const totalPenalty = preference + fixturePenalty * 2.5 + accessPenalty * 1.8 + pathwayPenalty * 1.6 + proximity;
      slots.push({
        id: `${prop.id}:${surface.id}:${Math.round(point.x)}:${Math.round(point.y)}:${rotation}`,
        propId: prop.id,
        surfaceId: surface.id,
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
        rotation,
        quality: Number((1 / (1 + totalPenalty)).toFixed(4)),
        penalties: {
          preference: Number(preference.toFixed(4)),
          fixture: Number(fixturePenalty.toFixed(4)),
          access: Number(accessPenalty.toFixed(4)),
          pathway: Number(pathwayPenalty.toFixed(4)),
          proximity: Number(proximity.toFixed(4))
        }
      });
    }
  }

  return slots
    .sort((a, b) => {
      if (b.quality !== a.quality) return b.quality - a.quality;
      if (a.rotation !== b.rotation) return a.rotation - b.rotation;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    })
    .slice(0, maxSlots);
}

export function generateCandidateSlotsForProp(scene: LayoutScene, prop: PropItem, options: SlotGenerationOptions = {}): CandidateSlot[] {
  return scene.room.surfaces
    .filter((surface) => prop.allowedSurfaceIds.includes(surface.id))
    .flatMap((surface) => generateCandidateSlots(scene, prop, surface, options))
    .sort((a, b) => b.quality - a.quality || a.surfaceId.localeCompare(b.surfaceId) || a.rotation - b.rotation)
    .slice(0, options.maxSlots ?? defaultMaxSlots);
}

export function applyCandidateSlot(prop: PropItem, slot: CandidateSlot): PropItem {
  return {
    ...prop,
    pose: {
      ...prop.pose,
      surfaceId: slot.surfaceId,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotation
    }
  };
}

export function selectedPropSlots(scene: LayoutScene, propId: string | null, maxSlots = 12): CandidateSlot[] {
  const prop = scene.props.find((candidate) => candidate.id === propId);
  if (!prop) {
    return [];
  }
  const surface = findSurfaceForProp(prop, scene.room.surfaces);
  if (!surface) {
    return generateCandidateSlotsForProp(scene, prop, { includeCurrentRotation: true, maxSlots });
  }
  return generateCandidateSlots(scene, prop, surface, { includeCurrentRotation: true, maxSlots });
}
