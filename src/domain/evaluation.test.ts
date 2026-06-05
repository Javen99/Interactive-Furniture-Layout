import { describe, expect, it } from "vitest";
import { createBenchmarkReport, runBenchmark, summarizeBenchmark } from "./evaluation";
import { presets } from "./presets";
import { scoreScene } from "./scoring";

describe("evaluation", () => {
  it("summarizes benchmark runs deterministically", () => {
    const seeds = ["stable-a", "stable-b", "stable-c"];
    const first = runBenchmark(presets[0], seeds, 700);
    const second = runBenchmark(presets[0], seeds, 700);
    expect(first.map((result) => result.optimizedScore)).toEqual(second.map((result) => result.optimizedScore));
    expect(summarizeBenchmark(first)).toEqual(summarizeBenchmark(second));
  });

  it("does not regress bundled scenario baselines", () => {
    for (const preset of presets) {
      const baseline = scoreScene(preset);
      const seeds = preset.metadata?.evaluationSeeds.slice(0, 2) ?? ["baseline-a", "baseline-b"];
      const results = runBenchmark(preset, seeds, 700);
      expect(Math.min(...results.map((result) => result.optimizedScore))).toBeLessThanOrEqual(baseline.total);
      expect(results.every((result) => result.initialScore === baseline.total)).toBe(true);
    }
  });

  it("creates an exportable benchmark report", () => {
    const results = runBenchmark(presets[0], ["report-a", "report-b"], 500);
    const report = createBenchmarkReport(presets[0], results);
    expect(report.scenarioId).toBe(presets[0].id);
    expect(report.seeds).toEqual(["report-a", "report-b"]);
    expect(report.results).toEqual(results);
    expect(report.optimizedBestScore).toBeLessThanOrEqual(report.initialScore);
  });
});
