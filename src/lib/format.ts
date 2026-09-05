export function relativeTime(value?: string | number) {
  if (value == null) return "Never backed up";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Never backed up";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : date.toLocaleDateString();
}
export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
export function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576)
    return `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
export function statusTone(status: string) {
  return status === "protected" ||
    status === "verified" ||
    status === "available" ||
    status === "healthy"
    ? "healthy"
    : status === "partial" ||
        status === "needs_attention" ||
        status === "missing" ||
        status === "read_only"
      ? "warning"
      : status === "manual" || status === "neutral"
        ? "neutral"
        : "error";
}
export function statusLabel(status: string) {
  return (
    (
      {
        protected: "Protected",
        partial: "Partial",
        needs_attention: "Needs attention",
        manual: "Manual",
        missing: "Missing",
        backing_up: "Backing up",
        failed: "Backup failed",
        verified: "Verified",
        available: "Available",
        corrupt: "Corrupt",
        healthy: "Healthy",
        unavailable: "Unavailable",
        read_only: "Read-only",
      } as Record<string, string>
    )[status] || status
  );
}
export function policyLabel(mode: string, interval: number) {
  const duration =
    interval < 60
      ? `${interval} min`
      : interval % 60 === 0
        ? `${interval / 60} hour${interval === 60 ? "" : "s"}`
        : `${interval} min`;
  return mode === "manual"
    ? "Manual"
    : mode === "on_change"
      ? "On change"
      : mode === "interval"
        ? `Every ${duration}`
        : `On change · every ${duration}`;
}
