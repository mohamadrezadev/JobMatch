import { sendGuestMessage } from "./guest-chat-stream";
import { TextEncoder, TextDecoder } from "node:util";
import { ReadableStream } from "node:stream/web";
const state = { messages: [], context: {}, remaining: 4 };
const event = (type: string, data: unknown) =>
  `event: ${type}\r\ndata: ${JSON.stringify({ type, data })}\r\n\r\n`;
beforeEach(() => Object.assign(global, { TextEncoder, TextDecoder }));
function response(text: string) {
  const bytes = new TextEncoder().encode(text);
  return {
    ok: true,
    headers: { get: () => "text/event-stream" },
    body: new ReadableStream({
      start(c) {
        for (const byte of bytes) c.enqueue(Uint8Array.of(byte));
        c.close();
      },
    }),
  };
}
it("handles chunked Persian progress and returns only the committed final state", async () => {
  const receive = jest.fn();
  global.fetch = jest.fn(async () =>
    response(
      ": heartbeat\r\n\r\n" +
        event("source.progress", {
          source: "jobvision.ir",
          stage: "extract",
          label: "آگهی",
        }) +
        event("guest.completed", { state }),
    ),
  ) as unknown as typeof fetch;
  expect(
    await sendGuestMessage("Backend", receive, new AbortController().signal),
  ).toEqual(state);
  expect(receive).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/chat/guest/message/stream"),
    expect.objectContaining({ credentials: "include", method: "POST" }),
  );
});
it("preserves the allowance error for an SSE failure after headers were sent", async () => {
  global.fetch = jest.fn(async () =>
    response(
      event("guest.failed", { code: "GUEST_LIMIT_REACHED", status: 403 }),
    ),
  ) as unknown as typeof fetch;
  await expect(
    sendGuestMessage("Backend", jest.fn(), new AbortController().signal),
  ).rejects.toMatchObject({
    response: { status: 403, data: { error: { code: "GUEST_LIMIT_REACHED" } } },
  });
});
it("does not treat premature EOF as a successful turn or automatically resubmit", async () => {
  global.fetch = jest.fn(async () =>
    response(event("context.processing", {})),
  ) as unknown as typeof fetch;
  await expect(
    sendGuestMessage("Backend", jest.fn(), new AbortController().signal),
  ).rejects.toThrow("interrupted");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
it("preserves authentication and throttling errors before a stream starts", async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { code: "RATE_LIMITED" } }),
  })) as unknown as typeof fetch;
  await expect(
    sendGuestMessage("Backend", jest.fn(), new AbortController().signal),
  ).rejects.toMatchObject({
    response: { status: 429, data: { error: { code: "RATE_LIMITED" } } },
  });
});
