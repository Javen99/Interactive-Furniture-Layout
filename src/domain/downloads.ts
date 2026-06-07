export type JsonDownload = {
  filename: string;
  mimeType: "application/json";
  content: string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "layout-lab";
}

function timestampForFilename(isoTimestamp: string): string {
  return isoTimestamp.replace(/[:.]/g, "-");
}

export function createJsonDownload(baseName: string, payload: unknown, generatedAt = new Date().toISOString()): JsonDownload {
  return {
    filename: `${slugify(baseName)}-${timestampForFilename(generatedAt)}.json`,
    mimeType: "application/json",
    content: JSON.stringify(payload, null, 2)
  };
}

export function downloadJsonFile(download: JsonDownload) {
  const blob = new Blob([download.content], { type: download.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = download.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
