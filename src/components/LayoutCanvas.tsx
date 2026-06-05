import type { PointerEvent } from "react";
import { useRef, useState } from "react";
import { Lock, Move, Unlock } from "lucide-react";
import { axisRectToOrientedRect, orientedRectCorners } from "../domain/geometry";
import type { Fixture, LayoutScene, PropItem } from "../domain/types";

type LayoutCanvasProps = {
  scene: LayoutScene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveProp: (id: string, x: number, y: number) => void;
};

function getFixtureFill(fixture: Fixture): string {
  switch (fixture.kind) {
    case "sink":
      return "#a6d6e8";
    case "hob":
      return "#434a54";
    case "door":
      return "#d9c49a";
    case "window":
      return "#8dc9e8";
    default:
      return "#c8ccd2";
  }
}

function pointsForProp(prop: PropItem): string {
  return orientedRectCorners({
    id: prop.id,
    center: { x: prop.pose.x, y: prop.pose.y },
    width: prop.width,
    height: prop.height,
    rotation: prop.pose.rotation
  })
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function pointsForFixture(fixture: Fixture): string {
  return orientedRectCorners(axisRectToOrientedRect(fixture))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

export default function LayoutCanvas({ scene, selectedId, onSelect, onMoveProp }: LayoutCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const toSvgPoint = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragId) {
      return;
    }
    const point = toSvgPoint(event);
    onMoveProp(dragId, point.x, point.y);
  };

  const selectedProp = scene.props.find((prop) => prop.id === selectedId);

  return (
    <section className="canvas-panel" aria-label="Layout editor">
      <div className="canvas-toolbar">
        <div>
          <h1>{scene.name}</h1>
          <p>{scene.description}</p>
        </div>
        <div className="selected-chip">
          {selectedProp?.pinned ? <Lock size={16} /> : selectedProp ? <Unlock size={16} /> : <Move size={16} />}
          <span>{selectedProp ? selectedProp.label : "No selection"}</span>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="layout-svg"
        viewBox={`0 0 ${scene.room.width} ${scene.room.height}`}
        role="img"
        aria-label="Top-down kitchen worktop layout"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragId(null)}
        onPointerLeave={() => setDragId(null)}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onSelect(null);
          }
        }}
      >
        <rect className="room-floor" x="0" y="0" width={scene.room.width} height={scene.room.height} />
        {scene.room.walls.map((wall) => (
          <rect key={wall.id} className="wall" x={wall.x} y={wall.y} width={wall.width} height={wall.height} rx="2" />
        ))}
        {scene.room.surfaces.map((surface) => (
          <g key={surface.id}>
            <rect
              className="surface"
              x={surface.x}
              y={surface.y}
              width={surface.width}
              height={surface.height}
              rx="6"
            />
            <text className="surface-label" x={surface.x + 12} y={surface.y + 22}>
              {surface.label}
            </text>
          </g>
        ))}
        {(scene.room.accessZones ?? []).map((zone) => (
          <g key={zone.id}>
            <rect className={`access-zone access-zone-${zone.kind}`} x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="5" />
            <text className="access-label" x={zone.x + zone.width / 2} y={zone.y + zone.height / 2 + 4}>
              {zone.label}
            </text>
          </g>
        ))}
        {(scene.room.pathways ?? []).map((pathway) => (
          <g key={pathway.id}>
            <line
              className="pathway"
              x1={pathway.start.x}
              y1={pathway.start.y}
              x2={pathway.end.x}
              y2={pathway.end.y}
              strokeWidth={pathway.width}
            />
            <line className="pathway-center" x1={pathway.start.x} y1={pathway.start.y} x2={pathway.end.x} y2={pathway.end.y} />
          </g>
        ))}
        <line className="view-line" x1={scene.room.viewPoint.x} y1={scene.room.viewPoint.y} x2={scene.room.focalPoint.x} y2={scene.room.focalPoint.y} />
        <circle className="view-point" cx={scene.room.viewPoint.x} cy={scene.room.viewPoint.y} r="7" />
        <circle className="focal-point" cx={scene.room.focalPoint.x} cy={scene.room.focalPoint.y} r="6" />
        {scene.room.fixtures.map((fixture) => (
          <g key={fixture.id}>
            <polygon className={`fixture fixture-${fixture.kind}`} points={pointsForFixture(fixture)} fill={getFixtureFill(fixture)} />
            <text className={`fixture-label ${fixture.kind === "hob" ? "fixture-label-dark" : ""}`} x={fixture.x + fixture.width / 2} y={fixture.y + fixture.height / 2 + 4}>
              {fixture.label}
            </text>
          </g>
        ))}
        {scene.props.map((prop) => {
          const selected = prop.id === selectedId;
          return (
            <g
              key={prop.id}
              className={`prop-group ${selected ? "selected" : ""} ${prop.pinned ? "pinned" : ""}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(prop.id);
                if (!prop.pinned) {
                  setDragId(prop.id);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
            >
              <polygon className="prop-shape" points={pointsForProp(prop)} fill={prop.color} />
              <text className="prop-label" x={prop.pose.x} y={prop.pose.y + 4}>
                {prop.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
