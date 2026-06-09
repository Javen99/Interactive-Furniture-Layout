import { distance } from "./geometry";
import { matcherHasCriteria, matcherMatchesProp, targetHasCriteria } from "./relationships";
import { generateCandidateSlots, generateCandidateSlotsForProp } from "./slots";
import type {
  AxisAlignedRect,
  CostWeights,
  FixtureKind,
  LayoutScene,
  Pathway,
  PropItem,
  RelationshipRule,
  ValidationIssue,
  ValidationReport,
  ValidationSeverity,
  ValidationTarget,
  Vec2
} from "./types";

const weightKeys: Array<keyof CostWeights> = [
  "containment",
  "collision",
  "pinned",
  "clearance",
  "proximity",
  "centerEdge",
  "alignment",
  "balance",
  "visibility",
  "accessibility"
];

type IdEntry = {
  id: string | undefined;
  target: ValidationTarget;
};

function makeIssue(severity: ValidationSeverity, target: ValidationTarget, message: string): ValidationIssue {
  const id = `${severity}:${target.kind}:${target.id ?? "global"}:${target.field ?? "item"}:${message}`;
  return { id, severity, target, message };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pointIsFinite(point: Vec2): boolean {
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

function pointInsideRoom(point: Vec2, scene: LayoutScene): boolean {
  return point.x >= 0 && point.x <= scene.room.width && point.y >= 0 && point.y <= scene.room.height;
}

function rectInsideRoom(rect: AxisAlignedRect, scene: LayoutScene): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= scene.room.width && rect.y + rect.height <= scene.room.height;
}

function validateRect(
  rect: AxisAlignedRect,
  target: ValidationTarget,
  scene: LayoutScene,
  issues: ValidationIssue[],
  options: { warnOutsideRoom?: boolean } = { warnOutsideRoom: true }
) {
  if (!rect.id || rect.id.trim().length === 0) {
    issues.push(makeIssue("error", { ...target, field: "id" }, `${target.kind} is missing an id.`));
  }
  if (!rect.label || rect.label.trim().length === 0) {
    issues.push(makeIssue("warning", { ...target, field: "label" }, `${target.kind} has no label.`));
  }

  for (const field of ["x", "y", "width", "height"] as const) {
    if (!isFiniteNumber(rect[field])) {
      issues.push(makeIssue("error", { ...target, field }, `${target.kind} ${field} must be a finite number.`));
    }
  }

  if (isFiniteNumber(rect.width) && rect.width <= 0) {
    issues.push(makeIssue("error", { ...target, field: "width" }, `${target.kind} width must be greater than zero.`));
  }
  if (isFiniteNumber(rect.height) && rect.height <= 0) {
    issues.push(makeIssue("error", { ...target, field: "height" }, `${target.kind} height must be greater than zero.`));
  }

  if (
    options.warnOutsideRoom &&
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > 0 &&
    rect.height > 0 &&
    !rectInsideRoom(rect, scene)
  ) {
    issues.push(makeIssue("warning", target, `${target.kind} is partly outside the room bounds.`));
  }
}

function collectIds(scene: LayoutScene): IdEntry[] {
  return [
    { id: scene.id, target: { kind: "scene", id: scene.id, field: "id" } },
    ...scene.room.walls.map((wall) => ({ id: wall.id, target: { kind: "wall" as const, id: wall.id, field: "id" } })),
    ...scene.room.surfaces.map((surface) => ({ id: surface.id, target: { kind: "surface" as const, id: surface.id, field: "id" } })),
    ...scene.room.fixtures.map((fixture) => ({ id: fixture.id, target: { kind: "fixture" as const, id: fixture.id, field: "id" } })),
    ...(scene.room.accessZones ?? []).map((zone) => ({ id: zone.id, target: { kind: "accessZone" as const, id: zone.id, field: "id" } })),
    ...(scene.room.pathways ?? []).map((pathway) => ({ id: pathway.id, target: { kind: "pathway" as const, id: pathway.id, field: "id" } })),
    ...(scene.relationships ?? []).map((rule) => ({ id: rule.id, target: { kind: "relationship" as const, id: rule.id, field: "id" } })),
    ...scene.props.map((prop) => ({ id: prop.id, target: { kind: "prop" as const, id: prop.id, field: "id" } }))
  ];
}

function validateDuplicateIds(scene: LayoutScene, issues: ValidationIssue[]) {
  const seen = new Map<string, ValidationTarget>();
  for (const entry of collectIds(scene)) {
    if (!entry.id || entry.id.trim().length === 0) {
      continue;
    }

    const existing = seen.get(entry.id);
    if (existing) {
      issues.push(makeIssue("error", entry.target, `Duplicate id "${entry.id}" also appears on ${existing.kind}.`));
    } else {
      seen.set(entry.id, entry.target);
    }
  }
}

function validateRoom(scene: LayoutScene, issues: ValidationIssue[]) {
  if (!scene.id || scene.id.trim().length === 0) {
    issues.push(makeIssue("error", { kind: "scene", field: "id" }, "Scene is missing an id."));
  }
  if (!scene.name || scene.name.trim().length === 0) {
    issues.push(makeIssue("warning", { kind: "scene", id: scene.id, field: "name" }, "Scene has no display name."));
  }
  if (!isFiniteNumber(scene.room.width) || scene.room.width <= 0) {
    issues.push(makeIssue("error", { kind: "room", field: "width" }, "Room width must be greater than zero."));
  }
  if (!isFiniteNumber(scene.room.height) || scene.room.height <= 0) {
    issues.push(makeIssue("error", { kind: "room", field: "height" }, "Room height must be greater than zero."));
  }
  if (!pointIsFinite(scene.room.viewPoint)) {
    issues.push(makeIssue("error", { kind: "room", field: "viewPoint" }, "View point must contain finite coordinates."));
  }
  if (!pointIsFinite(scene.room.focalPoint)) {
    issues.push(makeIssue("error", { kind: "room", field: "focalPoint" }, "Focal point must contain finite coordinates."));
  }
  if (Array.isArray(scene.room.surfaces) && scene.room.surfaces.length === 0) {
    issues.push(makeIssue("error", { kind: "room", field: "surfaces" }, "Scene must contain at least one surface."));
  }
}

function validateWeights(scene: LayoutScene, issues: ValidationIssue[]) {
  for (const key of weightKeys) {
    const value = scene.weights?.[key];
    if (!isFiniteNumber(value)) {
      issues.push(makeIssue("error", { kind: "weight", id: key, field: key }, `Weight "${key}" must be a finite number.`));
    } else if (value < 0) {
      issues.push(makeIssue("error", { kind: "weight", id: key, field: key }, `Weight "${key}" cannot be negative.`));
    }
  }
}

function validatePathway(pathway: Pathway, scene: LayoutScene, issues: ValidationIssue[]) {
  const target = { kind: "pathway" as const, id: pathway.id };
  if (!pathway.id || pathway.id.trim().length === 0) {
    issues.push(makeIssue("error", { ...target, field: "id" }, "Pathway is missing an id."));
  }
  if (!pathway.label || pathway.label.trim().length === 0) {
    issues.push(makeIssue("warning", { ...target, field: "label" }, "Pathway has no label."));
  }
  if (!pointIsFinite(pathway.start)) {
    issues.push(makeIssue("error", { ...target, field: "start" }, "Pathway start must contain finite coordinates."));
  }
  if (!pointIsFinite(pathway.end)) {
    issues.push(makeIssue("error", { ...target, field: "end" }, "Pathway end must contain finite coordinates."));
  }
  if (pointIsFinite(pathway.start) && pointIsFinite(pathway.end) && distance(pathway.start, pathway.end) <= 0.001) {
    issues.push(makeIssue("error", target, "Pathway start and end must not be the same point."));
  }
  if (!isFiniteNumber(pathway.width) || pathway.width <= 0) {
    issues.push(makeIssue("error", { ...target, field: "width" }, "Pathway width must be greater than zero."));
  }
  if (!isFiniteNumber(pathway.importance) || pathway.importance < 0) {
    issues.push(makeIssue("error", { ...target, field: "importance" }, "Pathway importance must be zero or greater."));
  }
  if (pointIsFinite(pathway.start) && !pointInsideRoom(pathway.start, scene)) {
    issues.push(makeIssue("warning", { ...target, field: "start" }, "Pathway start is outside the room bounds."));
  }
  if (pointIsFinite(pathway.end) && !pointInsideRoom(pathway.end, scene)) {
    issues.push(makeIssue("warning", { ...target, field: "end" }, "Pathway end is outside the room bounds."));
  }
  for (const [index, waypoint] of (pathway.waypoints ?? []).entries()) {
    const waypointTarget = { ...target, field: `waypoints.${index}` };
    if (!pointIsFinite(waypoint)) {
      issues.push(makeIssue("error", waypointTarget, `Pathway waypoint ${index + 1} must contain finite coordinates.`));
    } else if (!pointInsideRoom(waypoint, scene)) {
      issues.push(makeIssue("warning", waypointTarget, `Pathway waypoint ${index + 1} is outside the room bounds.`));
    }
  }
  const offRoomWaypoints = (pathway.waypoints ?? []).filter((waypoint) => pointIsFinite(waypoint) && !pointInsideRoom(waypoint, scene));
  if (offRoomWaypoints.length > 2) {
    issues.push(makeIssue("warning", { ...target, field: "waypoints" }, "Pathway has several off-room waypoints."));
  }
}

function validateProp(prop: PropItem, scene: LayoutScene, issues: ValidationIssue[]) {
  const target = { kind: "prop" as const, id: prop.id };
  const surfaceIds = new Set(scene.room.surfaces.map((surface) => surface.id));
  if (!prop.id || prop.id.trim().length === 0) {
    issues.push(makeIssue("error", { ...target, field: "id" }, "Prop is missing an id."));
  }
  if (!prop.label || prop.label.trim().length === 0) {
    issues.push(makeIssue("warning", { ...target, field: "label" }, "Prop has no label."));
  }
  if (!isFiniteNumber(prop.width) || prop.width <= 0) {
    issues.push(makeIssue("error", { ...target, field: "width" }, "Prop width must be greater than zero."));
  }
  if (!isFiniteNumber(prop.height) || prop.height <= 0) {
    issues.push(makeIssue("error", { ...target, field: "height" }, "Prop height must be greater than zero."));
  }
  if (!pointIsFinite(prop.pose) || !isFiniteNumber(prop.pose.rotation)) {
    issues.push(makeIssue("error", { ...target, field: "pose" }, "Prop pose must contain finite coordinates and rotation."));
  }
  if (!surfaceIds.has(prop.pose.surfaceId)) {
    issues.push(makeIssue("error", { ...target, field: "pose.surfaceId" }, `Prop is placed on missing surface "${prop.pose.surfaceId}".`));
  }
  if (!Array.isArray(prop.allowedSurfaceIds) || prop.allowedSurfaceIds.length === 0) {
    issues.push(makeIssue("error", { ...target, field: "allowedSurfaceIds" }, "Prop must allow at least one surface."));
  } else {
    for (const surfaceId of prop.allowedSurfaceIds) {
      if (!surfaceIds.has(surfaceId)) {
        issues.push(makeIssue("error", { ...target, field: "allowedSurfaceIds" }, `Prop allows missing surface "${surfaceId}".`));
      }
    }
    if (!prop.allowedSurfaceIds.includes(prop.pose.surfaceId)) {
      issues.push(makeIssue("error", { ...target, field: "pose.surfaceId" }, "Prop is placed on a surface it does not allow."));
    }
  }
  if (pointIsFinite(prop.pose) && !pointInsideRoom(prop.pose, scene)) {
    issues.push(makeIssue("warning", { ...target, field: "pose" }, "Prop center is outside the room bounds."));
  }
  if (!Array.isArray(prop.orientationOptions) || prop.orientationOptions.length === 0 || prop.orientationOptions.some((angle) => !isFiniteNumber(angle))) {
    issues.push(makeIssue("error", { ...target, field: "orientationOptions" }, "Prop orientation options must contain finite numbers."));
  }
  if (prop.allowedSurfaceIds.some((surfaceId) => scene.room.surfaces.some((surface) => surface.id === surfaceId))) {
    const slots = generateCandidateSlotsForProp(scene, prop, { includeCurrentRotation: true, maxSlots: 1 });
    if (slots.length === 0) {
      issues.push(makeIssue("warning", target, "Prop is too large or constrained for any usable allowed surface slot."));
    }
  }
}

const fixtureKinds: FixtureKind[] = ["sink", "hob", "door", "window"];

function validateRelationship(rule: RelationshipRule, scene: LayoutScene, issues: ValidationIssue[]) {
  const target = { kind: "relationship" as const, id: rule.id };
  const propIds = new Set(scene.props.map((prop) => prop.id));
  const fixtureIds = new Set(scene.room.fixtures.map((fixture) => fixture.id));
  const subject = rule.subject ?? {};

  if (!rule.id || rule.id.trim().length === 0) {
    issues.push(makeIssue("error", { ...target, field: "id" }, "Relationship rule is missing an id."));
  }
  if (!rule.label || rule.label.trim().length === 0) {
    issues.push(makeIssue("warning", { ...target, field: "label" }, "Relationship rule has no label."));
  }
  if (typeof rule.enabled !== "boolean") {
    issues.push(makeIssue("error", { ...target, field: "enabled" }, "Relationship enabled must be true or false."));
  }
  if (rule.mode !== "near" && rule.mode !== "avoid") {
    issues.push(makeIssue("error", { ...target, field: "mode" }, "Relationship mode must be near or avoid."));
  }
  if (!isFiniteNumber(rule.distance) || rule.distance < 0) {
    issues.push(makeIssue("error", { ...target, field: "distance" }, "Relationship distance must be zero or greater."));
  }
  if (!isFiniteNumber(rule.tolerance) || rule.tolerance <= 0) {
    issues.push(makeIssue("error", { ...target, field: "tolerance" }, "Relationship tolerance must be greater than zero."));
  }
  if (!isFiniteNumber(rule.strength) || rule.strength < 0) {
    issues.push(makeIssue("error", { ...target, field: "strength" }, "Relationship strength must be zero or greater."));
  }
  if (!rule.subject || !matcherHasCriteria(subject)) {
    issues.push(makeIssue("error", { ...target, field: "subject" }, "Relationship subject must include prop ids or tags."));
  }
  if (!rule.target || !targetHasCriteria(rule.target)) {
    issues.push(makeIssue("error", { ...target, field: "target" }, "Relationship target must include fixture/prop ids, fixture kinds, or prop tags."));
    return;
  }

  for (const propId of subject.propIds ?? []) {
    if (!propIds.has(propId)) {
      issues.push(makeIssue("error", { ...target, field: "subject.propIds" }, `Relationship subject references missing prop "${propId}".`));
    }
  }

  if (rule.target.kind === "fixture") {
    for (const fixtureId of rule.target.fixtureIds ?? []) {
      if (!fixtureIds.has(fixtureId)) {
        issues.push(makeIssue("error", { ...target, field: "target.fixtureIds" }, `Relationship target references missing fixture "${fixtureId}".`));
      }
    }
    for (const kind of rule.target.fixtureKinds ?? []) {
      if (!fixtureKinds.includes(kind)) {
        issues.push(makeIssue("error", { ...target, field: "target.fixtureKinds" }, `Relationship target has invalid fixture kind "${kind}".`));
      }
    }
  } else if (rule.target.kind === "prop") {
    for (const propId of rule.target.propIds ?? []) {
      if (!propIds.has(propId)) {
        issues.push(makeIssue("error", { ...target, field: "target.propIds" }, `Relationship target references missing prop "${propId}".`));
      }
    }
  } else {
    issues.push(makeIssue("error", { ...target, field: "target.kind" }, "Relationship target kind must be fixture or prop."));
    return;
  }

  if (!rule.enabled) {
    return;
  }

  if (rule.subject && !scene.props.some((prop) => matcherMatchesProp(subject, prop))) {
    issues.push(makeIssue("warning", { ...target, field: "subject" }, "Relationship subject matches no current props."));
  }

  let targetMatches = false;
  if (rule.target.kind === "fixture") {
    const fixtureTarget = rule.target;
    targetMatches = scene.room.fixtures.some(
      (fixture) => fixtureTarget.fixtureIds?.includes(fixture.id) || fixtureTarget.fixtureKinds?.includes(fixture.kind)
    );
  } else {
    const propTarget = rule.target;
    targetMatches = scene.props.some((prop) => propTarget.propIds?.includes(prop.id) || propTarget.tags?.some((tag) => prop.tags.includes(tag)));
  }
  if (!targetMatches) {
    issues.push(makeIssue("warning", { ...target, field: "target" }, "Relationship target matches no current fixtures or props."));
  }
}

export function validateScene(scene: LayoutScene): ValidationReport {
  const issues: ValidationIssue[] = [];
  validateRoom(scene, issues);
  validateDuplicateIds(scene, issues);
  validateWeights(scene, issues);

  const surfaceIds = new Set(scene.room.surfaces.map((surface) => surface.id));
  const fixtureIds = new Set(scene.room.fixtures.map((fixture) => fixture.id));
  const pathwayIds = new Set((scene.room.pathways ?? []).map((pathway) => pathway.id));
  const accessTargetIds = new Set([...surfaceIds, ...fixtureIds, ...pathwayIds]);

  for (const wall of scene.room.walls) {
    validateRect(wall, { kind: "wall", id: wall.id }, scene, issues);
  }

  for (const surface of scene.room.surfaces) {
    validateRect(surface, { kind: "surface", id: surface.id }, scene, issues);
    const hasUsableSlot = scene.props
      .filter((prop) => prop.allowedSurfaceIds.includes(surface.id))
      .some((prop) => generateCandidateSlots(scene, prop, surface, { includeCurrentRotation: true, maxSlots: 1 }).length > 0);
    if (!hasUsableSlot) {
      issues.push(makeIssue("warning", { kind: "surface", id: surface.id }, "Surface has no usable candidate slots for the current props."));
    }
  }

  for (const fixture of scene.room.fixtures) {
    validateRect(fixture, { kind: "fixture", id: fixture.id }, scene, issues);
    if (fixture.surfaceId && !surfaceIds.has(fixture.surfaceId)) {
      issues.push(makeIssue("error", { kind: "fixture", id: fixture.id, field: "surfaceId" }, `Fixture references missing surface "${fixture.surfaceId}".`));
    }
    if (!isFiniteNumber(fixture.clearance) || fixture.clearance < 0) {
      issues.push(makeIssue("error", { kind: "fixture", id: fixture.id, field: "clearance" }, "Fixture clearance must be zero or greater."));
    }
  }

  for (const zone of scene.room.accessZones ?? []) {
    validateRect(zone, { kind: "accessZone", id: zone.id }, scene, issues);
    if (zone.targetId && !accessTargetIds.has(zone.targetId)) {
      issues.push(makeIssue("error", { kind: "accessZone", id: zone.id, field: "targetId" }, `Access zone references missing target "${zone.targetId}".`));
    }
    if (!isFiniteNumber(zone.importance) || zone.importance < 0) {
      issues.push(makeIssue("error", { kind: "accessZone", id: zone.id, field: "importance" }, "Access zone importance must be zero or greater."));
    }
  }

  for (const pathway of scene.room.pathways ?? []) {
    validatePathway(pathway, scene, issues);
  }

  for (const prop of scene.props) {
    validateProp(prop, scene, issues);
  }

  for (const rule of scene.relationships ?? []) {
    validateRelationship(rule, scene, issues);
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return { errors, warnings, issues };
}

export function canRunOptimization(report: ValidationReport): boolean {
  return report.errors.length === 0;
}
