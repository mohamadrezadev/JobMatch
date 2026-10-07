import { discoveryIssue, publicSource } from "./discovery-issue";
it.each([
  ["SEARCH_TIMEOUT", "search"],
  ["FETCH_EMPTY_CONTENT", "fetch"],
  ["EXTRACTION_TIMEOUT", "extract"],
  ["SOURCE_REJECTED", "validate"],
  ["TIMEOUT", undefined],
])("identifies only known failure stages for %s", (code, stage) => {
  expect(discoveryIssue(code as string).stage).toBe(stage);
});
it.each([
  ["PAGE_CONNECTION_ERROR", "site"],
  ["PAGE_ACCESS_BLOCKED", "site"],
  ["FETCH_HTTP_401", "provider"],
  ["JOB_FETCH_PROVIDER_UNAVAILABLE", "provider"],
  ["FETCH_EMPTY_CONTENT", "unknown"],
  ["TIMEOUT", "timeout"],
  ["EXTRACTION_TIMEOUT", "timeout"],
  ["EXTRACTION_NO_POSTING", "extraction"],
])(
  "classifies %s without attributing ambiguous transport failures to a site",
  (code, category) => {
    expect(discoveryIssue(code).category).toBe(category);
  },
);
it("exposes a safe explanation without query, credentials or raw diagnostics", () => {
  expect(
    publicSource({
      source: "irantalent.com",
      found: 1,
      accepted: 0,
      rejected: 1,
      error: "FETCH_EMPTY_CONTENT",
      query: "PRIVATE",
    } as any),
  ).toMatchObject({ failed: true, issue: { category: "unknown" } });
  expect(
    JSON.stringify(
      publicSource({
        source: "site",
        found: 1,
        accepted: 0,
        rejected: 1,
        error: "private secret",
      }),
    ),
  ).not.toContain("private secret");
});
