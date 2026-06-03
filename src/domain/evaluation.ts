import { generateSuggestions } from "./optimizer";
import { scoreScene } from "./scoring";
import type { BenchmarkResult, LayoutScene } from "./types";

export function runBenchmark(scene: LayoutScene, seeds: string[], iterations = 2200): BenchmarkResult[] {
  const initialScore = scoreScene(scene).total;
  return seeds.map((seed) => {
    const [best] = generateSuggestions(scene, {
      seed,
      iterations,
      suggestionCount: 1,
      startTemperature: 18,
      endTemperature: 0.1
    });
    return {
      seed,
      initialScore,
      optimizedScore: best.score.total,
      improvement: Number((initialScore - best.score.total).toFixed(2))
    };
  });
}

export function summarizeBenchmark(results: BenchmarkResult[]): { best: number; median: number; mean: number; successRate: number } {
  if (results.length === 0) {
    return { best: 0, median: 0, mean: 0, successRate: 0 };
  }

  const improvements = results.map((result) => result.improvement).sort((a, b) => a - b);
  const mean = improvements.reduce((sum, value) => sum + value, 0) / improvements.length;
  const median = improvements[Math.floor(improvements.length / 2)];
  return {
    best: Math.max(...improvements),
    median: Number(median.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    successRate: Number((results.filter((result) => result.improvement > 0).length / results.length).toFixed(2))
  };
}

