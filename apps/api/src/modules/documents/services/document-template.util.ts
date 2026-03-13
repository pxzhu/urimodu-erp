function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolvePathValue(payload: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split(".");
  let current: unknown = payload;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) {
      return "";
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current ?? "";
}

export function renderHtmlTemplate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_full, keyPath: string) => {
    const value = resolvePathValue(payload, keyPath);

    if (typeof value === "object") {
      return escapeHtml(JSON.stringify(value));
    }

    return escapeHtml(String(value));
  });
}
