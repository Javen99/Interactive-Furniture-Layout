import { useMemo, useState } from "react";
import { ChevronDown, ClipboardCheck, Play, TestTube2 } from "lucide-react";
import LayoutCanvas from "./components/LayoutCanvas";
import ScorePanel from "./components/ScorePanel";
import ObjectPalette from "./components/ObjectPalette";
import OptimizerPanel from "./components/OptimizerPanel";
import JsonPanel from "./components/JsonPanel";
import { clampPropToSurface, findSurfaceForProp, normalizeDegrees } from "./domain/geometry";
import { runBenchmark, summarizeBenchmark } from "./domain/evaluation";
import { cloneScene, generateSuggestions, normalizeScene } from "./domain/optimizer";
import { presets } from "./domain/presets";
import { scoreScene } from "./domain/scoring";
import { exportScene, importScene } from "./domain/serialization";
import type { LayoutScene, Suggestion } from "./domain/types";

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
  };

  const runOptimizer = () => {
    const nextSuggestions = generateSuggestions(scene, {
      seed,
      iterations,
      suggestionCount: 5,
      startTemperature: 18,
      endTemperature: 0.1
    });
    setSuggestions(nextSuggestions);
    setBenchmark(null);
  };

  const applySuggestion = (suggestion: Suggestion) => {
    setScene(cloneScene(suggestion.scene));
    setSelectedId(suggestion.scene.props[0]?.id ?? null);
    setBenchmark(null);
  };

  const resetScene = () => {
    const reset = cloneScene(baseline);
    setScene(reset);
    setSuggestions([]);
    setJson(exportScene(reset));
    setBenchmark(null);
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
      setJsonError(null);
      setBenchmark(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid scene JSON.");
    }
  };

  const runEvaluation = () => {
    const results = runBenchmark(scene, ["alpha", "bravo", "charlie"], Math.min(iterations, 2600));
    setBenchmark({ results, summary: summarizeBenchmark(results) });
    setBenchVisible(true);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar left-sidebar">
        <section className="panel preset-panel">
          <div className="panel-title">
            <ChevronDown size={18} />
            <h2>Preset</h2>
          </div>
          <select value={presetId} onChange={(event) => loadPreset(event.target.value)}>
            {presets.map((preset) => (
              <option value={preset.id} key={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </section>
        <ObjectPalette scene={scene} selectedId={selectedId} onSelect={setSelectedId} onRotate={rotateProp} onTogglePin={togglePin} />
        <OptimizerPanel
          seed={seed}
          iterations={iterations}
          suggestions={suggestions}
          onSeedChange={setSeed}
          onIterationsChange={setIterations}
          onRun={runOptimizer}
          onApplySuggestion={applySuggestion}
          onReset={resetScene}
        />
      </aside>
      <LayoutCanvas scene={scene} selectedId={selectedId} onSelect={setSelectedId} onMoveProp={moveProp} />
      <aside className="sidebar right-sidebar">
        <ScorePanel score={score} />
        <section className="panel benchmark-panel">
          <button className="panel-toggle" type="button" onClick={() => setBenchVisible((visible) => !visible)}>
            <TestTube2 size={17} />
            Evaluation
            <span>{benchmark ? `${benchmark.summary.successRate * 100}%` : "idle"}</span>
          </button>
          {benchVisible ? (
            <div className="benchmark-body">
              <button type="button" onClick={runEvaluation}>
                <Play size={16} />
                Run seeds
              </button>
              {benchmark ? (
                <>
                  <div className="benchmark-summary">
                    <div>
                      <small>Best</small>
                      <strong>{benchmark.summary.best.toFixed(2)}</strong>
                    </div>
                    <div>
                      <small>Median</small>
                      <strong>{benchmark.summary.median.toFixed(2)}</strong>
                    </div>
                    <div>
                      <small>Mean</small>
                      <strong>{benchmark.summary.mean.toFixed(2)}</strong>
                    </div>
                  </div>
                  {benchmark.results.map((result) => (
                    <div className="benchmark-row" key={result.seed}>
                      <span>{result.seed}</span>
                      <strong>{result.improvement.toFixed(2)}</strong>
                    </div>
                  ))}
                </>
              ) : (
                <p className="empty-state">No evaluation run yet.</p>
              )}
            </div>
          ) : null}
        </section>
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
