import OpenAI from "openai";
import { ModelContextService } from "./model-context.service";
import { emptyContext } from "../domain/conversation";
import { ChatService } from "../application/chat.service";

const message = "10 تا شغل حسابداری بهم پیشنهاد بده";
const resolution = {
  intent: "JOB_SEARCH",
  understood: true,
  context: {
    ...emptyContext(),
    searchContext: { targetRoles: ["حسابداری"], requestedCount: 10 },
  },
};
function setup(content = JSON.stringify(resolution)) {
  const create = jest
    .fn()
    .mockResolvedValue({ choices: [{ message: { content } }] });
  const service = new ModelContextService(
    { chat: { completions: { create } } } as unknown as OpenAI,
    "intent-model",
    20,
  );
  return { service, create };
}
it("sends the original message and previous context to the model before persisting the goal", async () => {
  const { service, create } = setup();
  const previous = emptyContext();
  const saveTurn = jest.fn(async (input) => {
    expect(create).toHaveBeenCalledTimes(1);
    return { id: "conversation", ...input };
  });
  const chat = new ChatService(
    { list: jest.fn(), get: jest.fn(), saveTurn },
    service,
  );
  const result = await chat.send("owner", message);
  expect(result).toMatchObject({
    readyForSearch: true,
    intent: "JOB_SEARCH",
    searchContext: resolution.context.searchContext,
  });
  expect(JSON.parse(create.mock.calls[0][0].messages[1].content)).toEqual({
    message,
    previousContext: previous,
  });
  expect(create.mock.calls[0][0].model).toBe("intent-model");
  expect(saveTurn.mock.calls[0][0].context).toEqual(resolution.context);
});
it("lets the model recognize phrasing outside deterministic wrappers", async () => {
  const { service, create } = setup();
  const result = await service.resolve(
    "برای حسابداری ده فرصت مناسب معرفی می‌کنی؟",
    emptyContext(),
  );
  expect(create).toHaveBeenCalled();
  expect(result).toEqual({ ...resolution, understandingMode: "model" });
});
it.each(["10", "۱۰", "١٠"])(
  "recognizes the reported request when no model is configured (%s)",
  async (count) => {
    const result = await new ModelContextService().resolve(
      `${count} تا شغل حسابداری بهم پیشنهاد بده`,
      emptyContext(),
    );
    expect(result).toMatchObject(resolution);
  },
);
it.each([
  "invalid JSON",
  "null",
  "[]",
  JSON.stringify({ ...resolution, intent: "TOOL_CALL" }),
  JSON.stringify({
    ...resolution,
    context: {
      ...resolution.context,
      searchContext: { targetRoles: ["حسابداری"], requestedCount: -1 },
    },
  }),
  JSON.stringify({
    ...resolution,
    context: {
      ...resolution.context,
      searchContext: { targetRoles: ["حسابداری"], source: "evil.test" },
    },
  }),
])(
  "falls back to validated deterministic extraction on invalid model output %s",
  async (content) => {
    expect(
      await setup(content).service.resolve(message, emptyContext()),
    ).toMatchObject(resolution);
  },
);
it("bounds an unavailable model and cancels the request before fallback", async () => {
  const { service, create } = setup();
  create.mockImplementation(() => new Promise(() => undefined));
  expect(await service.resolve(message, emptyContext())).toMatchObject(
    resolution,
  );
  expect(create.mock.calls[0][1].signal.aborted).toBe(true);
});
it("preserves candidate facts and does not mutate prior context", async () => {
  const previous = emptyContext();
  previous.candidateFacts.skills = ["Excel"];
  const expected = {
    ...resolution,
    context: { ...resolution.context, candidateFacts: previous.candidateFacts },
  };
  const { service } = setup(JSON.stringify(expected));
  expect(await service.resolve(message, previous)).toEqual({
    ...expected,
    understandingMode: "model",
  });
  expect(previous.searchContext.targetRoles).toEqual([]);
});
