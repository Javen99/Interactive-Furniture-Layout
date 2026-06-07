import { describe, expect, it } from "vitest";
import { createSceneHistory, pushSceneHistory, redoSceneHistory, undoSceneHistory } from "./sceneHistory";
import { cloneScene } from "./optimizer";
import { galleyKitchen, islandPrep } from "./presets";

describe("scene history", () => {
  it("undoes and redoes scene snapshots in order", () => {
    const first = cloneScene(galleyKitchen);
    const second = cloneScene(galleyKitchen);
    const third = cloneScene(galleyKitchen);
    second.props[0].pose.x += 10;
    third.props[0].pose.x += 30;

    const history = pushSceneHistory(pushSceneHistory(createSceneHistory(first), second), third);
    const undoneOnce = undoSceneHistory(history);
    const undoneTwice = undoSceneHistory(undoneOnce);
    const redone = redoSceneHistory(undoneTwice);

    expect(undoneOnce.present.props[0].pose.x).toBe(second.props[0].pose.x);
    expect(undoneTwice.present.props[0].pose.x).toBe(first.props[0].pose.x);
    expect(redone.present.props[0].pose.x).toBe(second.props[0].pose.x);
  });

  it("clears redo snapshots after a new edit", () => {
    const first = cloneScene(galleyKitchen);
    const second = cloneScene(galleyKitchen);
    const replacement = cloneScene(galleyKitchen);
    second.props[0].pose.x += 10;
    replacement.props[0].pose.x += 80;

    const history = undoSceneHistory(pushSceneHistory(createSceneHistory(first), second));
    const afterNewEdit = pushSceneHistory(history, replacement);
    expect(afterNewEdit.future).toEqual([]);
    expect(redoSceneHistory(afterNewEdit)).toBe(afterNewEdit);
  });

  it("captures reset, import, and applied suggestion style snapshots", () => {
    const initial = cloneScene(galleyKitchen);
    const edited = cloneScene(galleyKitchen);
    const imported = cloneScene(islandPrep);
    const appliedSuggestion = cloneScene(galleyKitchen);
    edited.props[0].pose.x += 50;
    appliedSuggestion.props[1].pose.y += 35;

    const history = [edited, imported, initial, appliedSuggestion].reduce(
      (current, scene) => pushSceneHistory(current, scene),
      createSceneHistory(initial)
    );

    expect(history.present.props[1].pose.y).toBe(appliedSuggestion.props[1].pose.y);
    expect(undoSceneHistory(history).present.id).toBe(initial.id);
    expect(undoSceneHistory(undoSceneHistory(history)).present.id).toBe(imported.id);
  });
});
