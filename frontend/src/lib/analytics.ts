import apiClient from "./api-client";
export function recordEvent(
  name: "Job Viewed" | "Resume Downloaded" | "Source Job Opened",
  resourceId: string,
) {
  void apiClient
    .post("/api/analytics/events", { name, resourceId })
    .catch(() => undefined);
}
