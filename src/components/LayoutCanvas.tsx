import type { PointerEvent } from "react";
import { useRef, useState } from "react";
import { Lock, Move, PencilRuler, Unlock } from "lucide-react";
import { getSelectionLabel } from "../domain/authoring";
import { axisRectToOrientedRect, orientedRectCorners, pathwayToSegments } from "../domain/geometry";
import { selectedPropSlots } from "../domain/slots";
import type { CandidateSlot, EditableSelection, Fixture, LayoutScene, PropItem, Vec2 } from "../domain/types";

type LayoutCanvasProps = {
  scene: LayoutScene;
  selection: EditableSelection | null;
  onSelect: (selection: EditableSelection | null) => void;
  onMoveProp: (id: string, x: number, y: number) => void;
  onMovePrimitive: (selection: EditableSelection, point: Vec2) => void;
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

function pointsForSlot(prop: PropItem, slot: CandidateSlot): string {
  return orientedRectCorners({
    id: slot.id,
    center: { x: slot.x, y: slot.y },
    width: prop.width,
    height: prop.height,
    rotation: slot.rotation
  })
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

export default function LayoutCanvas({ scene, selection, onSelect, onMoveProp, onMovePrimitive }: LayoutCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragSelection, setDragSelection] = useState<EditableSelection | null>(null);

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
    if (!dragSelection) {
      return;
    }
    const point = toSvgPoint(event);
    if (dragSelection.kind === "prop") {
      onMoveProp(dragSelection.id, point.x, point.y);
    } else {
      onMovePrimitive(dragSelection, point);
    }
  };

  const selectedProp = selection?.kind === "prop" ? scene.props.find((prop) => prop.id === selection.id) : undefined;
  const slotPreview = selectedProp ? selectedPropSlots(scene, selectedProp.id, 10) : [];
  const selectedLabel = getSelectionLabel(scene, selection);

  const selectAndDrag = (event: PointerEvent<SVGElement>, nextSelection: EditableSelection, draggable = true) => {
    event.stopPropagation();
    onSelect(nextSelection);
    if (draggable) {
      setDragSelection(nextSelection);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  return (
    <section className="canvas-panel" aria-label="Layout editor">
      <div className="canvas-toolbar">
        <div>
          <h1>{scene.name}</h1>
          <p>{scene.description}</p>
        </div>
        <div className="selected-chip">
          {selectedProp?.pinned ? <Lock size={16} /> : selectedProp ? <Unlock size={16} /> : selection ? <PencilRuler size={16} /> : <Move size={16} />}
          <span>{selectedLabel}</span>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="layout-svg"
        viewBox={`0 0 ${scene.room.width} ${scene.room.height}`}
        role="img"
        aria-label="Top-down kitchen worktop layout"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragSelection(null)}
        onPointerLeave={() => setDragSelection(null)}
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
          <g
            key={surface.id}
            className={selection?.kind === "surface" && selection.id === surface.id ? "primitive-group selected" : "primitive-group"}
            onPointerDown={(event) => selectAndDrag(event, { kind: "surface", id: surface.id })}
          >
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
          <g
            key={zone.id}
            className={selection?.kind === "accessZone" && selection.id === zone.id ? "primitive-group selected" : "primitive-group"}
            onPointerDown={(event) => selectAndDrag(event, { kind: "accessZone", id: zone.id })}
          >
            <rect className={`access-zone access-zone-${zone.kind}`} x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="5" />
            <text className="access-label" x={zone.x + zone.width / 2} y={zone.y + zone.height / 2 + 4}>
              {zone.label}
            </text>
          </g>
        ))}
        {(scene.room.pathways ?? []).map((pathway) => (
          <g
            key={pathway.id}
            className={selection?.id === pathway.id && selection.kind.startsWith("pathway") ? "primitive-group selected" : "primitive-group"}
            onPointerDown={(event) => selectAndDrag(event, { kind: "pathway", id: pathway.id })}
          >
            {pathwayToSegments(pathway).map((segment) => (
              <line
                key={`${segment.id}-corridor`}
                className="pathway"
                x1={segment.start.x}
                y1={segment.start.y}
                x2={segment.end.x}
                y2={segment.end.y}
                strokeWidth={segment.width}
              />
            ))}
            {pathwayToSegments(pathway).map((segment) => (
              <line
                key={`${segment.id}-center`}
                className="pathway-center"
                x1={segment.start.x}
                y1={segment.start.y}
                x2={segment.end.x}
                y2={segment.end.y}
              />
            ))}
            <circle
              className={selection?.kind === "pathwayStart" && selection.id === pathway.id ? "pathway-handle selected" : "pathway-handle"}
              cx={pathway.start.x}
              cy={pathway.start.y}
              r="10"
              onPointerDown={(event) => selectAndDrag(event, { kind: "pathwayStart", id: pathway.id })}
            />
            {(pathway.waypoints ?? []).map((waypoint, index) => (
              <circle
                key={`${pathway.id}-waypoint-${index}`}
                className={
                  selection?.kind === "pathwayWaypoint" && selection.id === pathway.id && selection.waypointIndex === index
                    ? "pathway-handle pathway-waypoint selected"
                    : "pathway-handle pathway-waypoint"
                }
                cx={waypoint.x}
                cy={waypoint.y}
                r="8"
                onPointerDown={(event) => selectAndDrag(event, { kind: "pathwayWaypoint", id: pathway.id, waypointIndex: index })}
              />
            ))}
            <circle
              className={selection?.kind === "pathwayEnd" && selection.id === pathway.id ? "pathway-handle selected" : "pathway-handle"}
              cx={pathway.end.x}
              cy={pathway.end.y}
              r="10"
              onPointerDown={(event) => selectAndDrag(event, { kind: "pathwayEnd", id: pathway.id })}
            />
          </g>
        ))}
        <line className="view-line" x1={scene.room.viewPoint.x} y1={scene.room.viewPoint.y} x2={scene.room.focalPoint.x} y2={scene.room.focalPoint.y} />
        <circle className="view-point" cx={scene.room.viewPoint.x} cy={scene.room.viewPoint.y} r="7" />
        <circle className="focal-point" cx={scene.room.focalPoint.x} cy={scene.room.focalPoint.y} r="6" />
        {scene.room.fixtures.map((fixture) => (
          <g
            key={fixture.id}
            className={selection?.kind === "fixture" && selection.id === fixture.id ? "primitive-group selected" : "primitive-group"}
            onPointerDown={(event) => selectAndDrag(event, { kind: "fixture", id: fixture.id })}
          >
            <polygon className={`fixture fixture-${fixture.kind}`} points={pointsForFixture(fixture)} fill={getFixtureFill(fixture)} />
            <text className={`fixture-label ${fixture.kind === "hob" ? "fixture-label-dark" : ""}`} x={fixture.x + fixture.width / 2} y={fixture.y + fixture.height / 2 + 4}>
              {fixture.label}
            </text>
          </g>
        ))}
        {selectedProp ? (
          <g className="slot-preview-group" aria-label={`Candidate slots for ${selectedProp.label}`}>
            {slotPreview.map((slot, index) => (
              <g className={index === 0 ? "slot-preview best" : "slot-preview"} key={slot.id}>
                <polygon points={pointsForSlot(selectedProp, slot)} />
                <circle cx={slot.x} cy={slot.y} r="4" />
                <title>{`${slot.surfaceId} quality ${slot.quality.toFixed(2)}`}</title>
              </g>
            ))}
          </g>
        ) : null}
        {scene.props.map((prop) => {
          const selected = selection?.kind === "prop" && prop.id === selection.id;
          return (
            <g
              key={prop.id}
              className={`prop-group ${selected ? "selected" : ""} ${prop.pinned ? "pinned" : ""}`}
              onPointerDown={(event) => {
                selectAndDrag(event, { kind: "prop", id: prop.id }, !prop.pinned);
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
