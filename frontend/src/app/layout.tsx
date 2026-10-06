import type { Metadata, Viewport } from "next";
import { PwaControls } from "@/components/pwa/PwaControls";
import "@fontsource/vazirmatn/300.css";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/vazirmatn/900.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "کارمچ | KarMatch - دستیار هوشمند شغلی",
  description: "مهارت‌های تو، فرصت مناسب تو. کارمچ، دستیار هوشمند مسیر شغلی.",
  applicationName: "KarMatch",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "KarMatch", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/brand/karmatch-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/karmatch-icon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: {
      url: "/brand/karmatch-icon-180.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};
export const viewport: Viewport = {
  themeColor: "#4569F5",
  width: "device-width",
  initialScale: 1,
};
const themeScript = `try{var t=localStorage.getItem('pathly_theme');document.documentElement.classList.toggle('dark',t!=='light');document.documentElement.style.colorScheme=t==='light'?'light':'dark'}catch(e){}`;
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        <PwaControls />
      </body>
    </html>
  );
}
