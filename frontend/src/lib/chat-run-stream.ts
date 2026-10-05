import type { RunEvent } from "@/types/chat-run";

export function decodeEvent(frame: string): RunEvent | null {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  const event = JSON.parse(data) as RunEvent;
  if (
    !event ||
    typeof event.runId !== "string" ||
    typeof event.type !== "string" ||
    !Number.isSafeInteger(event.sequence) ||
    event.sequence < 1 ||
    !event.data ||
    typeof event.data !== "object"
  )
    throw new Error("Invalid run event");
  return event;
}

// fetch keeps the existing Bearer authentication. Axios interceptors do not run here.
export async function readRunStream(
  runId: string,
  after: number,
  signal: AbortSignal,
  receive: (event: RunEvent) => void,
) {
  const connection = new AbortController();
  const abort = () => connection.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) connection.abort();
  let timeout = setTimeout(abort, 30000);
  try {
    const token = localStorage.getItem("accessToken");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    const response = await fetch(`${base}/api/chat/runs/${runId}/events`, {
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Last-Event-ID": String(after),
      },
      signal: connection.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const error = new Error("Stream unavailable") as Error & {
        status: number;
      };
      error.status = response.status;
      throw error;
    }
    if (
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    )
      throw new Error("Invalid stream response");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (!connection.signal.aborted) {
        const { value, done } = await reader.read();
        clearTimeout(timeout);
        timeout = setTimeout(abort, 30000);
        buffer += done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });
        // Normalize once frames arrive, preserving a CR split across network chunks.
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, boundary.index).replace(/\r\n/g, "\n");
          buffer = buffer.slice(boundary.index + boundary[0].length);
          const event = decodeEvent(frame);
          if (event) receive(event);
        }
        if (buffer.length > 1000000) throw new Error("Stream frame too large");
        if (done) return;
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
