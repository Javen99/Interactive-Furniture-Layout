import { Activity, TrendingDown } from "lucide-react";
import type { OptimizerDiagnostics } from "../domain/types";

type DiagnosticsPanelProps = {
  diagnostics: OptimizerDiagnostics | null;
};

export default function DiagnosticsPanel({ diagnostics }: DiagnosticsPanelProps) {
  if (!diagnostics) {
    return (
      <section className="panel diagnostics-panel">
        <div className="panel-title">
          <Activity size={18} />
          <h2>Diagnostics</h2>
        </div>
        <p className="empty-state">Run the optimizer to see move acceptance, best-score history, and rejected cost causes.</p>
      </section>
    );
  }

  const historyMax = Math.max(...diagnostics.bestScoreHistory.map((point) => point.score), 1);
  const historyMin = Math.min(...diagnostics.bestScoreHistory.map((point) => point.score), historyMax);
  const historyRange = Math.max(historyMax - historyMin, 1);

  return (
    <section className="panel diagnostics-panel">
      <div className="panel-title">
        <Activity size={18} />
        <h2>Diagnostics</h2>
      </div>
      <div className="metric-grid">
        <div>
          <small>Accepted</small>
          <strong>{diagnostics.acceptedMoves}</strong>
        </div>
        <div>
          <small>Rejected</small>
          <strong>{diagnostics.rejectedMoves}</strong>
        </div>
        <div>
          <small>Rate</small>
          <strong>{Math.round(diagnostics.acceptanceRate * 100)}%</strong>
        </div>
      </div>
      <div className="history-strip" aria-label="Best score history">
        {diagnostics.bestScoreHistory.map((point) => (
          <span
            key={`${point.iteration}-${point.score}`}
            title={`Iteration ${point.iteration}: ${point.score.toFixed(2)}`}
            style={{ height: `${20 + ((historyMax - point.score) / historyRange) * 46}px` }}
          />
        ))}
      </div>
      <div className="diagnostic-note">
        <TrendingDown size={15} />
        <span>
          Best {diagnostics.initialScore.toFixed(2)} to {diagnostics.bestScore.toFixed(2)}
          {diagnostics.bestHardViolations > 0 ? `, ${diagnostics.bestHardViolations} hard` : ", clear"}
        </span>
      </div>
      {diagnostics.topRejectedCostCauses.length > 0 ? (
        <div className="cause-list">
          {diagnostics.topRejectedCostCauses.map((cause) => (
            <div className="cause-row" key={cause.key}>
              <span>{cause.label}</span>
              <strong>{cause.count}</strong>
              <small>+{cause.weightedDelta.toFixed(1)}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No rejected move causes recorded.</p>
      )}
    </section>
  );
}

