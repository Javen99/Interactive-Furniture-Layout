import { Check, Download, EyeOff, Shuffle } from "lucide-react";
import type { LayoutScene, StudyVote, Suggestion } from "../domain/types";

type ReviewPanelProps = {
  suggestions: Suggestion[];
  currentScene: LayoutScene;
  votes: StudyVote[];
  onVote: (suggestion: Suggestion, pair: [Suggestion, Suggestion]) => void;
  onExportReport: () => void;
  onApplySuggestion: (suggestion: Suggestion) => void;
};

function MiniLayout({ scene }: { scene: LayoutScene }) {
  return (
    <svg className="mini-layout" viewBox={`0 0 ${scene.room.width} ${scene.room.height}`} aria-label="Blind layout preview">
      <rect className="mini-floor" x="0" y="0" width={scene.room.width} height={scene.room.height} />
      {scene.room.surfaces.map((surface) => (
        <rect key={surface.id} className="mini-surface" x={surface.x} y={surface.y} width={surface.width} height={surface.height} rx="5" />
      ))}
      {scene.room.fixtures.map((fixture) => (
        <rect key={fixture.id} className={`mini-fixture mini-fixture-${fixture.kind}`} x={fixture.x} y={fixture.y} width={fixture.width} height={fixture.height} rx="4" />
      ))}
      {scene.props.map((prop) => (
        <rect
          key={prop.id}
          className="mini-prop"
          x={prop.pose.x - prop.width / 2}
          y={prop.pose.y - prop.height / 2}
          width={prop.width}
          height={prop.height}
          rx="4"
          fill={prop.color}
          transform={`rotate(${prop.pose.rotation} ${prop.pose.x} ${prop.pose.y})`}
        />
      ))}
    </svg>
  );
}

export default function ReviewPanel({ suggestions, currentScene, votes, onVote, onExportReport, onApplySuggestion }: ReviewPanelProps) {
  const pair = suggestions.slice(0, 2) as [Suggestion, Suggestion] | Suggestion[];

  return (
    <section className="panel review-panel">
      <div className="panel-title">
        <EyeOff size={18} />
        <h2>Blind Review</h2>
      </div>
      {pair.length < 2 ? (
        <p className="empty-state">Run the optimizer to compare two score-hidden suggestions.</p>
      ) : (
        <>
          <div className="review-pair">
            {pair.map((suggestion, index) => (
              <div className="review-card" key={suggestion.id}>
                <span>{index === 0 ? "A" : "B"}</span>
                <MiniLayout scene={suggestion.scene} />
                <div className="review-actions">
                  <button type="button" onClick={() => onVote(suggestion, pair as [Suggestion, Suggestion])}>
                    <Check size={15} />
                    Prefer
                  </button>
                  <button type="button" onClick={() => onApplySuggestion(suggestion)}>
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="diagnostic-note">
            <Shuffle size={14} />
            <span>Scores are hidden here; {votes.length} preference votes recorded for export.</span>
          </div>
          <button type="button" onClick={onExportReport} disabled={votes.length === 0}>
            <Download size={15} />
            Export study
          </button>
          <MiniLayout scene={currentScene} />
        </>
      )}
    </section>
  );
}
