"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, firstName, lastName);
      router.push("/chat");
    } catch {
      setError("ثبت‌نام انجام نشد. ایمیل و اتصال به سرور را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <h1 className="mb-2 text-2xl font-black text-slate-800 dark:text-white">
        مسیرت را با کارمچ شروع کن
      </h1>
      <p className="mb-8 text-xs text-slate-500 dark:text-slate-400">
        برای شروع گفتگو نیازی به رزومه یا پروفایل کامل نداری.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="نام"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
          <Input
            label="نام خانوادگی"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>
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
          minLength={8}
          autoComplete="new-password"
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
          {loading ? "در حال ساخت حساب…" : "ساخت حساب کاربری"}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        قبلاً ثبت‌نام کرده‌ای؟{" "}
        <Link href="/login" className="font-bold text-brand-500">
          ورود
        </Link>
      </p>
    </>
  );
}
