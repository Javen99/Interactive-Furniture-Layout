import { useEffect, useMemo, useState } from "react";
import { Copy, GitPullRequestArrow, Plus, Trash2 } from "lucide-react";
import { getSceneRelationshipRules } from "../domain/relationships";
import type { FixtureKind, LayoutScene, RelationshipRule, RelationshipTarget } from "../domain/types";

type RelationshipPanelProps = {
  scene: LayoutScene;
  onAddRule: () => void;
  onUpdateRule: (rule: RelationshipRule) => void;
  onDuplicateRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
};

function parseList(value: string): string[] | undefined {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function formatList(value: string[] | undefined): string {
  return value?.join(", ") ?? "";
}

function targetSummary(target: RelationshipTarget): string {
  if (target.kind === "fixture") {
    return formatList(target.fixtureIds) || formatList(target.fixtureKinds) || "fixture";
  }
  return formatList(target.propIds) || formatList(target.tags) || "prop";
}

function ruleSummary(rule: RelationshipRule): string {
  return `${rule.mode} ${formatList(rule.subject.propIds) || formatList(rule.subject.tags) || "props"} -> ${targetSummary(rule.target)}`;
}

export default function RelationshipPanel({ scene, onAddRule, onUpdateRule, onDuplicateRule, onDeleteRule }: RelationshipPanelProps) {
  const rules = useMemo(() => getSceneRelationshipRules(scene), [scene]);
  const [selectedId, setSelectedId] = useState<string | null>(rules[0]?.id ?? null);
  const selectedRule = rules.find((rule) => rule.id === selectedId) ?? rules[0] ?? null;

  useEffect(() => {
    if (rules.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rules.some((rule) => rule.id === selectedId)) {
      setSelectedId(rules[0].id);
    }
  }, [rules, selectedId]);

  const updateSelected = (patch: Partial<RelationshipRule>) => {
    if (selectedRule) {
      onUpdateRule({ ...selectedRule, ...patch });
    }
  };

  const updateTarget = (target: RelationshipTarget) => {
    updateSelected({ target });
  };

  const updateFixtureTarget = (patch: Partial<Extract<RelationshipTarget, { kind: "fixture" }>>) => {
    if (selectedRule?.target.kind === "fixture") {
      updateTarget({ ...selectedRule.target, ...patch });
    }
  };

  const updatePropTarget = (patch: Partial<Extract<RelationshipTarget, { kind: "prop" }>>) => {
    if (selectedRule?.target.kind === "prop") {
      updateTarget({ ...selectedRule.target, ...patch });
    }
  };

  return (
    <section className="panel relationship-panel">
      <div className="panel-title">
        <GitPullRequestArrow size={18} />
        <h2>Relationship Rules</h2>
      </div>
      <p className="panel-caption">Rules feed the Relationships score and slot quality. Omitted scene rules use the built-in defaults.</p>
      <div className="relationship-actions">
        <button type="button" onClick={onAddRule}>
          <Plus size={15} />
          Rule
        </button>
        <button type="button" onClick={() => selectedRule && onDuplicateRule(selectedRule.id)} disabled={!selectedRule}>
          <Copy size={15} />
          Duplicate
        </button>
      </div>
      {rules.length === 0 ? (
        <p className="empty-state">No relationship rules. Add a rule or import a scene with rules.</p>
      ) : (
        <div className="relationship-list">
          {rules.map((rule) => (
            <button
              type="button"
              key={rule.id}
              className={rule.id === selectedRule?.id ? "relationship-row active" : "relationship-row"}
              onClick={() => setSelectedId(rule.id)}
            >
              <span>{rule.enabled ? "On" : "Off"}</span>
              <strong>{rule.label}</strong>
              <small>{ruleSummary(rule)}</small>
            </button>
          ))}
        </div>
      )}
      {selectedRule ? (
        <div className="relationship-editor">
          <label className="field compact-field">
            <span>Enabled</span>
            <input type="checkbox" checked={selectedRule.enabled} onChange={(event) => updateSelected({ enabled: event.target.checked })} />
          </label>
          <label className="field compact-field">
            <span>Label</span>
            <input value={selectedRule.label} onChange={(event) => updateSelected({ label: event.target.value })} />
          </label>
          <label className="field compact-field">
            <span>Mode</span>
            <select value={selectedRule.mode} onChange={(event) => updateSelected({ mode: event.target.value as RelationshipRule["mode"] })}>
              <option value="near">Near</option>
              <option value="avoid">Avoid</option>
            </select>
          </label>
          <div className="field-grid">
            <label className="field compact-field">
              <span>Dist</span>
              <input
                type="number"
                min="0"
                value={selectedRule.distance}
                onChange={(event) => updateSelected({ distance: Number(event.target.value) })}
              />
            </label>
            <label className="field compact-field">
              <span>Tol</span>
              <input
                type="number"
                min="1"
                value={selectedRule.tolerance}
                onChange={(event) => updateSelected({ tolerance: Number(event.target.value) })}
              />
            </label>
          </div>
          <label className="field compact-field">
            <span>Strength</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={selectedRule.strength}
              onChange={(event) => updateSelected({ strength: Number(event.target.value) })}
            />
          </label>
          <label className="field compact-field">
            <span>Sub IDs</span>
            <input
              value={formatList(selectedRule.subject.propIds)}
              onChange={(event) => updateSelected({ subject: { ...selectedRule.subject, propIds: parseList(event.target.value) } })}
            />
          </label>
          <label className="field compact-field">
            <span>Sub tags</span>
            <input
              value={formatList(selectedRule.subject.tags)}
              onChange={(event) => updateSelected({ subject: { ...selectedRule.subject, tags: parseList(event.target.value) } })}
            />
          </label>
          <label className="field compact-field">
            <span>Target</span>
            <select
              value={selectedRule.target.kind}
              onChange={(event) =>
                updateTarget(event.target.value === "fixture" ? { kind: "fixture", fixtureKinds: ["sink"] } : { kind: "prop", tags: ["display"] })
              }
            >
              <option value="fixture">Fixture</option>
              <option value="prop">Prop</option>
            </select>
          </label>
          {selectedRule.target.kind === "fixture" ? (
            <>
              <label className="field compact-field">
                <span>Fix IDs</span>
                <input
                  value={formatList(selectedRule.target.fixtureIds)}
                  onChange={(event) => updateFixtureTarget({ fixtureIds: parseList(event.target.value) })}
                />
              </label>
              <label className="field compact-field">
                <span>Kinds</span>
                <input
                  value={formatList(selectedRule.target.fixtureKinds)}
                  onChange={(event) => updateFixtureTarget({ fixtureKinds: parseList(event.target.value) as FixtureKind[] | undefined })}
                />
              </label>
            </>
          ) : (
            <>
              <label className="field compact-field">
                <span>Prop IDs</span>
                <input
                  value={formatList(selectedRule.target.propIds)}
                  onChange={(event) => updatePropTarget({ propIds: parseList(event.target.value) })}
                />
              </label>
              <label className="field compact-field">
                <span>Tags</span>
                <input
                  value={formatList(selectedRule.target.tags)}
                  onChange={(event) => updatePropTarget({ tags: parseList(event.target.value) })}
                />
              </label>
            </>
          )}
          <button type="button" onClick={() => onDeleteRule(selectedRule.id)}>
            <Trash2 size={15} />
            Delete rule
          </button>
        </div>
      ) : null}
    </section>
  );
}
