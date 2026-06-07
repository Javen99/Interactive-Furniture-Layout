import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import type { EditableSelection, ValidationIssue, ValidationReport } from "../domain/types";

type ValidationPanelProps = {
  report: ValidationReport;
  onSelectTarget: (selection: EditableSelection) => void;
};

function issueSelection(issue: ValidationIssue): EditableSelection | null {
  if (!issue.target.id) {
    return null;
  }

  switch (issue.target.kind) {
    case "prop":
      return { kind: "prop", id: issue.target.id };
    case "surface":
      return { kind: "surface", id: issue.target.id };
    case "fixture":
      return { kind: "fixture", id: issue.target.id };
    case "accessZone":
      return { kind: "accessZone", id: issue.target.id };
    case "pathway":
      return { kind: "pathway", id: issue.target.id };
    default:
      return null;
  }
}

export default function ValidationPanel({ report, onSelectTarget }: ValidationPanelProps) {
  const ok = report.errors.length === 0;
  const visibleIssues = report.issues.slice(0, 8);

  return (
    <section className="panel validation-panel">
      <div className="panel-title">
        {ok ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
        <h2>Validation</h2>
      </div>
      <div className="validation-summary">
        <span className={ok ? "status-pill ok" : "status-pill warn"}>{report.errors.length} errors</span>
        <span className="status-pill">{report.warnings.length} warnings</span>
      </div>
      {report.issues.length === 0 ? (
        <p className="empty-state">Scene is structurally valid.</p>
      ) : (
        <div className="validation-list">
          {visibleIssues.map((issue) => {
            const selection = issueSelection(issue);
            return (
              <button
                type="button"
                className={`validation-row ${issue.severity}`}
                key={issue.id}
                disabled={!selection}
                onClick={() => {
                  if (selection) {
                    onSelectTarget(selection);
                  }
                }}
              >
                <AlertTriangle size={15} />
                <span>{issue.message}</span>
              </button>
            );
          })}
          {report.issues.length > visibleIssues.length ? (
            <div className="validation-more">+{report.issues.length - visibleIssues.length} more issues</div>
          ) : null}
        </div>
      )}
    </section>
  );
}
