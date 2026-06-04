import { generateSuggestionsWithDiagnostics } from "./optimizer";
import { scoreScene } from "./scoring";
import type { BenchmarkResult, BenchmarkSummary, LayoutScene } from "./types";

export function runBenchmark(scene: LayoutScene, seeds: string[], iterations = 2200): BenchmarkResult[] {
  const initial = scoreScene(scene);
  return seeds.map((seed) => {
    const run = generateSuggestionsWithDiagnostics(scene, {
      seed,
      iterations,
      suggestionCount: 1,
      startTemperature: 18,
      endTemperature: 0.1
    });
    const best = run.suggestions[0];
    return {
      seed,
      initialScore: initial.total,
      optimizedScore: best.score.total,
      initialHardViolations: initial.hardViolations,
      optimizedHardViolations: best.score.hardViolations,
      hardCostImprovement: Number((initial.hardCost - best.score.hardCost).toFixed(2)),
      softCostImprovement: Number((initial.softCost - best.score.softCost).toFixed(2)),
      improvement: Number((initial.total - best.score.total).toFixed(2)),
      acceptanceRate: run.diagnostics.acceptanceRate,
      termDeltas: initial.terms.map((term) => {
        const optimized = best.score.terms.find((candidate) => candidate.key === term.key);
        return {
          key: term.key,
          label: term.label,
          improvement: Number((term.weighted - (optimized?.weighted ?? 0)).toFixed(2))
        };
      })
    };
  });
}

export function summarizeBenchmark(results: BenchmarkResult[]): BenchmarkSummary {
  if (results.length === 0) {
    return { best: 0, worst: 0, median: 0, mean: 0, standardDeviation: 0, successRate: 0 };
  }

  const improvements = results.map((result) => result.improvement).sort((a, b) => a - b);
  const mean = improvements.reduce((sum, value) => sum + value, 0) / improvements.length;
  const variance = improvements.reduce((sum, value) => sum + (value - mean) ** 2, 0) / improvements.length;
  const median = improvements[Math.floor(improvements.length / 2)];
  return {
    best: Math.max(...improvements),
    worst: Math.min(...improvements),
    median: Number(median.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    standardDeviation: Number(Math.sqrt(variance).toFixed(2)),
    successRate: Number((results.filter((result) => result.improvement > 0).length / results.length).toFixed(2))
  };
}
