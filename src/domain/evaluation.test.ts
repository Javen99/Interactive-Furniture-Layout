import { describe, expect, it } from "vitest";
import {
  createBenchmarkReport,
  createStudyReport,
  createStudyVote,
  replayBenchmarkSuggestions,
  runBenchmark,
  summarizeBenchmark
} from "./evaluation";
import { generateSuggestions } from "./optimizer";
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

  it("replays benchmark seeds deterministically into ranked suggestions", () => {
    const seeds = ["replay-a", "replay-b", "replay-c"];
    const first = replayBenchmarkSuggestions(presets[0], seeds, 500, 3);
    const second = replayBenchmarkSuggestions(presets[0], seeds, 500, 3);
    expect(first.map((suggestion) => suggestion.id)).toEqual(second.map((suggestion) => suggestion.id));
    expect(first.map((suggestion) => suggestion.score.total)).toEqual(second.map((suggestion) => suggestion.score.total));
    expect(first.map((suggestion) => suggestion.rank)).toEqual([1, 2, 3]);
  });

  it("creates exportable blind-review study reports", () => {
    const pair = generateSuggestions(presets[0], { seed: "study", iterations: 700, suggestionCount: 2 }) as [ReturnType<typeof generateSuggestions>[number], ReturnType<typeof generateSuggestions>[number]];
    const vote = createStudyVote(presets[0], pair, pair[1].id, "2026-06-06T12:00:00.000Z");
    const report = createStudyReport(presets[0], [vote], "2026-06-06T12:05:00.000Z");
    expect(vote.selectedLabel).toBe("B");
    expect(vote.comparedSuggestionIds).toEqual([pair[0].id, pair[1].id]);
    expect(report.voteCount).toBe(1);
    expect(report.votes[0]).toEqual(vote);
  });
});
