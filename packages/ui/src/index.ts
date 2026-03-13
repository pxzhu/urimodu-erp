export function statusBadgeClass(status: "ok" | "warn" | "error"): string {
  if (status === "ok") return "badge badge-ok";
  if (status === "warn") return "badge badge-warn";
  return "badge badge-error";
}
