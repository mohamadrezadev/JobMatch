// Deterministic export of the supplied logo artwork: crop empty canvas and resize only.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require(
  require.resolve("sharp", {
    paths: [path.dirname(require.resolve("next/package.json"))],
  }),
);
const sourceDir = process.argv[2];
if (!sourceDir)
  throw new Error("Pass the directory containing the four supplied PNG files.");
const files = {
  app: "ChatGPT Image Oct 6, 2026, 10_06_07 AM-4.png",
  vertical: "ChatGPT Image Oct 6, 2026, 10_06_05 AM-3.png",
  full: "ChatGPT Image Oct 6, 2026, 10_06_03 AM-1.png",
  wordmark: "ChatGPT Image Oct 6, 2026, 10_06_04 AM-2.png",
};
(async () => {
  const output = path.join(__dirname, "../public/brand");
  await fs.mkdir(output, { recursive: true });
  const assets = {};
  for (const [name, file] of Object.entries(files)) {
    if (name === "app") continue;
    const destination = `karmatch-${name}.png`;
    const result = await sharp(path.join(sourceDir, file))
      .trim({ threshold: 8 })
      .resize({
        width: name === "vertical" ? 640 : 1200,
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9 })
      .toFile(path.join(output, destination));
    assets[destination] = {
      source: file,
      width: result.width,
      height: result.height,
    };
  }
  // Extract the supplied rounded app tile, retaining the complete K artwork.
  const icon = await sharp(path.join(sourceDir, files.app))
    .extract({ left: 180, top: 182, width: 894, height: 894 })
    .png()
    .toBuffer();
  for (const size of [32, 48, 180, 192, 512]) {
    const destination = `karmatch-icon-${size}.png`;
    await sharp(icon)
      .resize(size, size)
      .png()
      .toFile(path.join(output, destination));
    assets[destination] = { source: files.app, width: size, height: size };
  }
  // Keep all artwork inside the maskable icon's central safe area.
  await sharp(icon)
    .resize(360, 360)
    .extend({ top: 76, bottom: 76, left: 76, right: 76, background: "#f8fbff" })
    .png()
    .toFile(path.join(output, "karmatch-maskable-512.png"));
  assets["karmatch-maskable-512.png"] = {
    source: files.app,
    width: 512,
    height: 512,
  };
  await fs.writeFile(
    path.join(output, "assets.json"),
    JSON.stringify(assets, null, 2) + "\n",
  );
  console.log(JSON.stringify(assets, null, 2));
})();
