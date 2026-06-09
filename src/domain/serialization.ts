import type { LayoutScene } from "./types";
import { defaultWeights } from "./scoring";

export function exportScene(scene: LayoutScene): string {
  return JSON.stringify(scene, null, 2);
}

export function importScene(json: string): LayoutScene {
  const parsed = JSON.parse(json) as LayoutScene;
  if (!parsed.id || !parsed.room || !Array.isArray(parsed.props)) {
    throw new Error("Scene JSON must include id, room, and props.");
  }
  return {
    ...parsed,
    description: parsed.description ?? "Imported scene",
    room: {
      ...parsed.room,
      walls: Array.isArray(parsed.room.walls) ? parsed.room.walls : [],
      surfaces: Array.isArray(parsed.room.surfaces) ? parsed.room.surfaces : [],
      fixtures: Array.isArray(parsed.room.fixtures) ? parsed.room.fixtures : [],
      accessZones: Array.isArray(parsed.room.accessZones) ? parsed.room.accessZones : undefined,
      pathways: Array.isArray(parsed.room.pathways) ? parsed.room.pathways : undefined
    },
    relationships: Array.isArray(parsed.relationships) ? parsed.relationships : undefined,
    weights: {
      ...defaultWeights,
      ...(parsed.weights ?? {})
    }
  };
}
