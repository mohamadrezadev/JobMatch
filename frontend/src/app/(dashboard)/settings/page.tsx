"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/useAuthStore";
import apiClient from "@/lib/api-client";
import { unwrap } from "@/lib/pathly-data";
export default function SettingsPage() {
  const { logout } = useAuthStore();
  const [workType, setWorkType] = useState("Remote");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true;
    apiClient
      .get("/api/users/preferences")
      .then((res) => {
        if (!alive) return;
        const data = unwrap(res.data) as {
          workType: string | null;
          desiredSalary: number | null;
          location: string | null;
        };
        setWorkType(data.workType ?? "Remote");
        setSalary(data.desiredSalary?.toString() ?? "");
        setLocation(data.location ?? "");
      })
      .catch(() => {
        if (alive) setNotice("دریافت تنظیمات انجام نشد.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function save() {
    setBusy(true);
    setNotice("");
    try {
      await apiClient.put("/api/users/preferences", {
        workType,
        location,
        desiredSalary: salary ? Number(salary) : 0,
      });
      setNotice("تنظیمات ذخیره شد.");
    } catch {
      setNotice("ذخیره تنظیمات انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">تنظیمات</h1>
      <Card>
        <div className="space-y-4">
          <label className="block">
            نوع همکاری
            <select
              aria-label="نوع همکاری"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="mx-3 rounded border p-2 dark:bg-dark-card"
            >
              <option value="Remote">دورکار</option>
              <option value="OnSite">حضوری</option>
              <option value="Hybrid">هیبرید</option>
            </select>
          </label>
          <label className="block">
            شهر
            <input
              aria-label="شهر"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mx-3 rounded border p-2 dark:bg-dark-card"
            />
          </label>
          <label className="block">
            حداقل حقوق ماهانه (تومان)
            <input
              aria-label="حداقل حقوق ماهانه"
              type="number"
              min="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="mx-3 rounded border p-2 dark:bg-dark-card"
            />
          </label>
          {notice && <p role="status">{notice}</p>}
          <Button disabled={busy} onClick={save}>
            {busy ? "در حال پردازش…" : "ذخیره تنظیمات"}
          </Button>
          <Button variant="ghost" onClick={logout}>
            خروج از حساب
          </Button>
        </div>
      </Card>
    </div>
  );
}
