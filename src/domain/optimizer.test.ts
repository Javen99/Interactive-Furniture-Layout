import { describe, expect, it } from "vitest";
import { generateSuggestions, generateSuggestionsWithDiagnostics, getPinnedDrift } from "./optimizer";
import { galleyKitchen } from "./presets";
import { scoreScene } from "./scoring";

describe("optimizer", () => {
  it("is deterministic for a fixed seed", () => {
    const first = generateSuggestions(galleyKitchen, { seed: "same", iterations: 800, suggestionCount: 3 });
    const second = generateSuggestions(galleyKitchen, { seed: "same", iterations: 800, suggestionCount: 3 });
    expect(first.map((suggestion) => suggestion.score.total)).toEqual(second.map((suggestion) => suggestion.score.total));
    expect(first[0].scene.props.map((prop) => Math.round(prop.pose.x))).toEqual(second[0].scene.props.map((prop) => Math.round(prop.pose.x)));
  });

  it("keeps pinned props fixed", () => {
    const [best] = generateSuggestions(galleyKitchen, { seed: "pins", iterations: 900, suggestionCount: 1 });
    expect(getPinnedDrift(best.scene, galleyKitchen)).toBe(0);
  });

  it("finds a layout no worse than the starting score", () => {
    const [best] = generateSuggestions(galleyKitchen, { seed: "improve", iterations: 1200, suggestionCount: 1 });
    expect(best.score.total).toBeLessThanOrEqual(scoreScene(galleyKitchen).total);
  });

  it("reports deterministic diagnostics", () => {
    const first = generateSuggestionsWithDiagnostics(galleyKitchen, { seed: "diag", iterations: 900, suggestionCount: 2 });
    const second = generateSuggestionsWithDiagnostics(galleyKitchen, { seed: "diag", iterations: 900, suggestionCount: 2 });
    expect(first.diagnostics.acceptanceRate).toBe(second.diagnostics.acceptanceRate);
    expect(first.diagnostics.bestScoreHistory).toEqual(second.diagnostics.bestScoreHistory);
    expect(first.diagnostics.topRejectedCostCauses).toEqual(second.diagnostics.topRejectedCostCauses);
  });
});
