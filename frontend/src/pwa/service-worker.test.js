/** @jest-environment node */
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function workerHarness() {
  const listeners = {},
    entries = new Map(),
    cacheNames = ["karmatch-pwa-old", "other-app"];
  const cache = {
    addAll: jest.fn(async () => undefined),
    match: jest.fn(async (request) =>
      entries.get(typeof request === "string" ? request : request.url),
    ),
    put: jest.fn(async (request, response) =>
      entries.set(request.url, response),
    ),
    keys: jest.fn(async () => [...entries.keys()].map((url) => ({ url }))),
    delete: jest.fn(async (request) => entries.delete(request.url)),
  };
  const caches = {
    open: jest.fn(async () => cache),
    keys: jest.fn(async () => cacheNames),
    delete: jest.fn(async () => true),
  };
  const fetch = jest.fn(async () => ({
    ok: true,
    type: "basic",
    headers: { get: () => null },
    clone: () => ({}),
  }));
  const self = {
    location: { origin: "https://karmatch.test" },
    clients: { claim: jest.fn(async () => undefined) },
    skipWaiting: jest.fn(async () => undefined),
    addEventListener: (name, listener) => (listeners[name] = listener),
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "service-worker.js"), "utf8"),
    { self, caches, fetch, URL, Response: class {} },
  );
  function request(url, overrides = {}) {
    return {
      url: "https://karmatch.test" + url,
      method: "GET",
      mode: "cors",
      headers: { has: () => false },
      ...overrides,
    };
  }
  async function dispatch(name, values = {}) {
    const tasks = [];
    const event = {
      ...values,
      waitUntil: (task) => tasks.push(task),
      respondWith: jest.fn((task) => tasks.push(task)),
    };
    listeners[name](event);
    await Promise.all(tasks);
    return event;
  }
  return { self, caches, cache, entries, fetch, request, dispatch };
}

test("API, cross-origin, non-GET, authenticated, RSC and query requests bypass the worker", async () => {
  const w = workerHarness();
  for (const request of [
    w.request("/api/users/profile"),
    w.request("/api"),
    w.request("/brand/karmatch-full.png?user=1"),
    w.request("/_next/static/a.js", {
      headers: { has: (name) => name === "Authorization" },
    }),
    w.request("/_next/static/a.js", {
      headers: { has: (name) => name === "RSC" },
    }),
    w.request("/_next/static/a.js", { method: "POST" }),
    w.request("/file", { url: "https://backend.test/api/resumes" }),
  ]) {
    expect(
      (await w.dispatch("fetch", { request })).respondWith,
    ).not.toHaveBeenCalled();
  }
  expect(w.cache.put).not.toHaveBeenCalled();
});

test("a failed navigation gets the offline page and successful HTML never enters the cache", async () => {
  const w = workerHarness();
  await w.dispatch("fetch", {
    request: w.request("/profile", { mode: "navigate" }),
  });
  expect(w.cache.put).not.toHaveBeenCalled();
  const offline = { body: "offline" };
  w.entries.set("/offline.html", offline);
  w.fetch.mockRejectedValue(new Error("disconnected"));
  const event = await w.dispatch("fetch", {
    request: w.request("/profile", { mode: "navigate" }),
  });
  expect(await event.respondWith.mock.calls[0][0]).toBe(offline);
});

test("only successful public responses without private/no-store caching directives are stored", async () => {
  const w = workerHarness();
  w.fetch.mockResolvedValue({
    ok: true,
    type: "basic",
    headers: { get: () => "private, no-store" },
    clone: () => ({}),
  });
  await w.dispatch("fetch", { request: w.request("/_next/static/a.js") });
  expect(w.cache.put).not.toHaveBeenCalled();
  w.fetch.mockResolvedValue({
    ok: true,
    type: "basic",
    headers: { get: () => null },
    clone: () => ({}),
  });
  await w.dispatch("fetch", { request: w.request("/_next/static/a.js") });
  expect(w.cache.put).toHaveBeenCalledTimes(1);
});

test("new workers wait; activation only removes owned old caches", async () => {
  const w = workerHarness();
  await w.dispatch("install");
  expect(w.self.skipWaiting).not.toHaveBeenCalled();
  await w.dispatch("message", { data: { type: "unrelated" } });
  expect(w.self.skipWaiting).not.toHaveBeenCalled();
  await w.dispatch("message", { data: { type: "ACTIVATE_UPDATE" } });
  expect(w.self.skipWaiting).toHaveBeenCalledTimes(1);
  await w.dispatch("activate");
  expect(w.caches.delete).toHaveBeenCalledWith("karmatch-pwa-old");
  expect(w.caches.delete).not.toHaveBeenCalledWith("other-app");
});

test("runtime cache is bounded and preserves the offline fallback", async () => {
  const w = workerHarness();
  w.entries.set("https://karmatch.test/offline.html", {});
  for (let i = 0; i < 85; i++)
    w.entries.set("https://karmatch.test/_next/static/" + i + ".js", {});
  await w.dispatch("fetch", { request: w.request("/_next/static/new.js") });
  expect(w.entries.size).toBe(80);
  expect(w.entries.has("https://karmatch.test/offline.html")).toBe(true);
});

test("storage failure does not discard a successful network asset", async () => {
  const w = workerHarness();
  w.cache.put.mockRejectedValue(new Error("quota exceeded"));
  const event = await w.dispatch("fetch", {
    request: w.request("/_next/static/a.js"),
  });
  expect((await event.respondWith.mock.calls[0][0]).ok).toBe(true);
});
