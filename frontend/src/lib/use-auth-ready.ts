"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

export function useAuthReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(useAuthStore.persist?.hasHydrated?.() ?? true);
    return useAuthStore.persist?.onFinishHydration?.(() => setReady(true));
  }, []);
  return ready;
}
