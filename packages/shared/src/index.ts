export const APP_NAME = "Korean Self-Hosted ERP";

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
