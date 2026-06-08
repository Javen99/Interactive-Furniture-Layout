import { BoxSelect, DoorOpen, Layers3, Plus, Route, Trash2 } from "lucide-react";
import type {
  AccessZone,
  EditablePrimitiveKind,
  EditableSelection,
  Fixture,
  LayoutScene,
  Pathway,
  Surface
} from "../domain/types";
import { getSelectionLabel, type PrimitivePatch } from "../domain/authoring";

type AuthoringPanelProps = {
  scene: LayoutScene;
  selection: EditableSelection | null;
  onSelect: (selection: EditableSelection | null) => void;
  onAddPrimitive: (kind: EditablePrimitiveKind) => void;
  onUpdateSelection: (patch: PrimitivePatch) => void;
  onDeleteSelection: () => void;
  onAddPathwayWaypoint: (pathwayId: string) => void;
  onRemovePathwayWaypoint: (pathwayId: string, waypointIndex: number) => void;
};

type SelectedPrimitive =
  | { kind: "surface"; item: Surface }
  | { kind: "fixture"; item: Fixture }
  | { kind: "accessZone"; item: AccessZone }
  | { kind: "pathway" | "pathwayStart" | "pathwayEnd" | "pathwayWaypoint"; item: Pathway };

const primitiveButtons: Array<{ kind: EditablePrimitiveKind; label: string }> = [
  { kind: "surface", label: "Worktop" },
  { kind: "fixture", label: "Fixture" },
  { kind: "accessZone", label: "Access zone" },
  { kind: "pathway", label: "Pathway" }
];

function selectedPrimitive(scene: LayoutScene, selection: EditableSelection | null): SelectedPrimitive | null {
  if (!selection || selection.kind === "prop") {
    return null;
  }

  if (selection.kind === "surface") {
    const item = scene.room.surfaces.find((surface) => surface.id === selection.id);
    return item ? { kind: selection.kind, item } : null;
  }

  if (selection.kind === "fixture") {
    const item = scene.room.fixtures.find((fixture) => fixture.id === selection.id);
    return item ? { kind: selection.kind, item } : null;
  }

  if (selection.kind === "accessZone") {
    const item = scene.room.accessZones?.find((zone) => zone.id === selection.id);
    return item ? { kind: selection.kind, item } : null;
  }

  const item = scene.room.pathways?.find((pathway) => pathway.id === selection.id);
  return item ? { kind: selection.kind, item } : null;
}

