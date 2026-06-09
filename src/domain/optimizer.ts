import { clampPropToSurface, distance, findSurfaceForProp, getPlacementBounds, normalizeDegrees } from "./geometry";
import { createRng, type Rng } from "./random";
import { cloneRelationshipRules } from "./relationships";
import { scoreScene } from "./scoring";
import { applyCandidateSlot, generateCandidateSlots } from "./slots";
import type { LayoutScene, OptimizerOptions, OptimizerDiagnostics, OptimizerRun, PropItem, RejectedCostCause, ScoreResult, Suggestion, Surface } from "./types";

const defaultOptions: OptimizerOptions = {
  seed: "layout-lab",
  iterations: 3500,
  suggestionCount: 5,
  startTemperature: 18,
  endTemperature: 0.1
};

export function cloneScene(scene: LayoutScene): LayoutScene {
  return {
    ...scene,
    metadata: scene.metadata ? { ...scene.metadata, evaluationSeeds: [...scene.metadata.evaluationSeeds] } : undefined,
    room: {
      ...scene.room,
      walls: scene.room.walls.map((wall) => ({ ...wall })),
      surfaces: scene.room.surfaces.map((surface) => ({ ...surface })),
      fixtures: scene.room.fixtures.map((fixture) => ({ ...fixture })),
      accessZones: scene.room.accessZones?.map((zone) => ({ ...zone })),
      pathways: scene.room.pathways?.map((pathway) => ({
        ...pathway,
        start: { ...pathway.start },
        end: { ...pathway.end },
        waypoints: pathway.waypoints?.map((waypoint) => ({ ...waypoint }))
      })),
      viewPoint: { ...scene.room.viewPoint },
      focalPoint: { ...scene.room.focalPoint }
    },
    props: scene.props.map((prop) => ({
      ...prop,
      tags: [...prop.tags],
      pose: { ...prop.pose },
      allowedSurfaceIds: [...prop.allowedSurfaceIds],
      orientationOptions: [...prop.orientationOptions]
    })),
    relationships: cloneRelationshipRules(scene.relationships),
    weights: { ...scene.weights }
  };
}

function movableProps(scene: LayoutScene): PropItem[] {
  return scene.props.filter((prop) => !prop.pinned);
}

function allowedSurfaces(prop: PropItem, surfaces: Surface[]): Surface[] {
  return surfaces.filter((surface) => prop.allowedSurfaceIds.includes(surface.id));
}

function replaceProp(scene: LayoutScene, prop: PropItem): LayoutScene {
  return {
    ...scene,
    props: scene.props.map((candidate) => (candidate.id === prop.id ? prop : candidate))
  };
}

function randomPoseOnSurface(prop: PropItem, surface: Surface, rng: Rng): PropItem {
  const rotated = {
    ...prop,
    pose: {
      ...prop.pose,
      surfaceId: surface.id
    }
  };
  const bounds = getPlacementBounds(rotated, surface);
  return {
    ...rotated,
    pose: {
      ...rotated.pose,
      x: rng.range(bounds.x, bounds.x + bounds.width),
      y: rng.range(bounds.y, bounds.y + bounds.height)
    }
  };
}

function slotPoseOnSurface(scene: LayoutScene, prop: PropItem, surface: Surface, rng: Rng): PropItem {
  const slots = generateCandidateSlots(scene, prop, surface, {
    includeCurrentRotation: true,
    maxSlots: 12
  });
  const slot = slots.length > 0 ? rng.pick(slots.slice(0, Math.min(6, slots.length))) : null;
  return slot ? applyCandidateSlot(prop, slot) : randomPoseOnSurface(prop, surface, rng);
}

function rotateProp(prop: PropItem, rng: Rng): PropItem {
  if (prop.orientationOptions.length <= 1) {
    return prop;
  }

  const currentIndex = prop.orientationOptions.findIndex((angle) => normalizeDegrees(angle) === normalizeDegrees(prop.pose.rotation));
  const nextIndex = currentIndex === -1 ? rng.int(0, prop.orientationOptions.length - 1) : (currentIndex + 1 + rng.int(0, prop.orientationOptions.length - 2)) % prop.orientationOptions.length;
  return {
    ...prop,
    pose: {
      ...prop.pose,
      rotation: prop.orientationOptions[nextIndex]
    }
  };
}

