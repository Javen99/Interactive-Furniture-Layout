import type { AxisAlignedRect, PropItem, Surface, Vec2 } from "./types";

export type OrientedRect = {
  id: string;
  center: Vec2;
  width: number;
  height: number;
  rotation: number;
};

const EPSILON = 0.000001;

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function normalizeDegrees(degrees: number): number {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function rectCenter(rect: AxisAlignedRect): Vec2 {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

export function propToOrientedRect(prop: PropItem): OrientedRect {
  return {
    id: prop.id,
    center: { x: prop.pose.x, y: prop.pose.y },
    width: prop.width,
    height: prop.height,
    rotation: normalizeDegrees(prop.pose.rotation)
  };
}

export function axisRectToOrientedRect(rect: AxisAlignedRect): OrientedRect {
  return {
    id: rect.id,
    center: rectCenter(rect),
    width: rect.width,
    height: rect.height,
    rotation: 0
  };
}

export function orientedRectCorners(rect: OrientedRect): Vec2[] {
  const angle = degToRad(rect.rotation);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const local = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH }
  ];

  return local.map((point) => ({
    x: rect.center.x + point.x * cos - point.y * sin,
    y: rect.center.y + point.x * sin + point.y * cos
  }));
}

export function polygonAxes(points: Vec2[]): Vec2[] {
  const axes: Vec2[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const edge = { x: next.x - current.x, y: next.y - current.y };
    const normal = { x: -edge.y, y: edge.x };
    const length = Math.hypot(normal.x, normal.y) || 1;
    axes.push({ x: normal.x / length, y: normal.y / length });
  }
  return axes;
}

export function projectPolygon(points: Vec2[], axis: Vec2): { min: number; max: number } {
  let min = points[0].x * axis.x + points[0].y * axis.y;
  let max = min;
  for (const point of points.slice(1)) {
    const projection = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }
  return { min, max };
}

export function polygonsOverlap(a: Vec2[], b: Vec2[]): boolean {
  const axes = [...polygonAxes(a), ...polygonAxes(b)];
  return axes.every((axis) => {
    const projectionA = projectPolygon(a, axis);
    const projectionB = projectPolygon(b, axis);
    return projectionA.max > projectionB.min + EPSILON && projectionB.max > projectionA.min + EPSILON;
  });
}

export function orientedRectsOverlap(a: OrientedRect, b: OrientedRect): boolean {
  return polygonsOverlap(orientedRectCorners(a), orientedRectCorners(b));
}

export function orientedRectInsideAxisRect(rect: OrientedRect, container: AxisAlignedRect): boolean {
  return orientedRectCorners(rect).every(
    (point) =>
      point.x >= container.x - EPSILON &&
      point.x <= container.x + container.width + EPSILON &&
      point.y >= container.y - EPSILON &&
      point.y <= container.y + container.height + EPSILON
  );
}

export function pointToAxisRectDistance(point: Vec2, rect: AxisAlignedRect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

export function distanceBetweenAxisRects(a: AxisAlignedRect, b: AxisAlignedRect): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.hypot(dx, dy);
}

export function expandedRect(rect: AxisAlignedRect, amount: number): AxisAlignedRect {
  return {
    ...rect,
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2
  };
}

export function orientedRectAabb(rect: OrientedRect): AxisAlignedRect {
  const corners = orientedRectCorners(rect);
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  return {
    id: rect.id,
    label: rect.id,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function pointLineDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const lengthSquared = Math.max(distance(start, end) ** 2, EPSILON);
  const t = clamp(((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / lengthSquared, 0, 1);
  const projection = {
    x: start.x + t * (end.x - start.x),
    y: start.y + t * (end.y - start.y)
  };
  return distance(point, projection);
}

export function findSurfaceForProp(prop: PropItem, surfaces: Surface[]): Surface | undefined {
  return surfaces.find((surface) => surface.id === prop.pose.surfaceId);
}

export function getPlacementBounds(prop: PropItem, surface: Surface): AxisAlignedRect {
  const rotation = normalizeDegrees(prop.pose.rotation);
  const swaps = rotation === 90 || rotation === 270;
  const footprintWidth = swaps ? prop.height : prop.width;
  const footprintHeight = swaps ? prop.width : prop.height;

  return {
    id: `${prop.id}-bounds`,
    label: prop.label,
    x: surface.x + footprintWidth / 2,
    y: surface.y + footprintHeight / 2,
    width: Math.max(0, surface.width - footprintWidth),
    height: Math.max(0, surface.height - footprintHeight)
  };
}

export function clampPropToSurface(prop: PropItem, surface: Surface): PropItem {
  const bounds = getPlacementBounds(prop, surface);
  return {
    ...prop,
    pose: {
      ...prop.pose,
      surfaceId: surface.id,
      x: clamp(prop.pose.x, bounds.x, bounds.x + bounds.width),
      y: clamp(prop.pose.y, bounds.y, bounds.y + bounds.height)
    }
  };
}

export function nearestWallEdgeDistance(point: Vec2, surface: Surface): number {
  switch (surface.wallEdge) {
    case "top":
      return Math.abs(point.y - surface.y);
    case "right":
      return Math.abs(surface.x + surface.width - point.x);
    case "bottom":
      return Math.abs(surface.y + surface.height - point.y);
    case "left":
      return Math.abs(point.x - surface.x);
    default:
      return Math.min(
        Math.abs(point.x - surface.x),
        Math.abs(surface.x + surface.width - point.x),
        Math.abs(point.y - surface.y),
        Math.abs(surface.y + surface.height - point.y)
      );
  }
}

export function frontEdgeDistance(point: Vec2, surface: Surface): number {
  switch (surface.wallEdge) {
    case "top":
      return Math.abs(surface.y + surface.height - point.y);
    case "right":
      return Math.abs(point.x - surface.x);
    case "bottom":
      return Math.abs(point.y - surface.y);
    case "left":
      return Math.abs(surface.x + surface.width - point.x);
    default:
      return nearestWallEdgeDistance(point, surface);
  }
}

