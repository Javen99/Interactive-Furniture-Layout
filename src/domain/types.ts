export type Vec2 = {
  x: number;
  y: number;
};

export type Pose = Vec2 & {
  rotation: number;
  surfaceId: string;
};

export type AxisAlignedRect = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SurfaceKind = "worktop" | "table" | "bed";

export type Surface = AxisAlignedRect & {
  kind: SurfaceKind;
  wallEdge: "top" | "right" | "bottom" | "left" | "none";
};

export type FixtureKind = "sink" | "hob" | "door" | "window";

export type Fixture = AxisAlignedRect & {
  kind: FixtureKind;
  surfaceId?: string;
  clearance: number;
};

export type AccessZoneKind = "fixture" | "worktopFront" | "doorApproach" | "pathway";

export type AccessZone = AxisAlignedRect & {
  kind: AccessZoneKind;
  targetId?: string;
  importance: number;
};

export type Pathway = {
  id: string;
  label: string;
  start: Vec2;
  end: Vec2;
  width: number;
  importance: number;
};

export type PlacementPreference = "center" | "backEdge" | "frontEdge" | "sideEdge" | "display" | "none";

export type PropItem = {
  id: string;
  label: string;
  tags: string[];
  width: number;
  height: number;
  pose: Pose;
  allowedSurfaceIds: string[];
  orientationOptions: number[];
  pinned: boolean;
  color: string;
  preference: PlacementPreference;
};

export type RoomPlan = {
  width: number;
  height: number;
  walls: AxisAlignedRect[];
  surfaces: Surface[];
  fixtures: Fixture[];
  accessZones?: AccessZone[];
  pathways?: Pathway[];
  viewPoint: Vec2;
  focalPoint: Vec2;
};

export type CostWeights = {
  containment: number;
  collision: number;
  pinned: number;
  clearance: number;
  proximity: number;
  centerEdge: number;
  alignment: number;
  balance: number;
  visibility: number;
  accessibility: number;
};

export type LayoutScene = {
  id: string;
  name: string;
  description: string;
  metadata?: {
    difficulty: "intro" | "moderate" | "stress";
    baselineName: string;
    evaluationSeeds: string[];
  };
  room: RoomPlan;
  props: PropItem[];
  weights: CostWeights;
};

export type ScoreTermKey = keyof CostWeights;

export type ScoreTerm = {
  key: ScoreTermKey;
  label: string;
  raw: number;
  weight: number;
  weighted: number;
  explanation: string;
};

export type ScoreResult = {
  total: number;
  hardCost: number;
  softCost: number;
  terms: ScoreTerm[];
  hardViolations: number;
};

export type Suggestion = {
  id: string;
  rank: number;
  seed: string;
  score: ScoreResult;
  scene: LayoutScene;
};

export type OptimizerHistoryPoint = {
  iteration: number;
  score: number;
  hardViolations: number;
};

export type RejectedCostCause = {
  key: ScoreTermKey;
  label: string;
  count: number;
  weightedDelta: number;
};

export type OptimizerDiagnostics = {
  iterations: number;
  acceptedMoves: number;
  rejectedMoves: number;
  acceptanceRate: number;
  initialScore: number;
  bestScore: number;
  bestHardViolations: number;
  bestScoreHistory: OptimizerHistoryPoint[];
  topRejectedCostCauses: RejectedCostCause[];
};

export type OptimizerRun = {
  suggestions: Suggestion[];
  diagnostics: OptimizerDiagnostics;
};

export type OptimizerOptions = {
  seed: string;
  iterations: number;
  suggestionCount: number;
  startTemperature: number;
  endTemperature: number;
};

export type BenchmarkResult = {
  seed: string;
  initialScore: number;
  optimizedScore: number;
  initialHardViolations: number;
  optimizedHardViolations: number;
  hardCostImprovement: number;
  softCostImprovement: number;
  improvement: number;
  acceptanceRate: number;
  termDeltas: Array<{
    key: ScoreTermKey;
    label: string;
    improvement: number;
  }>;
};

export type BenchmarkSummary = {
  best: number;
  worst: number;
  median: number;
  mean: number;
  standardDeviation: number;
  successRate: number;
};

export type BenchmarkReport = {
  generatedAt: string;
  scenarioId: string;
  scenarioName: string;
  seeds: string[];
  initialScore: number;
  optimizedBestScore: number;
  initialHardViolations: number;
  optimizedBestHardViolations: number;
  summary: BenchmarkSummary;
  results: BenchmarkResult[];
  selectedSuggestionIds: string[];
};
