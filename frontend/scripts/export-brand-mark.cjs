// Export the UI's vector mark to browser/PWA sizes from one source.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require(
  require.resolve("sharp", {
    paths: [path.dirname(require.resolve("next/package.json"))],
  }),
);
(async () => {
  const output = path.join(__dirname, "../public/brand");
  const source = path.join(output, "karmatch-mark.svg");
  const assets = {};
  for (const size of [32, 48, 180, 192, 512]) {
    const name = `karmatch-icon-${size}.png`;
    await sharp(source, { density: 768 })
      .resize(size, size)
      .png()
      .toFile(path.join(output, name));
    assets[name] = { source: "karmatch-mark.svg", width: size, height: size };
  }
  const mark = await sharp(source, { density: 768 })
    .resize(320, 320)
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#4569F5" },
  })
    .composite([{ input: mark, left: 96, top: 96 }])
    .png()
    .toFile(path.join(output, "karmatch-maskable-512.png"));
  assets["karmatch-maskable-512.png"] = {
    source: "karmatch-mark.svg",
    width: 512,
    height: 512,
  };
  await fs.writeFile(
    path.join(output, "assets.json"),
    JSON.stringify(assets, null, 2) + "\n",
  );
  console.log("Exported vector brand mark to six favicon/PWA assets.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
