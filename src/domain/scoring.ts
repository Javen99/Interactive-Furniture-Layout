import {
  axisRectToOrientedRect,
  clamp,
  distance,
  distanceBetweenAxisRects,
  expandedRect,
  findSurfaceForProp,
  nearestWallEdgeDistance,
  frontEdgeDistance,
  orientedRectAabb,
  orientedRectInsideAxisRect,
  orientedRectsOverlap,
  orientedRectBlocksPathway,
  pointLineDistance,
  propToOrientedRect,
  rectCenter
} from "./geometry";
import type { CostWeights, Fixture, LayoutScene, PropItem, ScoreResult, ScoreTerm, ScoreTermKey, Surface } from "./types";

export const defaultWeights: CostWeights = {
  containment: 90,
  collision: 80,
  pinned: 120,
  clearance: 18,
  proximity: 12,
  centerEdge: 6,
  alignment: 4,
  balance: 5,
  visibility: 5,
  accessibility: 22
};

const termLabels: Record<ScoreTermKey, string> = {
  containment: "Bounds",
  collision: "Collisions",
  pinned: "Pinned",
  clearance: "Clearance",
  proximity: "Proximity",
  centerEdge: "Surface fit",
  alignment: "Alignment",
  balance: "Balance",
  visibility: "Visibility",
  accessibility: "Access"
};

const termExplanations: Record<ScoreTermKey, string> = {
  containment: "Props must stay on an allowed surface.",
  collision: "Props should not overlap each other or fixed sink/hob cutouts.",
  pinned: "Pinned props should remain fixed while other props move.",
  clearance: "Sink and hob access zones should stay open.",
  proximity: "Tagged props prefer nearby fixtures, such as soap near the sink.",
  centerEdge: "Each prop prefers a practical zone on its surface.",
  alignment: "Rectangular props prefer clean worktop/wall alignment.",
  balance: "Props should not cluster heavily on one side of a surface.",
  visibility: "Display props prefer the focal view corridor.",
  accessibility: "Approach zones and pathways should stay usable."
};

const fixtureTargets: Array<{ fixture: Fixture["kind"]; tags: string[]; preferred: number; tolerance: number }> = [
  { fixture: "sink", tags: ["soap", "washing", "towel"], preferred: 72, tolerance: 120 },
  { fixture: "hob", tags: ["pan", "pot", "cooking", "spice"], preferred: 90, tolerance: 140 }
];

const hardTermKeys: ScoreTermKey[] = ["containment", "collision", "pinned"];

function makeTerm(key: ScoreTermKey, raw: number, weights: CostWeights): ScoreTerm {
  const roundedRaw = Number(raw.toFixed(4));
  const weight = weights[key] ?? defaultWeights[key];
  return {
    key,
    label: termLabels[key],
    raw: roundedRaw,
    weight,
    weighted: Number((roundedRaw * weight).toFixed(2)),
    explanation: termExplanations[key]
  };
}

function hasAnyTag(prop: PropItem, tags: string[]): boolean {
  return tags.some((tag) => prop.tags.includes(tag));
}

function fixturesOnSurface(fixtures: Fixture[], surfaceId: string): Fixture[] {
  return fixtures.filter((fixture) => fixture.surfaceId === surfaceId && (fixture.kind === "sink" || fixture.kind === "hob"));
}

function surfacePreferencePenalty(prop: PropItem, surface: Surface): number {
  const center = rectCenter(surface);
  const normalizedX = Math.abs(prop.pose.x - center.x) / Math.max(surface.width / 2, 1);
  const normalizedY = Math.abs(prop.pose.y - center.y) / Math.max(surface.height / 2, 1);

  switch (prop.preference) {
    case "center":
      return clamp((normalizedX + normalizedY) / 2, 0, 1);
    case "backEdge":
      return clamp(nearestWallEdgeDistance(prop.pose, surface) / Math.max(surface.height, surface.width, 1) * 3, 0, 1);
    case "frontEdge":
      return clamp(frontEdgeDistance(prop.pose, surface) / Math.max(surface.height, surface.width, 1) * 3, 0, 1);
    case "sideEdge": {
      const sideDistance = Math.min(Math.abs(prop.pose.x - surface.x), Math.abs(surface.x + surface.width - prop.pose.x));
      return clamp(sideDistance / Math.max(surface.width / 2, 1), 0, 1);
    }
    case "display":
      return clamp((normalizedX + normalizedY) / 2, 0, 1) * 0.65;
    default:
      return 0;
  }
}

function alignmentPenalty(prop: PropItem, surface: Surface): number {
  if (!prop.tags.includes("aligned")) {
    return 0;
  }

  const normalized = Math.abs(((prop.pose.rotation % 180) + 180) % 180);
  const nearestRightAngle = Math.min(normalized, Math.abs(90 - normalized), Math.abs(180 - normalized));
  const wallAlignedTarget = surface.wallEdge === "left" || surface.wallEdge === "right" ? 90 : 0;
  const targetDelta = Math.abs((((prop.pose.rotation - wallAlignedTarget) % 180) + 180) % 180);
  return clamp(Math.min(nearestRightAngle, targetDelta, 180 - targetDelta) / 45, 0, 1);
}

