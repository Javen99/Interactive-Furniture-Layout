import { describe, expect, it } from "vitest";
import { createJsonDownload } from "./downloads";

describe("downloads", () => {
  it("creates deterministic JSON download metadata", () => {
    const download = createJsonDownload("Scene Export", { id: "scene", value: 42 }, "2026-06-07T10:11:12.123Z");
    expect(download.filename).toBe("scene-export-2026-06-07T10-11-12-123Z.json");
    expect(download.mimeType).toBe("application/json");
    expect(JSON.parse(download.content)).toEqual({ id: "scene", value: 42 });
  });

  it("falls back to a stable filename base", () => {
    const download = createJsonDownload("   !!!   ", { ok: true }, "2026-06-07T00:00:00.000Z");
    expect(download.filename).toBe("layout-lab-2026-06-07T00-00-00-000Z.json");
  });
});
