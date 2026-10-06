import OpenAI from "openai";
import { AgentPlannerService, PlannerInput } from "./agent-planner.service";

const input: PlannerInput = {
  goal: { targetRoles: ["Backend Developer"], minimumSalary: 60000000 },
  searchedSources: [],
  remainingSources: ["jobinja.ir", "jobvision.ir"],
  failedSources: [],
  validJobCount: 0,
  uncertainJobCount: 5,
  step: 1,
};
const valid = {
  action: "SEARCH_SOURCES",
  sources: ["jobvision.ir", "jobinja.ir"],
  reasonCode: "INITIAL_SEARCH",
};
function setup(text: string) {
  const create = jest
    .fn()
    .mockResolvedValue({ choices: [{ message: { content: text } }] });
  const planner = new AgentPlannerService(
    { chat: { completions: { create } } } as unknown as OpenAI,
    "fixture",
    10,
  );
  return { planner, create };
}
it("plans all four sources together with either the model or fallback", async () => {
  const all = [
    "jobinja.ir",
    "jobvision.ir",
    "irantalent.com",
    "e-estekhdam.com",
  ];
  const allInput = { ...input, remainingSources: all };
  const { planner } = setup(JSON.stringify({ ...valid, sources: all }));
  expect(await planner.decide(allInput, new AbortController().signal)).toEqual({
    ...valid,
    sources: all,
    plannerMode: "model",
  });
  expect(
    await new AgentPlannerService().decide(
      allInput,
      new AbortController().signal,
    ),
  ).toEqual({ ...valid, sources: all, plannerMode: "fallback" });
});
it("uses the model decision with only structured goal and observations", async () => {
  const { planner, create } = setup(JSON.stringify(valid));
  expect(await planner.decide(input, new AbortController().signal)).toEqual({
    ...valid,
    plannerMode: "model",
  });
  expect(JSON.parse(create.mock.calls[0][0].messages[1].content)).toEqual(
    input,
  );
});
it("accepts a fenced JSON object while still validating the complete decision", async () => {
  const { planner } = setup("```json\n" + JSON.stringify(valid) + "\n```");
  expect(await planner.decide(input, new AbortController().signal)).toEqual({
    ...valid,
    plannerMode: "model",
  });
});
it("rejects finishing at five when the user requested ten", async () => {
  const { planner } = setup(
    JSON.stringify({
      action: "FINISH",
      sources: [],
      reasonCode: "ENOUGH_RESULTS",
    }),
  );
  const goal = { ...input.goal, requestedCount: 10 };
  expect(
    await planner.decide(
      { ...input, goal, validJobCount: 5 },
      new AbortController().signal,
    ),
  ).toMatchObject({ action: "SEARCH_SOURCES", plannerMode: "fallback" });
  expect(
    await planner.decide(
      { ...input, goal, validJobCount: 10 },
      new AbortController().signal,
    ),
  ).toMatchObject({ action: "FINISH", plannerMode: "model" });
});
it.each([
  "invalid JSON",
  "null",
  "[]",
  JSON.stringify({ ...valid, sources: ["linkedin.com"] }),
  JSON.stringify({ ...valid, sources: ["irantalent.com"] }),
  JSON.stringify({ ...valid, sources: [] }),
  JSON.stringify({ ...valid, sources: ["jobvision.ir"] }),
  JSON.stringify({ ...valid, sources: ["jobinja.ir", "jobinja.ir"] }),
  JSON.stringify({ ...valid, reasonCode: "reasoning" }),
  JSON.stringify({ ...valid, goal: { minimumSalary: 0 } }),
  JSON.stringify({
    action: "FINISH",
    sources: [],
    reasonCode: "ENOUGH_RESULTS",
  }),
])("falls back safely for invalid output %s", async (raw) => {
  const { planner } = setup(raw);
  expect(await planner.decide(input, new AbortController().signal)).toEqual({
    action: "SEARCH_SOURCES",
    sources: input.remainingSources,
    reasonCode: "INITIAL_SEARCH",
    plannerMode: "fallback",
  });
});
it("rejects an already searched source", async () => {
  const { planner } = setup(
    JSON.stringify({ ...valid, sources: ["jobinja.ir"] }),
  );
  expect(
    await planner.decide(
      {
        ...input,
        searchedSources: ["jobinja.ir"],
        remainingSources: ["jobvision.ir"],
        step: 2,
      },
      new AbortController().signal,
    ),
  ).toMatchObject({ sources: ["jobvision.ir"], reasonCode: "TOO_FEW_RESULTS" });
});
it("recovers from model failure and timeout even when the client ignores abort", async () => {
  const { planner, create } = setup("");
  create.mockRejectedValueOnce(new Error("private diagnostics"));
  expect(
    await planner.decide(input, new AbortController().signal),
  ).toMatchObject({ action: "SEARCH_SOURCES" });
  create.mockImplementationOnce(() => new Promise(() => undefined));
  expect(
    await planner.decide(input, new AbortController().signal),
  ).toMatchObject({ action: "SEARCH_SOURCES" });
});
it("supports verified finish and source exhaustion", async () => {
  const { planner } = setup(
    JSON.stringify({
      action: "FINISH",
      sources: [],
      reasonCode: "ENOUGH_RESULTS",
    }),
  );
  expect(
    await planner.decide(
      { ...input, validJobCount: 5 },
      new AbortController().signal,
    ),
  ).toMatchObject({ action: "FINISH", reasonCode: "ENOUGH_RESULTS" });
  expect(
    await new AgentPlannerService().decide(
      { ...input, remainingSources: [] },
      new AbortController().signal,
    ),
  ).toMatchObject({ action: "FINISH", reasonCode: "SOURCES_EXHAUSTED" });
});
