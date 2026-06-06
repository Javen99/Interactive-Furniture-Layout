import { defaultWeights } from "./scoring";
import type { CostProfile, CostWeights, LayoutScene } from "./types";

export const costProfiles: CostProfile[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Keeps hard constraints, functional access, and visual terms in their default proportions.",
    weights: { ...defaultWeights }
  },
  {
    id: "accessibility-first",
    label: "Accessibility first",
    description: "Prioritizes clear fixtures, fronts, pathways, and collisions over visual display quality.",
    weights: {
      ...defaultWeights,
      collision: 92,
      clearance: 26,
      proximity: 10,
      centerEdge: 4,
      balance: 4,
      visibility: 3,
      accessibility: 38
    }
  },
  {
    id: "display-first",
    label: "Display first",
    description: "Raises balance, focal visibility, and surface placement while preserving hard constraints.",
    weights: {
      ...defaultWeights,
      clearance: 14,
      proximity: 10,
      centerEdge: 11,
      alignment: 7,
      balance: 12,
      visibility: 14,
      accessibility: 16
    }
  }
];

export const customCostProfile: CostProfile = {
  id: "custom",
  label: "Custom",
  description: "Manual weights from the current scene.",
  weights: { ...defaultWeights }
};

export function getCostProfile(profileId: CostProfile["id"]): CostProfile {
  return costProfiles.find((profile) => profile.id === profileId) ?? customCostProfile;
}

export function applyCostProfile(scene: LayoutScene, profileId: CostProfile["id"]): LayoutScene {
  const profile = getCostProfile(profileId);
  return {
    ...scene,
    weights: { ...profile.weights }
  };
}

export function updateSceneWeight(scene: LayoutScene, key: keyof CostWeights, value: number): LayoutScene {
  return {
    ...scene,
    weights: {
      ...scene.weights,
      [key]: value
    }
  };
}