function propose(scene: LayoutScene, rng: Rng, progress: number): LayoutScene {
  const props = movableProps(scene);
  if (props.length === 0) {
    return scene;
  }

  const prop = rng.pick(props);
  const moveType = rng.next();
  const surfaces = allowedSurfaces(prop, scene.room.surfaces);
  if (surfaces.length === 0) {
    return scene;
  }

  if (moveType < 0.44) {
    const surface = findSurfaceForProp(prop, scene.room.surfaces) ?? rng.pick(surfaces);
    const step = Math.max(12, 80 * (1 - progress) + 12);
    const moved = clampPropToSurface(
      {
        ...prop,
        pose: {
          ...prop.pose,
          x: prop.pose.x + rng.range(-step, step),
          y: prop.pose.y + rng.range(-step, step),
          surfaceId: surface.id
        }
      },
      surface
    );
    return replaceProp(scene, moved);
  }

  if (moveType < 0.68) {
    const surface = rng.pick(surfaces);
    return replaceProp(scene, rng.chance(0.72) ? slotPoseOnSurface(scene, prop, surface, rng) : randomPoseOnSurface(prop, surface, rng));
  }

  if (moveType < 0.86) {
    const surface = findSurfaceForProp(prop, scene.room.surfaces) ?? rng.pick(surfaces);
    return replaceProp(scene, clampPropToSurface(rotateProp(prop, rng), surface));
  }

  const other = rng.pick(props.filter((candidate) => candidate.id !== prop.id));
  if (!other) {
    return scene;
  }

  const propSurface = findSurfaceForProp(prop, scene.room.surfaces);
  const otherSurface = findSurfaceForProp(other, scene.room.surfaces);
  if (!propSurface || !otherSurface) {
    return scene;
  }

  const swappedProp = clampPropToSurface(
    {
      ...prop,
      pose: {
        ...prop.pose,
        x: other.pose.x,
        y: other.pose.y,
        surfaceId: other.pose.surfaceId
      }
    },
    otherSurface
  );
  const swappedOther = clampPropToSurface(
    {
      ...other,
      pose: {
        ...other.pose,
        x: prop.pose.x,
        y: prop.pose.y,
        surfaceId: prop.pose.surfaceId
      }
    },
    propSurface
  );

  return {
    ...scene,
    props: scene.props.map((candidate) => {
      if (candidate.id === prop.id) return swappedProp;
      if (candidate.id === other.id) return swappedOther;
      return candidate;
    })
  };
}

function candidateSignature(scene: LayoutScene): string {
  return scene.props
    .map((prop) => `${prop.id}:${prop.pose.surfaceId}:${Math.round(prop.pose.x / 8)}:${Math.round(prop.pose.y / 8)}:${normalizeDegrees(prop.pose.rotation)}`)
    .sort()
    .join("|");
}

function keepCandidate(candidates: Suggestion[], candidate: Suggestion, suggestionCount: number): Suggestion[] {
  const signature = candidateSignature(candidate.scene);
  const existingIndex = candidates.findIndex((item) => candidateSignature(item.scene) === signature);
  const next = [...candidates];

  if (existingIndex >= 0) {
    if (candidate.score.total < next[existingIndex].score.total) {
      next[existingIndex] = candidate;
    }
  } else {
    next.push(candidate);
  }

  return next
    .sort((a, b) => a.score.total - b.score.total)
    .slice(0, suggestionCount * 2)
    .map((suggestion, index) => ({ ...suggestion, rank: index + 1 }));
}

export function normalizeScene(scene: LayoutScene): LayoutScene {
  return {
    ...scene,
    props: scene.props.map((prop) => {
      const surface = findSurfaceForProp(prop, scene.room.surfaces);
      return surface ? clampPropToSurface(prop, surface) : prop;
    })
  };
}

function dominantRejectedCause(currentScore: ScoreResult, proposalScore: ScoreResult): RejectedCostCause | null {
  const deltas = proposalScore.terms
    .map((term) => {
      const current = currentScore.terms.find((candidate) => candidate.key === term.key);
      return {
        key: term.key,
        label: term.label,
        count: 1,
        weightedDelta: Number((term.weighted - (current?.weighted ?? 0)).toFixed(2))
      };
    })
    .filter((delta) => delta.weightedDelta > 0)
    .sort((a, b) => b.weightedDelta - a.weightedDelta);

  return deltas[0] ?? null;
}

function addRejectedCause(causes: Map<string, RejectedCostCause>, cause: RejectedCostCause | null) {
  if (!cause) {
    return;
  }
  const existing = causes.get(cause.key);
  if (!existing) {
    causes.set(cause.key, cause);
    return;
  }
  causes.set(cause.key, {
    ...existing,
    count: existing.count + 1,
    weightedDelta: Number((existing.weightedDelta + cause.weightedDelta).toFixed(2))
  });
}

