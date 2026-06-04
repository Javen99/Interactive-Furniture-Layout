import { BarChart3, Play, TestTube2 } from "lucide-react";
import type { BenchmarkResult, BenchmarkSummary } from "../domain/types";

type EvaluationPanelProps = {
  visible: boolean;
  results: BenchmarkResult[] | null;
  summary: BenchmarkSummary | null;
  onToggle: () => void;
  onRun: () => void;
};

function topTerm(result: BenchmarkResult) {
  return [...result.termDeltas].sort((a, b) => b.improvement - a.improvement)[0];
}

export default function EvaluationPanel({ visible, results, summary, onToggle, onRun }: EvaluationPanelProps) {
  return (
    <section className="panel benchmark-panel">
      <button className="panel-toggle" type="button" onClick={onToggle}>
        <TestTube2 size={17} />
        Evaluation
        <span>{summary ? `${Math.round(summary.successRate * 100)}%` : "idle"}</span>
      </button>
      {visible ? (
        <div className="benchmark-body">
          <button type="button" onClick={onRun}>
            <Play size={16} />
            Run scenario seeds
          </button>
          {results && summary ? (
            <>
              <div className="benchmark-summary">
                <div>
                  <small>Mean</small>
                  <strong>{summary.mean.toFixed(2)}</strong>
                </div>
                <div>
                  <small>Best</small>
                  <strong>{summary.best.toFixed(2)}</strong>
                </div>
                <div>
                  <small>Std dev</small>
                  <strong>{summary.standardDeviation.toFixed(2)}</strong>
                </div>
              </div>
              {results.map((result) => {
                const term = topTerm(result);
                return (
                  <div className="benchmark-card" key={result.seed}>
                    <div className="benchmark-row">
                      <span>{result.seed}</span>
                      <strong>{result.initialScore.toFixed(1)} to {result.optimizedScore.toFixed(1)}</strong>
                    </div>
                    <div className="mini-metrics">
                      <span>{result.improvement.toFixed(1)} total</span>
                      <span>{result.initialHardViolations} to {result.optimizedHardViolations} hard</span>
                      <span>{Math.round(result.acceptanceRate * 100)}% accepted</span>
                    </div>
                    <div className="diagnostic-note">
                      <BarChart3 size={14} />
                      <span>{term ? `${term.label} improved ${term.improvement.toFixed(1)}` : "No term delta"}</span>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="empty-state">No evaluation run yet.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

