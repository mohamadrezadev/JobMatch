import type { GuestChatState } from "./guest-chat-client";

export interface GuestProgressEvent {
  type: string;
  data: Record<string, unknown>;
}
function failure(
  code: string,
  status?: number,
  details: Record<string, unknown> = {},
) {
  return Object.assign(new Error("Guest request failed"), {
    response: { status, data: { error: { ...details, code } } },
  });
}

export async function sendGuestMessage(
  message: string,
  receive: (event: GuestProgressEvent) => void,
  signal: AbortSignal,
): Promise<GuestChatState> {
  const connection = new AbortController();
  const abort = () => connection.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 90000);
  try {
    const base = (
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    const response = await fetch(`${base}/api/chat/guest/message/stream`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      signal: connection.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw failure(
        body?.error?.code ?? "INTERNAL_ERROR",
        response.status,
        body?.error ?? {},
      );
    }
    if (
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    )
      throw new Error("Guest progress connection unavailable");
    const reader = response.body.getReader(),
      decoder = new TextDecoder();
    let buffer = "";
    try {
      while (!connection.signal.aborted) {
        const { value, done } = await reader.read();
        buffer += done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
          if (boundary.index > 1000000)
            throw new Error("Guest progress frame too large");
          const frame = buffer.slice(0, boundary.index).replace(/\r\n/g, "\n");
          buffer = buffer.slice(boundary.index + boundary[0].length);
          const data = frame
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          const event = JSON.parse(data) as GuestProgressEvent;
          if (
            typeof event.type !== "string" ||
            !event.data ||
            typeof event.data !== "object"
          )
            throw new Error("Invalid guest progress event");
          if (event.type === "guest.failed")
            throw failure(String(event.data.code), Number(event.data.status), {
              ...event.data,
              ...((event.data.availability as Record<string, unknown>) ?? {}),
            });
          if (event.type === "guest.completed") {
            const state = event.data.state as GuestChatState;
            if (
              !Array.isArray(state?.messages) ||
              !state.context ||
              typeof state.remaining !== "number"
            )
              throw new Error("Invalid guest completion");
            return state;
          }
          receive(event);
        }
        if (buffer.length > 1000000)
          throw new Error("Guest progress frame too large");
        if (done) break;
      }
      throw new Error("Guest progress connection interrupted");
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