function makeDiagnostics(
  options: OptimizerOptions,
  acceptedMoves: number,
  rejectedMoves: number,
  initialScore: ScoreResult,
  bestScore: ScoreResult,
  bestScoreHistory: OptimizerDiagnostics["bestScoreHistory"],
  rejectedCauses: Map<string, RejectedCostCause>
): OptimizerDiagnostics {
  return {
    iterations: options.iterations,
    acceptedMoves,
    rejectedMoves,
    acceptanceRate: Number((acceptedMoves / Math.max(options.iterations, 1)).toFixed(3)),
    initialScore: initialScore.total,
    bestScore: bestScore.total,
    bestHardViolations: bestScore.hardViolations,
    bestScoreHistory,
    topRejectedCostCauses: [...rejectedCauses.values()]
      .sort((a, b) => b.weightedDelta - a.weightedDelta)
      .slice(0, 3)
  };
}

export function generateSuggestionsWithDiagnostics(scene: LayoutScene, requestedOptions: Partial<OptimizerOptions> = {}): OptimizerRun {
  const options = { ...defaultOptions, ...requestedOptions };
  const baseline = cloneScene(scene);
  const rng = createRng(options.seed);
  let current = normalizeScene(cloneScene(scene));
  let currentScore = scoreScene(current, baseline);
  const initialScore = currentScore;
  let bestScore = currentScore;
  let acceptedMoves = 0;
  let rejectedMoves = 0;
  const rejectedCauses = new Map<string, RejectedCostCause>();
  const bestScoreHistory: OptimizerDiagnostics["bestScoreHistory"] = [
    { iteration: 0, score: currentScore.total, hardViolations: currentScore.hardViolations }
  ];
  let candidates: Suggestion[] = [];

  candidates = keepCandidate(
    candidates,
    {
      id: `${options.seed}-initial`,
      rank: 1,
      seed: options.seed,
      scene: cloneScene(current),
      score: currentScore
    },
    options.suggestionCount
  );

  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    const progress = iteration / Math.max(options.iterations - 1, 1);
    const temperature = options.startTemperature * (1 - progress) + options.endTemperature * progress;
    const proposal = propose(current, rng, progress);
    const proposalScore = scoreScene(proposal, baseline);
    const delta = proposalScore.total - currentScore.total;
    const accepted = delta <= 0 || Math.exp(-delta / Math.max(temperature, 0.001)) > rng.next();

    if (accepted) {
      current = proposal;
      currentScore = proposalScore;
      acceptedMoves += 1;
      if (
        proposalScore.hardViolations < bestScore.hardViolations ||
        (proposalScore.hardViolations === bestScore.hardViolations && proposalScore.total < bestScore.total)
      ) {
        bestScore = proposalScore;
      }
    } else {
      rejectedMoves += 1;
      addRejectedCause(rejectedCauses, dominantRejectedCause(currentScore, proposalScore));
    }

    if (iteration % 18 === 0 || proposalScore.hardViolations === 0) {
      candidates = keepCandidate(
        candidates,
        {
          id: `${options.seed}-${iteration}`,
          rank: 1,
          seed: options.seed,
          scene: cloneScene(proposal),
          score: proposalScore
        },
        options.suggestionCount
      );
    }

    if (iteration > 0 && iteration % Math.max(100, Math.floor(options.iterations / 24)) === 0) {
      bestScoreHistory.push({ iteration, score: bestScore.total, hardViolations: bestScore.hardViolations });
    }
  }

  const suggestions = candidates
    .sort((a, b) => {
      if (a.score.hardViolations !== b.score.hardViolations) {
        return a.score.hardViolations - b.score.hardViolations;
      }
      return a.score.total - b.score.total;
    })
    .slice(0, options.suggestionCount)
    .map((suggestion, index) => ({ ...suggestion, rank: index + 1 }));

  const finalBest = suggestions[0]?.score ?? bestScore;
  bestScoreHistory.push({ iteration: options.iterations, score: finalBest.total, hardViolations: finalBest.hardViolations });

  return {
    suggestions,
    diagnostics: makeDiagnostics(options, acceptedMoves, rejectedMoves, initialScore, finalBest, bestScoreHistory, rejectedCauses)
  };
}

export function generateSuggestions(scene: LayoutScene, requestedOptions: Partial<OptimizerOptions> = {}): Suggestion[] {
  return generateSuggestionsWithDiagnostics(scene, requestedOptions).suggestions;
}

export function getPinnedDrift(scene: LayoutScene, baseline: LayoutScene): number {
  return scene.props
    .filter((prop) => prop.pinned)
    .reduce((sum, prop) => {
      const original = baseline.props.find((candidate) => candidate.id === prop.id);
      return original ? sum + distance(prop.pose, original.pose) : sum;
    }, 0);
}
