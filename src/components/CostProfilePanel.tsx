import { SlidersHorizontal } from "lucide-react";
import { costProfiles } from "../domain/costProfiles";
import type { CostProfile, CostWeights } from "../domain/types";

type CostProfilePanelProps = {
  profileId: CostProfile["id"];
  weights: CostWeights;
  onProfileChange: (profileId: CostProfile["id"]) => void;
  onWeightChange: (key: keyof CostWeights, value: number) => void;
};

const weightLabels: Array<{ key: keyof CostWeights; label: string }> = [
  { key: "containment", label: "Bounds" },
  { key: "collision", label: "Collision" },
  { key: "pinned", label: "Pinned" },
  { key: "clearance", label: "Clearance" },
  { key: "proximity", label: "Proximity" },
  { key: "centerEdge", label: "Surface" },
  { key: "alignment", label: "Align" },
  { key: "balance", label: "Balance" },
  { key: "visibility", label: "Visibility" },
  { key: "accessibility", label: "Access" }
];

export default function CostProfilePanel({ profileId, weights, onProfileChange, onWeightChange }: CostProfilePanelProps) {
  const selectedProfile = costProfiles.find((profile) => profile.id === profileId);

  return (
    <section className="panel cost-profile-panel">
      <div className="panel-title">
        <SlidersHorizontal size={18} />
        <h2>Cost Weights</h2>
      </div>
      <label className="field compact-field">
        <span>Profile</span>
        <select value={profileId} onChange={(event) => onProfileChange(event.target.value as CostProfile["id"])}>
          {costProfiles.map((profile) => (
            <option value={profile.id} key={profile.id}>
              {profile.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </label>
      <p className="panel-caption">{selectedProfile?.description ?? "Manual weight tuning for the current scene."}</p>
      <div className="weight-list">
        {weightLabels.map(({ key, label }) => (
          <label className="weight-field" key={key}>
            <span>{label}</span>
            <input type="range" min="0" max="140" step="1" value={weights[key]} onChange={(event) => onWeightChange(key, Number(event.target.value))} />
            <strong>{weights[key]}</strong>
          </label>
        ))}
      </div>
    </section>
  );
}
