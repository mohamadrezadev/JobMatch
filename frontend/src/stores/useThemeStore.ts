import { create } from 'zustand';
type Theme = 'dark' | 'light';
function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem('pathly_theme', theme); } catch {}
}
export const useThemeStore = create<{ theme: Theme; initialize: () => void; toggle: () => void }>((set, get) => ({
  theme: 'dark',
  initialize: () => {
    let theme: Theme = 'dark';
    try { if (localStorage.getItem('pathly_theme') === 'light') theme = 'light'; } catch {}
    apply(theme); set({ theme });
  },
  toggle: () => { const theme = get().theme === 'dark' ? 'light' : 'dark'; apply(theme); set({ theme }); },
}));
