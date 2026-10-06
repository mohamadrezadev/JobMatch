const fs = require("node:fs/promises");
const path = require("node:path");
async function buildPwa() {
  const frontend = path.join(__dirname, "..");
  const buildId = (
    await fs.readFile(path.join(frontend, ".next/BUILD_ID"), "utf8")
  ).trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(buildId))
    throw new Error("Invalid Next build id");
  const template = await fs.readFile(
    path.join(frontend, "src/pwa/service-worker.js"),
    "utf8",
  );
  await fs.access(path.join(frontend, "public/offline.html"));
  await fs.writeFile(
    path.join(frontend, "public/sw.js"),
    template.replace("__BUILD_ID__", buildId),
  );
  console.log("PWA worker generated for build " + buildId);
}
buildPwa().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
