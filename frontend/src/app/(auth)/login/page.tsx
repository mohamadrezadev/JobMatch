"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/chat");
    } catch {
      setError(
        "ورود انجام نشد. ایمیل، رمز عبور و اتصال به سرور را بررسی کنید.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <h1 className="mb-2 text-2xl font-black text-slate-800 dark:text-white">
        خوش برگشتی!
      </h1>
      <p className="mb-8 text-xs text-slate-500 dark:text-slate-400">
        برای ادامه مسیر شغلی‌ات وارد کارمچ شو.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="ایمیل"
          type="email"
          dir="ltr"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="رمز عبور"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-xs text-rose-500">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "در حال ورود…" : "ورود به حساب"}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        حساب کاربری نداری؟{" "}
        <Link href="/register" className="font-bold text-brand-500">
          ثبت‌نام
        </Link>
      </p>
    </>
  );
}
