import { Lock, Pin, RotateCw, Unlock } from "lucide-react";
import type { LayoutScene } from "../domain/types";

type ObjectPaletteProps = {
  scene: LayoutScene;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRotate: (id: string) => void;
  onTogglePin: (id: string) => void;
};

export default function ObjectPalette({ scene, selectedId, onSelect, onRotate, onTogglePin }: ObjectPaletteProps) {
  return (
    <section className="panel object-panel">
      <div className="panel-title">
        <Pin size={18} />
        <h2>Props</h2>
      </div>
      <div className="prop-list">
        {scene.props.map((prop) => (
          <div className={`prop-item ${prop.id === selectedId ? "active" : ""}`} key={prop.id}>
            <button className="prop-select" type="button" onClick={() => onSelect(prop.id)} title={`Select ${prop.label}`}>
              <span className="color-dot" style={{ background: prop.color }} />
              <span>
                <strong>{prop.label}</strong>
                <small>{prop.preference}</small>
              </span>
            </button>
            <div className="prop-actions">
              <button type="button" onClick={() => onRotate(prop.id)} disabled={prop.pinned} title="Rotate">
                <RotateCw size={16} />
              </button>
              <button type="button" onClick={() => onTogglePin(prop.id)} title={prop.pinned ? "Unpin" : "Pin"}>
                {prop.pinned ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

