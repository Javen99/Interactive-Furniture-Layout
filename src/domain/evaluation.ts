import { generateSuggestionsWithDiagnostics } from "./optimizer";
import { scoreScene } from "./scoring";
import type { BenchmarkReport, BenchmarkResult, BenchmarkSummary, LayoutScene, StudyReport, StudyVote, Suggestion } from "./types";

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

export function createBenchmarkReport(scene: LayoutScene, results: BenchmarkResult[], suggestions: Suggestion[] = []): BenchmarkReport {
  const summary = summarizeBenchmark(results);
  const best = [...results].sort((a, b) => a.optimizedScore - b.optimizedScore)[0];
  return {
    generatedAt: new Date().toISOString(),
    scenarioId: scene.id,
    scenarioName: scene.name,
    seeds: results.map((result) => result.seed),
    initialScore: results[0]?.initialScore ?? scoreScene(scene).total,
    optimizedBestScore: best?.optimizedScore ?? scoreScene(scene).total,
    initialHardViolations: results[0]?.initialHardViolations ?? scoreScene(scene).hardViolations,
    optimizedBestHardViolations: best?.optimizedHardViolations ?? scoreScene(scene).hardViolations,
    summary,
    results,
    selectedSuggestionIds: suggestions.map((suggestion) => suggestion.id)
  };
}

export function replayBenchmarkSuggestions(scene: LayoutScene, seeds: string[], iterations = 2200, suggestionCount = 5): Suggestion[] {
  return seeds
    .flatMap((seed) => {
      const run = generateSuggestionsWithDiagnostics(scene, {
        seed,
        iterations,
        suggestionCount: 1,
        startTemperature: 18,
        endTemperature: 0.1
      });
      return run.suggestions;
    })
    .sort((a, b) => {
      if (a.score.hardViolations !== b.score.hardViolations) {
        return a.score.hardViolations - b.score.hardViolations;
      }
      return a.score.total - b.score.total;
    })
    .slice(0, suggestionCount)
    .map((suggestion, index) => ({ ...suggestion, rank: index + 1 }));
}

export function createStudyVote(
  scene: LayoutScene,
  pair: [Suggestion, Suggestion],
  selectedSuggestionId: string,
  createdAt = new Date().toISOString()
): StudyVote {
  const selectedIndex = pair[0].id === selectedSuggestionId ? 0 : 1;
  const selected = pair[selectedIndex];
  const other = pair[selectedIndex === 0 ? 1 : 0];

  return {
    id: `${scene.id}-${createdAt}-${selected.id}`,
    createdAt,
    scenarioId: scene.id,
    scenarioName: scene.name,
    comparedSuggestionIds: [pair[0].id, pair[1].id],
    selectedSuggestionId: selected.id,
    selectedLabel: selectedIndex === 0 ? "A" : "B",
    seedMetadata: scene.metadata?.evaluationSeeds ?? [],
    scoreDelta: {
      selectedTotal: selected.score.total,
      otherTotal: other.score.total,
      totalDifference: Number((selected.score.total - other.score.total).toFixed(2)),
      selectedHardViolations: selected.score.hardViolations,
      otherHardViolations: other.score.hardViolations
    }
  };
}

export function createStudyReport(scene: LayoutScene, votes: StudyVote[], generatedAt = new Date().toISOString()): StudyReport {
  return {
    generatedAt,
    scenarioId: scene.id,
    scenarioName: scene.name,
    seedMetadata: scene.metadata?.evaluationSeeds ?? [],
    voteCount: votes.length,
    votes
  };
}
