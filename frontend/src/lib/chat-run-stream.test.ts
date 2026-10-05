import { decodeEvent, readRunStream } from "./chat-run-stream";
import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream } from "node:stream/web";

const event = {
  id: "e",
  runId: "run",
  type: "assistant.completed",
  sequence: 1,
  timestamp: "now",
  data: { text: "فرصت شغلی" },
};
beforeEach(() => {
  Object.assign(global, { TextDecoder, TextEncoder });
  localStorage.setItem("accessToken", "fixture-token");
});
afterEach(() => {
  jest.restoreAllMocks();
});
it("ignores heartbeats and decodes named SSE events", () => {
  expect(decodeEvent(": heartbeat")).toBeNull();
  expect(
    decodeEvent(
      `id: 1\nevent: assistant.completed\ndata: ${JSON.stringify(event)}`,
    ),
  ).toEqual(event);
  expect(() => decodeEvent('data: {"sequence":0}')).toThrow(
    "Invalid run event",
  );
});
it("handles UTF-8, CRLF and event delimiters split across network chunks", async () => {
  const bytes = new TextEncoder().encode(
    `: heartbeat\r\n\r\nid: 1\r\nevent: assistant.completed\r\ndata: ${JSON.stringify(event)}\r\n\r\n`,
  );
  const fetchMock = jest.fn(async () => ({
    ok: true,
    headers: { get: () => "text/event-stream" },
    body: new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    }),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  const receive = jest.fn();
  await readRunStream("run", 7, new AbortController().signal, receive);
  expect(receive).toHaveBeenCalledTimes(1);
  expect(receive).toHaveBeenCalledWith(event);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/api/chat/runs/run/events"),
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer fixture-token",
        "Last-Event-ID": "7",
      }),
    }),
  );
});
it("exposes auth failure so reconnect does not loop on an expired session", async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 401,
  })) as unknown as typeof fetch;
  await expect(
    readRunStream("run", 0, new AbortController().signal, jest.fn()),
  ).rejects.toMatchObject({ status: 401 });
});
