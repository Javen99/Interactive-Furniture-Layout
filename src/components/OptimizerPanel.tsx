import { Play, RefreshCcw, SlidersHorizontal, Wand2 } from "lucide-react";
import type { OptimizerDiagnostics, Suggestion } from "../domain/types";

type OptimizerPanelProps = {
  seed: string;
  iterations: number;
  suggestions: Suggestion[];
  diagnostics: OptimizerDiagnostics | null;
  onSeedChange: (seed: string) => void;
  onIterationsChange: (iterations: number) => void;
  onRun: () => void;
  onApplySuggestion: (suggestion: Suggestion) => void;
  onReset: () => void;
};

export default function OptimizerPanel({
  seed,
  iterations,
  suggestions,
  diagnostics,
  onSeedChange,
  onIterationsChange,
  onRun,
  onApplySuggestion,
  onReset
}: OptimizerPanelProps) {
  return (
    <section className="panel optimizer-panel">
      <div className="panel-title">
        <Wand2 size={18} />
        <h2>Optimizer</h2>
      </div>
      <label className="field">
        <span>Seed</span>
        <input value={seed} onChange={(event) => onSeedChange(event.target.value)} />
      </label>
      <label className="field">
        <span>Iterations</span>
        <input
          type="range"
          min="500"
          max="9000"
          step="250"
          value={iterations}
          onChange={(event) => onIterationsChange(Number(event.target.value))}
        />
        <strong>{iterations}</strong>
      </label>
      <div className="button-row">
        <button className="primary" type="button" onClick={onRun}>
          <Play size={17} />
          Run
        </button>
        <button type="button" onClick={onReset}>
          <RefreshCcw size={17} />
          Reset
        </button>
      </div>
      <div className="suggestions">
        <div className="suggestions-title">
          <SlidersHorizontal size={16} />
          <span>Ranked suggestions</span>
        </div>
        {suggestions.length === 0 ? (
          <p className="empty-state">No suggestions yet.</p>
        ) : (
          suggestions.map((suggestion) => (
            <button
              type="button"
              className="suggestion-row"
              key={suggestion.id}
              onClick={() => onApplySuggestion(suggestion)}
              title="Apply suggestion"
            >
              <span>#{suggestion.rank}</span>
              <strong>{suggestion.score.total.toFixed(2)}</strong>
              <small>{suggestion.score.hardViolations === 0 ? "clear" : `${suggestion.score.hardViolations} hard`}</small>
            </button>
          ))
        )}
      </div>
      {diagnostics ? (
        <div className="mini-metrics optimizer-metrics">
          <span>{diagnostics.bestScore.toFixed(1)} best</span>
          <span>{Math.round(diagnostics.acceptanceRate * 100)}% accepted</span>
          <span>{diagnostics.bestHardViolations === 0 ? "clear" : `${diagnostics.bestHardViolations} hard`}</span>
        </div>
      ) : null}
    </section>
  );
}
