import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KarMatch — کارمچ",
    short_name: "KarMatch",
    description: "مهارت‌های تو، فرصت مناسب تو.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "fa",
    dir: "rtl",
    background_color: "#f8fbff",
    theme_color: "#004bff",
    icons: [
      {
        src: "/brand/karmatch-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/karmatch-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/karmatch-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
