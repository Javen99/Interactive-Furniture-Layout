import { useMemo, useState } from "react";
import { ChevronDown, ClipboardCheck } from "lucide-react";
import DiagnosticsPanel from "./components/DiagnosticsPanel";
import EvaluationPanel from "./components/EvaluationPanel";
import ReviewPanel from "./components/ReviewPanel";
import LayoutCanvas from "./components/LayoutCanvas";
import ScorePanel from "./components/ScorePanel";
import ObjectPalette from "./components/ObjectPalette";
import OptimizerPanel from "./components/OptimizerPanel";
import JsonPanel from "./components/JsonPanel";
import { clampPropToSurface, findSurfaceForProp, normalizeDegrees } from "./domain/geometry";
import { createBenchmarkReport, runBenchmark, summarizeBenchmark } from "./domain/evaluation";
import { cloneScene, generateSuggestionsWithDiagnostics, normalizeScene } from "./domain/optimizer";
import { presets } from "./domain/presets";
import { scoreScene } from "./domain/scoring";
import { exportScene, importScene } from "./domain/serialization";
import type { LayoutScene, OptimizerDiagnostics, Suggestion } from "./domain/types";

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

export default function App() {
  const [presetId, setPresetId] = useState(presets[0].id);
  const [scene, setScene] = useState<LayoutScene>(() => cloneScene(presets[0]));
  const [baseline, setBaseline] = useState<LayoutScene>(() => cloneScene(presets[0]));
  const [selectedId, setSelectedId] = useState<string | null>(scene.props[0]?.id ?? null);
  const [seed, setSeed] = useState("layout-lab");
  const [iterations, setIterations] = useState(3500);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [diagnostics, setDiagnostics] = useState<OptimizerDiagnostics | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [json, setJson] = useState(() => exportScene(presets[0]));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [benchVisible, setBenchVisible] = useState(false);
  const [benchmark, setBenchmark] = useState<BenchmarkState | null>(null);

  const score = useMemo(() => scoreScene(scene, baseline), [scene, baseline]);

  const loadPreset = (id: string) => {
    const preset = presets.find((candidate) => candidate.id === id) ?? presets[0];
    const next = cloneScene(preset);
    setPresetId(id);
    setScene(next);
    setBaseline(cloneScene(next));
    setSelectedId(next.props[0]?.id ?? null);
    setSuggestions([]);
    setDiagnostics(null);
    setJson(exportScene(next));
    setJsonError(null);
    setBenchmark(null);
  };

  const moveProp = (id: string, x: number, y: number) => {
    setScene((current) =>
      applyProp(current, id, (prop) => {
        const surface = findSurfaceForProp(prop, current.room.surfaces);
        if (!surface || prop.pinned) {
          return prop;
        }
        return clampPropToSurface({ ...prop, pose: { ...prop.pose, x, y } }, surface);
      })
    );
    setBenchmark(null);
    setDiagnostics(null);
  };

  const rotateProp = (id: string) => {
    setScene((current) =>
      applyProp(current, id, (prop) => {
        if (prop.pinned) {
          return prop;
        }
        const surface = findSurfaceForProp(prop, current.room.surfaces);
        const rotated = { ...prop, pose: { ...prop.pose, rotation: nextOrientation(prop) } };
        return surface ? clampPropToSurface(rotated, surface) : rotated;
      })
    );
    setBenchmark(null);
    setDiagnostics(null);
  };

  const togglePin = (id: string) => {
    const currentProp = scene.props.find((prop) => prop.id === id);
    if (!currentProp) {
      return;
    }

    setScene((current) => applyProp(current, id, (prop) => ({ ...prop, pinned: !prop.pinned })));
    setBaseline((current) =>
      applyProp(current, id, (prop) => ({
        ...prop,
        pinned: !currentProp.pinned,
        pose: currentProp.pinned ? prop.pose : { ...currentProp.pose }
      }))
    );
    setBenchmark(null);
    setDiagnostics(null);
  };

  const runOptimizer = () => {
    if (isOptimizing) {
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
    setScene(cloneScene(suggestion.scene));
    setSelectedId(suggestion.scene.props[0]?.id ?? null);
    setBenchmark(null);
    setDiagnostics(null);
  };

  const resetScene = () => {
    const reset = cloneScene(baseline);
    setScene(reset);
    setSuggestions([]);
    setDiagnostics(null);
    setJson(exportScene(reset));
    setBenchmark(null);
  };

  const resetScenario = () => {
    loadPreset(presetId);
  };

  const exportCurrentScene = () => {
    const exported = exportScene(scene);
    setJson(exported);
    setJsonError(null);
    navigator.clipboard?.writeText(exported).catch(() => undefined);
  };

  const importCurrentScene = () => {
    try {
      const imported = normalizeScene(importScene(json));
      setScene(imported);
      setBaseline(cloneScene(imported));
      setSelectedId(imported.props[0]?.id ?? null);
      setSuggestions([]);
      setDiagnostics(null);
      setJsonError(null);
      setBenchmark(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid scene JSON.");
    }
  };

  const runEvaluation = () => {
    const results = runBenchmark(scene, scene.metadata?.evaluationSeeds ?? ["alpha", "bravo", "charlie"], Math.min(iterations, 2600));
    setBenchmark({ results, summary: summarizeBenchmark(results) });
    setBenchVisible(true);
  };

  const exportBenchmarkReport = () => {
    if (!benchmark) {
      return;
    }
    const exported = JSON.stringify(createBenchmarkReport(scene, benchmark.results, suggestions), null, 2);
    setJson(exported);
    setJsonError(null);
    navigator.clipboard?.writeText(exported).catch(() => undefined);
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
        </section>
        <ObjectPalette scene={scene} selectedId={selectedId} onSelect={setSelectedId} onRotate={rotateProp} onTogglePin={togglePin} />
        <OptimizerPanel
          seed={seed}
          iterations={iterations}
          suggestions={suggestions}
          diagnostics={diagnostics}
          isRunning={isOptimizing}
          onSeedChange={setSeed}
          onIterationsChange={setIterations}
          onRun={runOptimizer}
          onApplyBest={applyBestSuggestion}
          onApplySuggestion={applySuggestion}
          onReset={resetScene}
        />
      </aside>
      <LayoutCanvas scene={scene} selectedId={selectedId} onSelect={setSelectedId} onMoveProp={moveProp} />
      <aside className="sidebar right-sidebar">
        <ScorePanel score={score} />
        <EvaluationPanel
          visible={benchVisible}
          results={benchmark?.results ?? null}
          summary={benchmark?.summary ?? null}
          onToggle={() => setBenchVisible((visible) => !visible)}
          onRun={runEvaluation}
          onExportReport={exportBenchmarkReport}
        />
        <DiagnosticsPanel diagnostics={diagnostics} />
        <ReviewPanel suggestions={suggestions} currentScene={scene} onApplySuggestion={applySuggestion} />
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