function NumberField({
  label,
  value,
  min,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field compact-field">
      <span>{label}</span>
      <input type="number" min={min} step={step} value={Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field compact-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RectFields({ item, onUpdate }: { item: Surface | Fixture | AccessZone; onUpdate: (patch: PrimitivePatch) => void }) {
  return (
    <div className="field-grid">
      <NumberField label="X" value={item.x} onChange={(x) => onUpdate({ x })} />
      <NumberField label="Y" value={item.y} onChange={(y) => onUpdate({ y })} />
      <NumberField label="W" value={item.width} min={12} onChange={(width) => onUpdate({ width })} />
      <NumberField label="H" value={item.height} min={12} onChange={(height) => onUpdate({ height })} />
    </div>
  );
}

export default function AuthoringPanel({
  scene,
  selection,
  onSelect,
  onAddPrimitive,
  onUpdateSelection,
  onDeleteSelection,
  onAddPathwayWaypoint,
  onRemovePathwayWaypoint
}: AuthoringPanelProps) {
  const selected = selectedPrimitive(scene, selection);
  const selectedLabel = getSelectionLabel(scene, selection);
  const selectedWaypoint =
    selected?.kind === "pathwayWaypoint" && selection?.kind === "pathwayWaypoint"
      ? selected.item.waypoints?.[selection.waypointIndex]
      : null;
  const canDelete = Boolean(selected && !(selected.kind === "surface" && scene.room.surfaces.length <= 1));

  return (
    <section className="panel authoring-panel">
      <div className="panel-title">
        <Layers3 size={18} />
        <h2>Authoring</h2>
      </div>
      <div className="button-grid">
        {primitiveButtons.map((button) => (
          <button type="button" key={button.kind} onClick={() => onAddPrimitive(button.kind)}>
            <Plus size={15} />
            {button.label}
          </button>
        ))}
      </div>
      <div className="primitive-list">
        {scene.room.surfaces.map((surface) => (
          <button
            type="button"
            key={surface.id}
            className={selection?.kind === "surface" && selection.id === surface.id ? "primitive-row active" : "primitive-row"}
            onClick={() => onSelect({ kind: "surface", id: surface.id })}
          >
            <BoxSelect size={15} />
            <span>{surface.label}</span>
          </button>
        ))}
        {scene.room.fixtures.map((fixture) => (
          <button
            type="button"
            key={fixture.id}
            className={selection?.kind === "fixture" && selection.id === fixture.id ? "primitive-row active" : "primitive-row"}
            onClick={() => onSelect({ kind: "fixture", id: fixture.id })}
          >
            <DoorOpen size={15} />
            <span>{fixture.label}</span>
          </button>
        ))}
        {(scene.room.accessZones ?? []).map((zone) => (
          <button
            type="button"
            key={zone.id}
            className={selection?.kind === "accessZone" && selection.id === zone.id ? "primitive-row active" : "primitive-row"}
            onClick={() => onSelect({ kind: "accessZone", id: zone.id })}
          >
            <BoxSelect size={15} />
            <span>{zone.label}</span>
          </button>
        ))}
        {(scene.room.pathways ?? []).map((pathway) => (
          <div className="pathway-group" key={pathway.id}>
            <div className="pathway-row">
              <button
                type="button"
                className={selection?.kind === "pathway" && selection.id === pathway.id ? "primitive-row active" : "primitive-row"}
                onClick={() => onSelect({ kind: "pathway", id: pathway.id })}
              >
                <Route size={15} />
                <span>{pathway.label}</span>
              </button>
              <button type="button" onClick={() => onSelect({ kind: "pathwayStart", id: pathway.id })} title="Select pathway start">
                S
              </button>
              <button type="button" onClick={() => onSelect({ kind: "pathwayEnd", id: pathway.id })} title="Select pathway end">
                E
              </button>
            </div>
            {(pathway.waypoints ?? []).length > 0 ? (
              <div className="waypoint-list">
                {(pathway.waypoints ?? []).map((_, index) => (
                  <button
                    type="button"
                    key={`${pathway.id}-waypoint-${index}`}
                    className={
                      selection?.kind === "pathwayWaypoint" && selection.id === pathway.id && selection.waypointIndex === index
                        ? "waypoint-row active"
                        : "waypoint-row"
                    }
                    onClick={() => onSelect({ kind: "pathwayWaypoint", id: pathway.id, waypointIndex: index })}
                  >
                    W{index + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {selected ? (
        <div className="editor-fields">
          <div className="editor-heading">
            <strong>{selectedLabel}</strong>
            <button type="button" onClick={onDeleteSelection} disabled={!canDelete}>
              <Trash2 size={15} />
              Delete
            </button>
          </div>
          <TextField label="Label" value={selected.item.label} onChange={(label) => onUpdateSelection({ label })} />
          {selected.kind === "surface" ? (
            <>
              <label className="field compact-field">
                <span>Kind</span>
                <select value={selected.item.kind} onChange={(event) => onUpdateSelection({ kind: event.target.value as Surface["kind"] })}>
                  <option value="worktop">Worktop</option>
                  <option value="table">Table</option>
                  <option value="bed">Bed</option>
                </select>
              </label>
              <label className="field compact-field">
                <span>Wall</span>
                <select value={selected.item.wallEdge} onChange={(event) => onUpdateSelection({ wallEdge: event.target.value as Surface["wallEdge"] })}>
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="none">None</option>
                </select>
              </label>
              <RectFields item={selected.item} onUpdate={onUpdateSelection} />
            </>
          ) : null}
          {selected.kind === "fixture" ? (
            <>
              <label className="field compact-field">
                <span>Kind</span>
                <select value={selected.item.kind} onChange={(event) => onUpdateSelection({ kind: event.target.value as Fixture["kind"] })}>
                  <option value="sink">Sink</option>
                  <option value="hob">Hob</option>
                  <option value="door">Door</option>
                  <option value="window">Window</option>
                </select>
              </label>
              <label className="field compact-field">
                <span>Surface</span>
                <select value={selected.item.surfaceId ?? ""} onChange={(event) => onUpdateSelection({ surfaceId: event.target.value || undefined })}>
                  <option value="">Room</option>
                  {scene.room.surfaces.map((surface) => (
                    <option value={surface.id} key={surface.id}>
                      {surface.label}
                    </option>
                  ))}
                </select>
              </label>
              <RectFields item={selected.item} onUpdate={onUpdateSelection} />
              <NumberField label="Clear" value={selected.item.clearance} min={0} onChange={(clearance) => onUpdateSelection({ clearance })} />
            </>
          ) : null}
          {selected.kind === "accessZone" ? (
            <>
              <label className="field compact-field">
                <span>Kind</span>
                <select value={selected.item.kind} onChange={(event) => onUpdateSelection({ kind: event.target.value as AccessZone["kind"] })}>
                  <option value="fixture">Fixture</option>
                  <option value="worktopFront">Front</option>
                  <option value="doorApproach">Door</option>
                  <option value="pathway">Pathway</option>
                </select>
              </label>
              <label className="field compact-field">
                <span>Target</span>
                <select value={selected.item.targetId ?? ""} onChange={(event) => onUpdateSelection({ targetId: event.target.value || undefined })}>
                  <option value="">None</option>
                  {scene.room.fixtures.map((fixture) => (
                    <option value={fixture.id} key={fixture.id}>
                      {fixture.label}
                    </option>
                  ))}
                  {scene.room.surfaces.map((surface) => (
                    <option value={surface.id} key={surface.id}>
                      {surface.label}
                    </option>
                  ))}
                </select>
              </label>
              <RectFields item={selected.item} onUpdate={onUpdateSelection} />
              <NumberField label="Weight" value={selected.item.importance} min={0} step={0.1} onChange={(importance) => onUpdateSelection({ importance })} />
            </>
          ) : null}
          {selected.kind === "pathway" || selected.kind === "pathwayStart" || selected.kind === "pathwayEnd" || selected.kind === "pathwayWaypoint" ? (
            <>
              <div className="field-grid">
                <NumberField label="S X" value={selected.item.start.x} onChange={(x) => onUpdateSelection({ start: { ...selected.item.start, x } })} />
                <NumberField label="S Y" value={selected.item.start.y} onChange={(y) => onUpdateSelection({ start: { ...selected.item.start, y } })} />
                <NumberField label="E X" value={selected.item.end.x} onChange={(x) => onUpdateSelection({ end: { ...selected.item.end, x } })} />
                <NumberField label="E Y" value={selected.item.end.y} onChange={(y) => onUpdateSelection({ end: { ...selected.item.end, y } })} />
              </div>
              {selectedWaypoint && selection?.kind === "pathwayWaypoint" ? (
                <div className="field-grid">
                  <NumberField
                    label="W X"
                    value={selectedWaypoint.x}
                    onChange={(x) => {
                      const waypoints = [...(selected.item.waypoints ?? [])];
                      waypoints[selection.waypointIndex] = { ...selectedWaypoint, x };
                      onUpdateSelection({ waypoints });
                    }}
                  />
                  <NumberField
                    label="W Y"
                    value={selectedWaypoint.y}
                    onChange={(y) => {
                      const waypoints = [...(selected.item.waypoints ?? [])];
                      waypoints[selection.waypointIndex] = { ...selectedWaypoint, y };
                      onUpdateSelection({ waypoints });
                    }}
                  />
                </div>
              ) : null}
              <NumberField label="Width" value={selected.item.width} min={8} onChange={(width) => onUpdateSelection({ width })} />
              <NumberField label="Weight" value={selected.item.importance} min={0} step={0.1} onChange={(importance) => onUpdateSelection({ importance })} />
              <div className="button-row waypoint-actions">
                <button type="button" onClick={() => onAddPathwayWaypoint(selected.item.id)}>
                  <Plus size={15} />
                  Waypoint
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selection?.kind === "pathwayWaypoint") {
                      onRemovePathwayWaypoint(selected.item.id, selection.waypointIndex);
                    }
                  }}
                  disabled={selection?.kind !== "pathwayWaypoint"}
                >
                  <Trash2 size={15} />
                  Waypoint
                </button>
              </div>
              {(selected.item.waypoints ?? []).length > 0 ? (
                <div className="waypoint-field-list">
                  {(selected.item.waypoints ?? []).map((waypoint, index) => (
                    <button
                      type="button"
                      key={`${selected.item.id}-field-waypoint-${index}`}
                      className={
                        selection?.kind === "pathwayWaypoint" && selection.waypointIndex === index ? "waypoint-field active" : "waypoint-field"
                      }
                      onClick={() => onSelect({ kind: "pathwayWaypoint", id: selected.item.id, waypointIndex: index })}
                    >
                      <span>W{index + 1}</span>
                      <small>{`${Math.round(waypoint.x)}, ${Math.round(waypoint.y)}`}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <p className="empty-state">Select a scene primitive on the canvas or from the list.</p>
      )}
    </section>
  );
}
