import { cloneScene } from "./optimizer";
import type { LayoutScene } from "./types";

export type SceneHistory = {
  past: LayoutScene[];
  present: LayoutScene;
  future: LayoutScene[];
  limit: number;
};

const defaultLimit = 40;

function sameScene(a: LayoutScene, b: LayoutScene): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createSceneHistory(scene: LayoutScene, limit = defaultLimit): SceneHistory {
  return {
    past: [],
    present: cloneScene(scene),
    future: [],
    limit
  };
}

export function pushSceneHistory(history: SceneHistory, scene: LayoutScene): SceneHistory {
  if (sameScene(history.present, scene)) {
    return history;
  }

  return {
    past: [...history.past, cloneScene(history.present)].slice(-history.limit),
    present: cloneScene(scene),
    future: [],
    limit: history.limit
  };
}

export function undoSceneHistory(history: SceneHistory): SceneHistory {
  const previous = history.past.at(-1);
  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: cloneScene(previous),
    future: [cloneScene(history.present), ...history.future].slice(0, history.limit),
    limit: history.limit
  };
}

export function redoSceneHistory(history: SceneHistory): SceneHistory {
  const next = history.future[0];
  if (!next) {
    return history;
  }

  return {
    past: [...history.past, cloneScene(history.present)].slice(-history.limit),
    present: cloneScene(next),
    future: history.future.slice(1),
    limit: history.limit
  };
}
