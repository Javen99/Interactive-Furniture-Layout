import { useMemo, useState } from "react";
import { ChevronDown, ClipboardCheck, Redo2, Undo2 } from "lucide-react";
import AuthoringPanel from "./components/AuthoringPanel";
import CostProfilePanel from "./components/CostProfilePanel";
import DiagnosticsPanel from "./components/DiagnosticsPanel";
import EvaluationPanel from "./components/EvaluationPanel";
import RelationshipPanel from "./components/RelationshipPanel";
import ReviewPanel from "./components/ReviewPanel";
import LayoutCanvas from "./components/LayoutCanvas";
import ScorePanel from "./components/ScorePanel";
import ObjectPalette from "./components/ObjectPalette";
import OptimizerPanel from "./components/OptimizerPanel";
import JsonPanel from "./components/JsonPanel";
import ValidationPanel from "./components/ValidationPanel";
import {
  addPathwayWaypoint,
  addPrimitive,
  deletePrimitive,
  movePrimitiveTo,
  removePathwayWaypoint,
  updatePrimitive,
  type PrimitivePatch
} from "./domain/authoring";
import { applyCostProfile, updateSceneWeight } from "./domain/costProfiles";
import { createJsonDownload, downloadJsonFile } from "./domain/downloads";
import { clampPropToSurface, findSurfaceForProp, normalizeDegrees } from "./domain/geometry";
import {
  createBenchmarkReport,
  createStudyReport,
  createStudyVote,
  replayBenchmarkSuggestions,
  runBenchmark,
  summarizeBenchmark
} from "./domain/evaluation";
import { cloneScene, generateSuggestionsWithDiagnostics, normalizeScene } from "./domain/optimizer";
import { presets } from "./domain/presets";
import { getSceneRelationshipRules } from "./domain/relationships";
import { scoreScene } from "./domain/scoring";
import { createSceneHistory, pushSceneHistory, redoSceneHistory, undoSceneHistory } from "./domain/sceneHistory";
import { exportScene, importScene } from "./domain/serialization";
import { canRunOptimization, validateScene } from "./domain/validation";
import type {
  CostProfile,
  EditablePrimitiveKind,
  EditableSelection,
  LayoutScene,
  OptimizerDiagnostics,
  RelationshipRule,
  StudyVote,
  Suggestion,
  Vec2
} from "./domain/types";

type BenchmarkState = {
  results: ReturnType<typeof runBenchmark>;
  summary: ReturnType<typeof summarizeBenchmark>;
};

function applyProp(scene: LayoutScene, propId: string, update: (prop: LayoutScene["props"][number]) => LayoutScene["props"][number]): LayoutScene {
  return {
    ...scene,
    props: scene.props.map((prop) => (prop.id === propId ? update(prop) : prop))
  };
}

function nextOrientation(prop: LayoutScene["props"][number]): number {
  const current = prop.orientationOptions.findIndex((angle) => normalizeDegrees(angle) === normalizeDegrees(prop.pose.rotation));
  if (current === -1) {
    return prop.orientationOptions[0] ?? 0;
  }
  return prop.orientationOptions[(current + 1) % prop.orientationOptions.length];
}

function sceneIds(scene: LayoutScene): Set<string> {
  return new Set([
    scene.id,
    ...scene.room.walls.map((item) => item.id),
    ...scene.room.surfaces.map((item) => item.id),
    ...scene.room.fixtures.map((item) => item.id),
    ...(scene.room.accessZones ?? []).map((item) => item.id),
    ...(scene.room.pathways ?? []).map((item) => item.id),
    ...scene.props.map((item) => item.id),
    ...(scene.relationships ?? []).map((item) => item.id)
  ]);
}

