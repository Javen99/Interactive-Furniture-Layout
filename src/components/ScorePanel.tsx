import { AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react";
import { getDominantTerms } from "../domain/scoring";
import type { ScoreResult } from "../domain/types";

type ScorePanelProps = {
  score: ScoreResult;
};

export default function ScorePanel({ score }: ScorePanelProps) {
  const maxWeighted = Math.max(...score.terms.map((term) => term.weighted), 1);
  const dominant = getDominantTerms(score, 2);

  return (
    <section className="panel score-panel">
      <div className="panel-title">
        <BarChart3 size={18} />
        <h2>Score</h2>
      </div>
      <div className="score-total">
        <span>{score.total.toFixed(2)}</span>
        <div className={score.hardViolations === 0 ? "status-pill ok" : "status-pill warn"}>
          {score.hardViolations === 0 ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {score.hardViolations === 0 ? "Clear" : `${score.hardViolations} hard`}
        </div>
      </div>
      <div className="dominant-terms">
        {dominant.map((term) => (
          <span key={term.key}>{term.label}</span>
        ))}
      </div>
      <div className="mini-metrics">
        <span>{score.hardCost.toFixed(1)} hard cost</span>
        <span>{score.softCost.toFixed(1)} soft cost</span>
      </div>
      <div className="term-list">
        {score.terms.map((term) => (
          <div className="term-row" key={term.key} title={term.explanation}>
            <div className="term-heading">
              <span>{term.label}</span>
              <strong>{term.weighted.toFixed(2)}</strong>
            </div>
            <div className="term-bar">
              <span style={{ width: `${Math.min(100, (term.weighted / maxWeighted) * 100)}%` }} />
            </div>
            <div className="term-meta">raw {term.raw.toFixed(2)} x {term.weight}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
