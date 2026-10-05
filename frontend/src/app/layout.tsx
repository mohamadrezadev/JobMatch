import type { Metadata } from 'next';
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import '@fontsource/vazirmatn/900.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'جاب مچ | JobMatch - دستیار هوشمند شغلی',
  description: 'جاب مچ؛ دستیار هوشمند شغلی و مسیر یادگیری',
  icons: { icon: '/jobmatch-logo.svg', apple: '/jobmatch-logo.svg' },
};
const themeScript = `try{var t=localStorage.getItem('pathly_theme');document.documentElement.classList.toggle('dark',t!=='light');document.documentElement.style.colorScheme=t==='light'?'light':'dark'}catch(e){}`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" className="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className="antialiased">{children}</body></html>;
}