function uniqueRelationshipId(scene: LayoutScene, base: string): string {
  const ids = sceneIds(scene);
  let index = 1;
  let candidate = `${base}-${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
}

function newRelationshipRule(scene: LayoutScene): RelationshipRule {
  return {
    id: uniqueRelationshipId(scene, "relationship"),
    label: `Relationship ${(scene.relationships ?? []).length + 1}`,
    enabled: true,
    mode: "near",
    subject: { tags: ["prep"] },
    target: { kind: "fixture", fixtureKinds: ["sink"] },
    distance: 96,
    tolerance: 120,
    strength: 0.8
  };
}

export default function App() {
  const [presetId, setPresetId] = useState(presets[0].id);
  const [scene, setScene] = useState<LayoutScene>(() => cloneScene(presets[0]));
  const [sceneHistory, setSceneHistory] = useState(() => createSceneHistory(presets[0]));
  const [baseline, setBaseline] = useState<LayoutScene>(() => cloneScene(presets[0]));
  const [selection, setSelection] = useState<EditableSelection | null>(() => (presets[0].props[0] ? { kind: "prop", id: presets[0].props[0].id } : null));
  const [costProfileId, setCostProfileId] = useState<CostProfile["id"]>("balanced");
  const [seed, setSeed] = useState("layout-lab");
  const [iterations, setIterations] = useState(3500);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [diagnostics, setDiagnostics] = useState<OptimizerDiagnostics | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [json, setJson] = useState(() => exportScene(presets[0]));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [benchVisible, setBenchVisible] = useState(false);
  const [benchmark, setBenchmark] = useState<BenchmarkState | null>(null);
  const [studyVotes, setStudyVotes] = useState<StudyVote[]>([]);

  const score = useMemo(() => scoreScene(scene, baseline), [scene, baseline]);
  const validationReport = useMemo(() => validateScene(scene), [scene]);
  const canRun = canRunOptimization(validationReport);
  const selectedPropId = selection?.kind === "prop" ? selection.id : null;

  const clearGeneratedState = (clearSuggestions = true) => {
    if (clearSuggestions) {
      setSuggestions([]);
    }
    setDiagnostics(null);
    setBenchmark(null);
    setStudyVotes([]);
  };

  const rememberScene = (next: LayoutScene) => {
    setSceneHistory((current) => pushSceneHistory(current, next));
  };

  const setSceneWithHistory = (next: LayoutScene) => {
    setScene(next);
    rememberScene(next);
  };

  const setSceneFromHistory = (nextHistory: typeof sceneHistory) => {
    setSceneHistory(nextHistory);
    setScene(cloneScene(nextHistory.present));
    setBaseline(cloneScene(nextHistory.present));
    setSelection(nextHistory.present.props[0] ? { kind: "prop", id: nextHistory.present.props[0].id } : null);
    clearGeneratedState();
  };

  const loadPreset = (id: string) => {
    const preset = presets.find((candidate) => candidate.id === id) ?? presets[0];
    const next = cloneScene(preset);
    setPresetId(id);
    setSceneWithHistory(next);
    setBaseline(cloneScene(next));
    setSelection(next.props[0] ? { kind: "prop", id: next.props[0].id } : null);
    setCostProfileId("balanced");
    setSuggestions([]);
    setDiagnostics(null);
    setJson(exportScene(next));
    setJsonError(null);
    setBenchmark(null);
    setStudyVotes([]);
  };

  const moveProp = (id: string, x: number, y: number) => {
    setScene((current) => {
      const next = applyProp(current, id, (prop) => {
        const surface = findSurfaceForProp(prop, current.room.surfaces);
        if (!surface || prop.pinned) {
          return prop;
        }
        return clampPropToSurface({ ...prop, pose: { ...prop.pose, x, y } }, surface);
      });
      rememberScene(next);
      return next;
    });
    setBenchmark(null);
    setDiagnostics(null);
    setStudyVotes([]);
  };

  const rotateProp = (id: string) => {
    setScene((current) => {
      const next = applyProp(current, id, (prop) => {
        if (prop.pinned) {
          return prop;
        }
        const surface = findSurfaceForProp(prop, current.room.surfaces);
        const rotated = { ...prop, pose: { ...prop.pose, rotation: nextOrientation(prop) } };
        return surface ? clampPropToSurface(rotated, surface) : rotated;
      });
      rememberScene(next);
      return next;
    });
    setBenchmark(null);
    setDiagnostics(null);
    setStudyVotes([]);
  };

  const togglePin = (id: string) => {
    const currentProp = scene.props.find((prop) => prop.id === id);
    if (!currentProp) {
      return;
    }

    setScene((current) => {
      const next = applyProp(current, id, (prop) => ({ ...prop, pinned: !prop.pinned }));
      rememberScene(next);
      return next;
    });
    setBaseline((current) =>
      applyProp(current, id, (prop) => ({
        ...prop,
        pinned: !currentProp.pinned,
        pose: currentProp.pinned ? prop.pose : { ...currentProp.pose }
      }))
    );
    setBenchmark(null);
    setDiagnostics(null);
    setStudyVotes([]);
  };

  const runOptimizer = () => {
    if (isOptimizing || !canRun) {
      return;
    }
    setIsOptimizing(true);
    setBenchmark(null);
    window.setTimeout(() => {
      try {
        const run = generateSuggestionsWithDiagnostics(scene, {
          seed,
          iterations,
          suggestionCount: 5,
          startTemperature: 18,
          endTemperature: 0.1
        });
        setSuggestions(run.suggestions);
        setDiagnostics(run.diagnostics);
        setStudyVotes([]);
      } finally {
        setIsOptimizing(false);
      }
    }, 20);
  };

  const applyBestSuggestion = () => {
    const best = suggestions[0];
    if (best) {
      applySuggestion(best);
    }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    setSceneWithHistory(cloneScene(suggestion.scene));
    setSelection(suggestion.scene.props[0] ? { kind: "prop", id: suggestion.scene.props[0].id } : null);
    setBenchmark(null);
    setDiagnostics(null);
  };

  const resetScene = () => {
    const reset = cloneScene(baseline);
    setSceneWithHistory(reset);
    setSelection(reset.props[0] ? { kind: "prop", id: reset.props[0].id } : null);
    setSuggestions([]);
    setDiagnostics(null);
    setJson(exportScene(reset));
    setBenchmark(null);
    setStudyVotes([]);
  };

  const resetScenario = () => {
    loadPreset(presetId);
  };

  const exportCurrentScene = () => {
    const exported = exportScene(scene);
    const download = createJsonDownload(`${scene.id}-scene`, scene);
    setJson(exported);
    setJsonError(null);
    downloadJsonFile(download);
    navigator.clipboard?.writeText(exported).catch(() => undefined);
  };

  const importCurrentScene = () => {
    try {
      const imported = normalizeScene(importScene(json));
      setSceneWithHistory(imported);
      setBaseline(cloneScene(imported));
      setSelection(imported.props[0] ? { kind: "prop", id: imported.props[0].id } : null);
      setCostProfileId("custom");
      setSuggestions([]);
      setDiagnostics(null);
      setJsonError(null);
      setBenchmark(null);
      setStudyVotes([]);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid scene JSON.");
    }
  };

  const runEvaluation = () => {
    if (!canRun) {
      return;
    }
    const results = runBenchmark(scene, scene.metadata?.evaluationSeeds ?? ["alpha", "bravo", "charlie"], Math.min(iterations, 2600));
    setBenchmark({ results, summary: summarizeBenchmark(results) });
    setBenchVisible(true);
  };

  const replayEvaluationSeeds = () => {
    if (!canRun) {
      return;
    }
    const seeds = scene.metadata?.evaluationSeeds ?? ["alpha", "bravo", "charlie"];
    const cappedIterations = Math.min(iterations, 2600);
    const results = runBenchmark(scene, seeds, cappedIterations);
    setBenchmark({ results, summary: summarizeBenchmark(results) });
    setSuggestions(replayBenchmarkSuggestions(scene, seeds, cappedIterations, 5));
    setDiagnostics(null);
    setStudyVotes([]);
    setBenchVisible(true);
  };

  const exportBenchmarkReport = () => {
    if (!benchmark || !canRun) {
      return;
    }
    const report = createBenchmarkReport(scene, benchmark.results, suggestions);
    const download = createJsonDownload(`${scene.id}-benchmark`, report);
    const exported = download.content;
    setJson(exported);
    setJsonError(null);
    downloadJsonFile(download);
    navigator.clipboard?.writeText(exported).catch(() => undefined);
  };

  const addAuthoringPrimitive = (kind: EditablePrimitiveKind) => {
    setScene((current) => {
      const result = addPrimitive(current, kind);
      setSelection(result.selection);
      rememberScene(result.scene);
      return result.scene;
    });
    clearGeneratedState();
  };

  const updateAuthoringSelection = (patch: PrimitivePatch) => {
    setScene((current) => {
      const next = updatePrimitive(current, selection, patch);
      rememberScene(next);
      return next;
    });
    clearGeneratedState();
  };

  const deleteAuthoringSelection = () => {
    setScene((current) => {
      const next = deletePrimitive(current, selection);
      rememberScene(next);
      return next;
    });
    setSelection(null);
    clearGeneratedState();
  };

  const addAuthoringWaypoint = (pathwayId: string) => {
    const nextWaypointIndex = scene.room.pathways?.find((pathway) => pathway.id === pathwayId)?.waypoints?.length ?? 0;
    setScene((current) => {
      const next = addPathwayWaypoint(current, pathwayId);
      rememberScene(next);
      return next;
    });
    setSelection({ kind: "pathwayWaypoint", id: pathwayId, waypointIndex: nextWaypointIndex });
    clearGeneratedState();
  };

  const removeAuthoringWaypoint = (pathwayId: string, waypointIndex: number) => {
    setScene((current) => {
      const next = removePathwayWaypoint(current, pathwayId, waypointIndex);
      rememberScene(next);
      return next;
    });
    setSelection({ kind: "pathway", id: pathwayId });
    clearGeneratedState();
  };

  const moveAuthoringPrimitive = (target: EditableSelection, point: Vec2) => {
    setScene((current) => {
      const next = movePrimitiveTo(current, target, point);
      rememberScene(next);
      return next;
    });
    setBenchmark(null);
    setDiagnostics(null);
    setStudyVotes([]);
  };

  const addRelationshipRule = () => {
    setScene((current) => {
      const relationships = getSceneRelationshipRules(current);
      const next = { ...current, relationships: [...relationships, newRelationshipRule({ ...current, relationships })] };
      rememberScene(next);
      return next;
    });
    clearGeneratedState();
  };

  const updateRelationshipRule = (rule: RelationshipRule) => {
    setScene((current) => {
      const relationships = getSceneRelationshipRules(current).map((candidate) => (candidate.id === rule.id ? rule : candidate));
      const next = { ...current, relationships };
      rememberScene(next);
      return next;
    });
    clearGeneratedState();
  };

  const duplicateRelationshipRule = (ruleId: string) => {
    setScene((current) => {
      const relationships = getSceneRelationshipRules(current);
      const source = relationships.find((rule) => rule.id === ruleId);
      if (!source) {
        return current;
      }
      const duplicate = {
        ...source,
        id: uniqueRelationshipId({ ...current, relationships }, `${source.id}-copy`),
        label: `${source.label} copy`
      };
      const next = { ...current, relationships: [...relationships, duplicate] };
      rememberScene(next);
      return next;
    });
    clearGeneratedState();
  };

  const deleteRelationshipRule = (ruleId: string) => {
    setScene((current) => {
      const next = { ...current, relationships: getSceneRelationshipRules(current).filter((rule) => rule.id !== ruleId) };
      rememberScene(next);
      return next;
    });
    clearGeneratedState();
  };

  const changeCostProfile = (profileId: CostProfile["id"]) => {
    setCostProfileId(profileId);
    if (profileId !== "custom") {
      setScene((current) => {
        const next = applyCostProfile(current, profileId);
        rememberScene(next);
        return next;
      });
    }
    clearGeneratedState();
  };

  const changeCostWeight = (key: keyof LayoutScene["weights"], value: number) => {
    setCostProfileId("custom");
    setScene((current) => {
      const next = updateSceneWeight(current, key, value);
      rememberScene(next);
      return next;
    });
    clearGeneratedState();
  };

  const recordStudyVote = (suggestion: Suggestion, pair: [Suggestion, Suggestion]) => {
    setStudyVotes((current) => [...current, createStudyVote(scene, pair, suggestion.id)]);
  };

  const exportStudyReport = () => {
    if (!canRun) {
      return;
    }
    const report = createStudyReport(scene, studyVotes);
    const download = createJsonDownload(`${scene.id}-study`, report);
    const exported = download.content;
    setJson(exported);
    setJsonError(null);
    downloadJsonFile(download);
    navigator.clipboard?.writeText(exported).catch(() => undefined);
  };

  const undoScene = () => {
    if (sceneHistory.past.length === 0) {
      return;
    }
    setSceneFromHistory(undoSceneHistory(sceneHistory));
  };

  const redoScene = () => {
    if (sceneHistory.future.length === 0) {
      return;
    }
    setSceneFromHistory(redoSceneHistory(sceneHistory));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar left-sidebar">
        <section className="panel preset-panel">
          <div className="panel-title">
            <ChevronDown size={18} />
            <h2>Scenario</h2>
          </div>
          <select value={presetId} onChange={(event) => loadPreset(event.target.value)}>
            {presets.map((preset) => (
              <option value={preset.id} key={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <div className="scenario-meta">
            <span>{scene.metadata?.difficulty ?? "custom"}</span>
            <strong>{scene.metadata?.baselineName ?? "Imported scene"}</strong>
          </div>
          <div className="scenario-gallery">
            {presets.map((preset) => {
              const presetScore = scoreScene(preset);
              return (
                <button
                  type="button"
                  className={preset.id === presetId ? "scenario-card active" : "scenario-card"}
                  key={preset.id}
                  onClick={() => loadPreset(preset.id)}
                >
                  <span>{preset.metadata?.difficulty}</span>
                  <strong>{preset.name}</strong>
                  <small>{presetScore.total.toFixed(1)} baseline</small>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={resetScenario}>
            Reset scenario
          </button>
          <div className="button-row history-controls">
            <button type="button" onClick={undoScene} disabled={sceneHistory.past.length === 0}>
              <Undo2 size={16} />
              Undo
            </button>
            <button type="button" onClick={redoScene} disabled={sceneHistory.future.length === 0}>
              <Redo2 size={16} />
              Redo
            </button>
          </div>
        </section>
        <ObjectPalette
          scene={scene}
          selectedId={selectedPropId}
          onSelect={(id) => setSelection({ kind: "prop", id })}
          onRotate={rotateProp}
          onTogglePin={togglePin}
        />
        <AuthoringPanel
          scene={scene}
          selection={selection}
          onSelect={setSelection}
          onAddPrimitive={addAuthoringPrimitive}
          onUpdateSelection={updateAuthoringSelection}
          onDeleteSelection={deleteAuthoringSelection}
          onAddPathwayWaypoint={addAuthoringWaypoint}
          onRemovePathwayWaypoint={removeAuthoringWaypoint}
        />
        <OptimizerPanel
          seed={seed}
          iterations={iterations}
          suggestions={suggestions}
          diagnostics={diagnostics}
          isRunning={isOptimizing}
          canRun={canRun}
          disabledReason={canRun ? null : "Fix validation errors before running."}
          onSeedChange={setSeed}
          onIterationsChange={setIterations}
          onRun={runOptimizer}
          onApplyBest={applyBestSuggestion}
          onApplySuggestion={applySuggestion}
          onReset={resetScene}
        />
      </aside>
      <LayoutCanvas scene={scene} selection={selection} onSelect={setSelection} onMoveProp={moveProp} onMovePrimitive={moveAuthoringPrimitive} />
      <aside className="sidebar right-sidebar">
        <ScorePanel score={score} />
        <ValidationPanel report={validationReport} onSelectTarget={setSelection} />
        <CostProfilePanel profileId={costProfileId} weights={scene.weights} onProfileChange={changeCostProfile} onWeightChange={changeCostWeight} />
        <RelationshipPanel
          scene={scene}
          onAddRule={addRelationshipRule}
          onUpdateRule={updateRelationshipRule}
          onDuplicateRule={duplicateRelationshipRule}
          onDeleteRule={deleteRelationshipRule}
        />
        <EvaluationPanel
          visible={benchVisible}
          results={benchmark?.results ?? null}
          summary={benchmark?.summary ?? null}
          canRun={canRun}
          onToggle={() => setBenchVisible((visible) => !visible)}
          onRun={runEvaluation}
          onReplaySeeds={replayEvaluationSeeds}
          onExportReport={exportBenchmarkReport}
        />
        <DiagnosticsPanel diagnostics={diagnostics} />
        <ReviewPanel
          suggestions={suggestions}
          currentScene={scene}
          votes={studyVotes}
          canExport={canRun}
          onVote={recordStudyVote}
          onExportReport={exportStudyReport}
          onApplySuggestion={applySuggestion}
        />
        <JsonPanel json={json} error={jsonError} onJsonChange={setJson} onExport={exportCurrentScene} onImport={importCurrentScene} />
        <section className="panel research-note">
          <div className="panel-title">
            <ClipboardCheck size={18} />
            <h2>Research Basis</h2>
          </div>
          <p>
            Cost terms are inspired by public SIGGRAPH 2011 furniture-layout papers. This lab uses synthetic primitives and keeps the
            implementation standalone.
          </p>
        </section>
      </aside>
    </main>
  );
}
