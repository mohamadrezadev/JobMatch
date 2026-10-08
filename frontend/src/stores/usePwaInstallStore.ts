import { create } from "zustand";

export const usePwaInstallStore = create<{
  installed: boolean;
  open: boolean;
  setInstalled: (installed: boolean) => void;
  openInstallDialog: () => void;
  closeInstallDialog: () => void;
}>((set) => ({
  installed: true,
  open: false,
  setInstalled: (installed) => set({ installed }),
  openInstallDialog: () => set({ open: true }),
  closeInstallDialog: () => set({ open: false }),
}));
