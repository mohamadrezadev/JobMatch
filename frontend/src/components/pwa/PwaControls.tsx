"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { usePwaInstallStore } from "@/stores/usePwaInstallStore";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const installed = usePwaInstallStore((state) => state.installed);
  const openInstallDialog = usePwaInstallStore(
    (state) => state.openInstallDialog,
  );
  if (installed) return null;
  return (
    <button
      type="button"
      onClick={openInstallDialog}
      aria-haspopup="dialog"
      aria-label="نصب کارمچ"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-brand-500 dark:border-dark-border"
    >
      <BrandLogo className="h-5 w-5" />
    </button>
  );
}

export function PwaControls() {
  const setInstalled = usePwaInstallStore((state) => state.setInstalled);
  const open = usePwaInstallStore((state) => state.open);
  const closeInstallDialog = usePwaInstallStore(
    (state) => state.closeInstallDialog,
  );
  const [ios, setIos] = useState(false);
  const [offline, setOffline] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [busy, setBusy] = useState(false);
  const [installNotice, setInstallNotice] = useState("");
  const [updateError, setUpdateError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const applyRequested = useRef(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const fullscreen = window.matchMedia("(display-mode: fullscreen)");
    const checkInstalled = () =>
      setInstalled(
        standalone.matches ||
          fullscreen.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const checkOnline = () => setOffline(!navigator.onLine);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
      setInstallNotice("");
    };
    const didInstall = () => {
      setInstalled(true);
      setPrompt(null);
      closeInstallDialog();
    };
    setIos(
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    checkInstalled();
    checkOnline();
    standalone.addEventListener("change", checkInstalled);
    fullscreen.addEventListener("change", checkInstalled);
    window.addEventListener("online", checkOnline);
    window.addEventListener("offline", checkOnline);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", didInstall);
    return () => {
      standalone.removeEventListener("change", checkInstalled);
      fullscreen.removeEventListener("change", checkInstalled);
      window.removeEventListener("online", checkOnline);
      window.removeEventListener("offline", checkOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", didInstall);
    };
  }, [closeInstallDialog, setInstalled]);

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !window.isSecureContext ||
      !("serviceWorker" in navigator)
    )
      return;
    let stopped = false;
    let registration: ServiceWorkerRegistration | undefined;
    const workerListeners = new Map<ServiceWorker, () => void>();
    const controllerChanged = () => {
      if (applyRequested.current) {
        applyRequested.current = false;
        window.location.reload();
      }
    };
    const checkWaiting = () => {
      if (
        !stopped &&
        registration?.waiting &&
        navigator.serviceWorker.controller
      )
        setWaiting(registration.waiting);
    };
    const updateFound = () => {
      const worker = registration?.installing;
      if (!worker || workerListeners.has(worker)) return;
      const stateChanged = () => {
        if (worker.state === "installed") checkWaiting();
      };
      workerListeners.set(worker, stateChanged);
      worker.addEventListener("statechange", stateChanged);
    };
    const checkUpdate = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void registration?.update().catch(() => undefined);
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controllerChanged,
    );
    document.addEventListener("visibilitychange", checkUpdate);
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((value) => {
        if (stopped) return;
        registration = value;
        registration.addEventListener("updatefound", updateFound);
        checkWaiting();
        updateFound();
      })
      .catch(() => {
        if (!stopped)
          setInstallNotice(
            "آماده‌سازی نسخه آفلاین انجام نشد. پس از اتصال، صفحه را دوباره باز کن.",
          );
      });
    return () => {
      stopped = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controllerChanged,
      );
      document.removeEventListener("visibilitychange", checkUpdate);
      registration?.removeEventListener("updatefound", updateFound);
      workerListeners.forEach((listener, worker) =>
        worker.removeEventListener("statechange", listener),
      );
    };
  }, []);

  async function install() {
    if (!prompt || busy) return;
    const event = prompt;
    setBusy(true);
    setPrompt(null);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        closeInstallDialog();
      } else
        setInstallNotice(
          "نصب انجام نشد. می‌توانی بعداً از منوی مرورگر برنامه را نصب کنی.",
        );
    } catch {
      setInstallNotice(
        "پنجره نصب باز نشد. از گزینه نصب یا افزودن به صفحه اصلی در منوی مرورگر استفاده کن.",
      );
    } finally {
      setBusy(false);
    }
  }

  function update() {
    if (!waiting) return;
    if (waiting.state === "redundant") {
      setUpdateError("این آپدیت در دسترس نیست. صفحه را دوباره باز کن.");
      return;
    }
    try {
      applyRequested.current = true;
      waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    } catch {
      applyRequested.current = false;
      setUpdateError("آپدیت فعال نشد. دوباره تلاش کن.");
    }
  }

  return (
    <>
      {offline && (
        <p
          role="status"
          className="fixed inset-x-0 top-0 z-[70] bg-amber-100 px-4 py-2 text-center text-xs text-amber-950"
        >
          اتصال اینترنت قطع است؛ گفتگو، جست‌وجوی آگهی و ساخت رزومه به اینترنت
          نیاز دارند.
        </p>
      )}
      {waiting && (
        <div
          dir="ltr"
          className="fixed bottom-20 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 md:bottom-6"
        >
          <section
            aria-label="به‌روزرسانی کارمچ"
            className="max-w-sm rounded-2xl border border-brand-500/30 bg-light-surface p-4 text-sm shadow-lg dark:bg-dark-surface"
          >
            <p>نسخه جدید کارمچ آماده است.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              قبل از به‌روزرسانی، ویرایش‌ها و متن‌های ذخیره‌نشده را ذخیره کن.
              صفحه دوباره باز می‌شود.
            </p>
            <button
              type="button"
              onClick={update}
              className="mt-3 rounded-lg bg-brand-500 px-3 py-2 text-xs text-white"
            >
              به‌روزرسانی برنامه
            </button>
            {updateError && (
              <p role="alert" className="mt-2 text-xs text-amber-600">
                {updateError}
              </p>
            )}
          </section>
        </div>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="install-title"
        onCancel={closeInstallDialog}
        onClose={closeInstallDialog}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-light-surface p-6 text-slate-800 shadow-xl backdrop:bg-black/50 dark:border-dark-border dark:bg-dark-surface dark:text-slate-100"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="install-title" className="font-bold">
            نصب کارمچ روی دستگاه
          </h2>
          <button
            type="button"
            onClick={closeInstallDialog}
            aria-label="بستن راهنمای نصب"
            className="rounded-lg px-2 py-1"
          >
            ✕
          </button>
        </div>
        <p className="text-sm leading-7">
          کارمچ را به صفحه اصلی اضافه کن تا مثل یک برنامه مستقل باز شود.
        </p>
        {ios ? (
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-7">
            <li>این سایت را در Safari باز کن.</li>
            <li>دکمه اشتراک‌گذاری (Share) را بزن.</li>
            <li>
              «افزودن به صفحه اصلی» (Add to Home Screen) را انتخاب کن و Add را
              بزن.
            </li>
          </ol>
        ) : prompt ? (
          <button
            type="button"
            onClick={() => void install()}
            disabled={busy}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "در حال نصب…" : "نصب روی دستگاه"}
          </button>
        ) : (
          <p className="mt-3 text-sm leading-7">
            در منوی مرورگر دنبال «نصب برنامه» یا «افزودن به صفحه اصلی» بگرد. اگر
            این گزینه‌ها موجود نیستند، همچنان می‌توانی از نسخه وب استفاده کنی.
          </p>
        )}
        <p className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">
          گفتگو، دریافت آگهی‌های جدید و تولید رزومه به اینترنت نیاز دارند.
        </p>
        {installNotice && (
          <p role="status" className="mt-3 text-xs leading-6 text-amber-600">
            {installNotice}
          </p>
        )}
      </dialog>
    </>
  );
}
