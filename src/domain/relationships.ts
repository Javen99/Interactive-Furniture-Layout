import { clamp, distance, rectCenter } from "./geometry";
import type { LayoutScene, Pose, PropItem, RelationshipMatcher, RelationshipRule, RelationshipTarget, Vec2 } from "./types";

export const defaultRelationshipRules: RelationshipRule[] = [
  {
    id: "default-soap-near-sink",
    label: "Washing props near sink",
    enabled: true,
    mode: "near",
    subject: { tags: ["soap", "washing", "towel"] },
    target: { kind: "fixture", fixtureKinds: ["sink"] },
    distance: 72,
    tolerance: 120,
    strength: 1
  },
  {
    id: "default-cooking-near-hob",
    label: "Cooking props near hob",
    enabled: true,
    mode: "near",
    subject: { tags: ["pan", "pot", "cooking", "spice"] },
    target: { kind: "fixture", fixtureKinds: ["hob"] },
    distance: 90,
    tolerance: 140,
    strength: 1
  }
];

function cloneRule(rule: RelationshipRule): RelationshipRule {
  const subject = rule.subject ?? {};
  const target = rule.target ?? { kind: "prop", tags: [] };
  let clonedTarget: RelationshipTarget;

  if (target.kind === "fixture") {
    clonedTarget = {
      kind: "fixture",
      fixtureIds: target.fixtureIds ? [...target.fixtureIds] : undefined,
      fixtureKinds: target.fixtureKinds ? [...target.fixtureKinds] : undefined
    };
  } else if (target.kind === "prop") {
    clonedTarget = {
      kind: "prop",
      propIds: target.propIds ? [...target.propIds] : undefined,
      tags: target.tags ? [...target.tags] : undefined
    };
  } else {
    clonedTarget = { kind: "prop", tags: [] };
  }

  return {
    ...rule,
    subject: {
      propIds: subject.propIds ? [...subject.propIds] : undefined,
      tags: subject.tags ? [...subject.tags] : undefined
    },
    target: clonedTarget
  };
}

export function cloneRelationshipRules(rules: RelationshipRule[] | undefined): RelationshipRule[] | undefined {
  return rules?.map(cloneRule);
}

export function getSceneRelationshipRules(scene: LayoutScene): RelationshipRule[] {
  return scene.relationships === undefined ? defaultRelationshipRules.map(cloneRule) : scene.relationships.map(cloneRule);
}

export function matcherHasCriteria(matcher: RelationshipMatcher): boolean {
  return Boolean(matcher.propIds?.some(Boolean) || matcher.tags?.some(Boolean));
}

export function targetHasCriteria(target: RelationshipTarget): boolean {
  if (target.kind === "fixture") {
    return Boolean(target.fixtureIds?.some(Boolean) || target.fixtureKinds?.some(Boolean));
  }
  return Boolean(target.propIds?.some(Boolean) || target.tags?.some(Boolean));
}

export function matcherMatchesProp(matcher: RelationshipMatcher, prop: PropItem): boolean {
  const idMatches = matcher.propIds?.includes(prop.id) ?? false;
  const tagMatches = matcher.tags?.some((tag) => prop.tags.includes(tag)) ?? false;
  return idMatches || tagMatches;
}

function targetMatchesProp(target: RelationshipTarget, prop: PropItem): boolean {
  if (target.kind !== "prop") {
    return false;
  }
  const idMatches = target.propIds?.includes(prop.id) ?? false;
  const tagMatches = target.tags?.some((tag) => prop.tags.includes(tag)) ?? false;
  return idMatches || tagMatches;
}

function targetPropIds(scene: LayoutScene, target: RelationshipTarget): string[] {
  if (target.kind !== "prop") {
    return [];
  }
  return scene.props.filter((prop) => targetMatchesProp(target, prop)).map((prop) => prop.id);
}

function targetPoints(scene: LayoutScene, target: RelationshipTarget, subjectId: string): Vec2[] {
  if (target.kind === "fixture") {
    return scene.room.fixtures
      .filter((fixture) => {
        const idMatches = target.fixtureIds?.includes(fixture.id) ?? false;
        const kindMatches = target.fixtureKinds?.includes(fixture.kind) ?? false;
        return idMatches || kindMatches;
      })
      .map(rectCenter);
  }

  return scene.props
    .filter((prop) => prop.id !== subjectId && targetMatchesProp(target, prop))
    .map((prop) => prop.pose);
}

function ruleDistancePenalty(distanceToTarget: number, rule: RelationshipRule): number {
  if (!Number.isFinite(rule.distance) || !Number.isFinite(rule.tolerance) || !Number.isFinite(rule.strength) || rule.tolerance <= 0) {
    return 0;
  }

  const raw =
    rule.mode === "near"
      ? clamp(Math.abs(distanceToTarget - rule.distance) / rule.tolerance, 0, 1.5)
      : clamp((rule.distance - distanceToTarget) / rule.tolerance, 0, 1.5);
  return raw * Math.max(0, rule.strength);
}

function relationshipScore(scene: LayoutScene, activePropId?: string): number {
  let score = 0;

  for (const rule of getSceneRelationshipRules(scene)) {
    if (!rule.enabled || !matcherHasCriteria(rule.subject) || !targetHasCriteria(rule.target)) {
      continue;
    }

    const activeAsTarget = activePropId ? targetPropIds(scene, rule.target).includes(activePropId) : false;
    for (const prop of scene.props.filter((candidate) => matcherMatchesProp(rule.subject, candidate))) {
      if (activePropId && prop.id !== activePropId && !activeAsTarget) {
        continue;
      }

      const points = targetPoints(scene, rule.target, prop.id);
      const closest = points.reduce((best, point) => Math.min(best, distance(prop.pose, point)), Number.POSITIVE_INFINITY);
      if (Number.isFinite(closest)) {
        score += ruleDistancePenalty(closest, rule);
      }
    }
  }

  return score;
}

export function scoreRelationshipRules(scene: LayoutScene): number {
  return Number(relationshipScore(scene).toFixed(4));
}

export function relationshipPenaltyForCandidate(scene: LayoutScene, prop: PropItem, pose: Pose): number {
  const candidateScene: LayoutScene = {
    ...scene,
    props: scene.props.map((candidate) => (candidate.id === prop.id ? { ...candidate, pose: { ...pose } } : candidate))
  };
  return Number(relationshipScore(candidateScene, prop.id).toFixed(4));
}
