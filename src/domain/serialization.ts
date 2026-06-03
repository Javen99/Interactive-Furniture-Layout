import type { LayoutScene } from "./types";

export function exportScene(scene: LayoutScene): string {
  return JSON.stringify(scene, null, 2);
}

export function importScene(json: string): LayoutScene {
  const parsed = JSON.parse(json) as LayoutScene;
  if (!parsed.id || !parsed.room || !Array.isArray(parsed.props)) {
    throw new Error("Scene JSON must include id, room, and props.");
  }
  return parsed;
}