export function scoreScene(scene: LayoutScene, baseline: LayoutScene = scene): ScoreResult {
  let containment = 0;
  let collision = 0;
  let pinned = 0;
  let clearance = 0;
  let proximity = 0;
  let centerEdge = 0;
  let alignment = 0;
  let balance = 0;
  let visibility = 0;
  let accessibility = 0;
  let hardViolations = 0;

  const propRects = scene.props.map((prop) => ({ prop, rect: propToOrientedRect(prop), aabb: orientedRectAabb(propToOrientedRect(prop)) }));

  for (const { prop, rect } of propRects) {
    const surface = findSurfaceForProp(prop, scene.room.surfaces);
    if (!surface || !prop.allowedSurfaceIds.includes(surface.id) || !orientedRectInsideAxisRect(rect, surface)) {
      containment += 1;
      hardViolations += 1;
    } else {
      centerEdge += surfacePreferencePenalty(prop, surface);
      alignment += alignmentPenalty(prop, surface);
    }

    const baselineProp = baseline.props.find((candidate) => candidate.id === prop.id);
    if (prop.pinned && baselineProp) {
      const moved = distance(prop.pose, baselineProp.pose) / 24;
      const rotated = Math.abs(prop.pose.rotation - baselineProp.pose.rotation) / 90;
      const changedSurface = prop.pose.surfaceId === baselineProp.pose.surfaceId ? 0 : 1;
      const pinPenalty = moved + rotated + changedSurface;
      if (pinPenalty > 0.01) {
        hardViolations += 1;
      }
      pinned += pinPenalty;
    }
  }

  for (let i = 0; i < propRects.length; i += 1) {
    for (let j = i + 1; j < propRects.length; j += 1) {
      if (orientedRectsOverlap(propRects[i].rect, propRects[j].rect)) {
        collision += 1;
        hardViolations += 1;
      }
    }
  }

  for (const { prop, rect } of propRects) {
    const surface = findSurfaceForProp(prop, scene.room.surfaces);
    if (!surface) {
      continue;
    }

    for (const fixture of fixturesOnSurface(scene.room.fixtures, surface.id)) {
      if (orientedRectsOverlap(rect, axisRectToOrientedRect(fixture))) {
        collision += 1;
        hardViolations += 1;
      }

      const expanded = expandedRect(fixture, fixture.clearance);
      if (orientedRectsOverlap(rect, axisRectToOrientedRect(expanded))) {
        const distanceToFixture = distanceBetweenAxisRects(orientedRectAabb(rect), fixture);
        clearance += clamp((fixture.clearance - distanceToFixture) / Math.max(fixture.clearance, 1), 0, 1);
      }
    }
  }

  for (const target of fixtureTargets) {
    const matchingFixtures = scene.room.fixtures.filter((fixture) => fixture.kind === target.fixture);
    for (const prop of scene.props.filter((candidate) => hasAnyTag(candidate, target.tags))) {
      const closest = matchingFixtures.reduce(
        (best, fixture) => Math.min(best, distance(prop.pose, rectCenter(fixture))),
        Number.POSITIVE_INFINITY
      );
      if (Number.isFinite(closest)) {
        proximity += clamp(Math.abs(closest - target.preferred) / target.tolerance, 0, 1.5);
      }
    }
  }

  for (const surface of scene.room.surfaces) {
    const propsOnSurface = scene.props.filter((prop) => prop.pose.surfaceId === surface.id && !prop.tags.includes("utility"));
    if (propsOnSurface.length > 1) {
      const center = rectCenter(surface);
      const average = propsOnSurface.reduce(
        (sum, prop) => ({ x: sum.x + prop.pose.x / propsOnSurface.length, y: sum.y + prop.pose.y / propsOnSurface.length }),
        { x: 0, y: 0 }
      );
      balance += clamp(distance(average, center) / Math.max(surface.width, surface.height, 1), 0, 1);
    }
  }

  for (const prop of scene.props.filter((candidate) => candidate.preference === "display" || candidate.tags.includes("display"))) {
    visibility += clamp(pointLineDistance(prop.pose, scene.room.viewPoint, scene.room.focalPoint) / 170, 0, 1);
  }

  for (const { rect } of propRects) {
    for (const zone of scene.room.accessZones ?? []) {
      if (orientedRectsOverlap(rect, axisRectToOrientedRect(zone))) {
        accessibility += zone.importance;
      }
    }

    for (const pathway of scene.room.pathways ?? []) {
      if (orientedRectBlocksPathway(rect, pathway)) {
        accessibility += pathway.importance;
      }
    }
  }

  const terms = [
    makeTerm("containment", containment, scene.weights),
    makeTerm("collision", collision, scene.weights),
    makeTerm("pinned", pinned, scene.weights),
    makeTerm("clearance", clearance, scene.weights),
    makeTerm("proximity", proximity, scene.weights),
    makeTerm("centerEdge", centerEdge, scene.weights),
    makeTerm("alignment", alignment, scene.weights),
    makeTerm("balance", balance, scene.weights),
    makeTerm("visibility", visibility, scene.weights),
    makeTerm("accessibility", accessibility, scene.weights)
  ];
  const hardCost = terms.filter((term) => hardTermKeys.includes(term.key)).reduce((sum, term) => sum + term.weighted, 0);
  const total = terms.reduce((sum, term) => sum + term.weighted, 0);

  return {
    total: Number(total.toFixed(2)),
    hardCost: Number(hardCost.toFixed(2)),
    softCost: Number((total - hardCost).toFixed(2)),
    terms,
    hardViolations
  };
}

export function getDominantTerms(score: ScoreResult, limit = 3): ScoreTerm[] {
  return [...score.terms].sort((a, b) => b.weighted - a.weighted).slice(0, limit);
}
