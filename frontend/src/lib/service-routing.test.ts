const originalPublic = process.env.NEXT_PUBLIC_API_URL;
const originalInternal = process.env.API_INTERNAL_URL;
afterEach(() => {
  if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalPublic;
  if (originalInternal === undefined) delete process.env.API_INTERNAL_URL;
  else process.env.API_INTERNAL_URL = originalInternal;
  jest.resetModules();
});
it("keeps API requests on the site origin when the public API URL is explicitly empty", () => {
  process.env.NEXT_PUBLIC_API_URL = "";
  jest.resetModules();
  expect(require("./api-client").default.defaults.baseURL).toBe("");
});
it("preserves the development backend when no API URL was configured", () => {
  delete process.env.NEXT_PUBLIC_API_URL;
  jest.resetModules();
  expect(require("./api-client").default.defaults.baseURL).toBe("http://localhost:3000");
});
it("routes API paths to the configured private backend and allows long searches", async () => {
  process.env.API_INTERNAL_URL = "http://backend-xfz-service/";
  const config = require("../../next.config.js")("phase-production-build");
  expect(await config.rewrites()).toEqual([{ source: "/api/:path*", destination: "http://backend-xfz-service/api/:path*" }]);
  expect(config.experimental.proxyTimeout).toBe(120000);
  delete process.env.API_INTERNAL_URL;
  expect(await config.rewrites()).toEqual([]);
});
