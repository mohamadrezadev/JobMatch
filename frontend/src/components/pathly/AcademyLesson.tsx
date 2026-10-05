'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';
const lessons: Record<string, { title: string; text: string; code: string; question: string; answers: string[]; correct: number }> = {
  typescript: { title: 'اصول تایپ‌اسکریپت در ۱۰ دقیقه', text: 'تایپ‌اسکریپت لایه‌ای روی جاوااسکریپت است که خطاهای نوع داده را قبل از اجرای کد شناسایی می‌کند.', code: 'type User = { id: number; name: string; isDeveloper: boolean; };', question: 'برای فیلد isDeveloper کدام نوع داده صحیح است؟', answers: ['string', 'boolean', 'number'], correct: 1 },
  git: { title: 'Git و گردش کار تیمی', text: 'برای هر تغییر یک شاخه بسازید، تغییر را ثبت کنید و درخواست بررسی بفرستید. پیش از ادغام، تفاوت‌ها و تعارض‌ها را بررسی کنید.', code: 'git switch -c feature/my-change\ngit add .\ngit commit -m "Add my change"', question: 'برای بررسی تغییر پیش از ادغام از چه چیزی استفاده می‌کنیم؟', answers: ['حذف شاخه اصلی', 'Pull Request', 'حذف تاریخچه'], correct: 1 },
  'ai-prompt': { title: 'درخواست روشن برای دستیار کدنویسی', text: 'هدف، ورودی، محدودیت‌ها و خروجی مورد انتظار را روشن بیان کنید و نتیجه را با آزمون بررسی کنید.', code: 'هدف: بررسی این تابع\nمحدودیت: قرارداد API تغییر نکند\nخروجی: خطاها و تست‌های لازم', question: 'بعد از گرفتن پاسخ چه کاری لازم است؟', answers: ['بررسی و آزمون نتیجه', 'پذیرش بدون بررسی', 'حذف ورودی'], correct: 0 },
};
export function AcademyLesson({ type, onClose }: { type: string; onClose: () => void }) {
  const lesson = lessons[type] ?? lessons.typescript;
  const [answer, setAnswer] = useState<number | null>(null);
  return <section key={type} id="academy-lesson-container" className="glass-card animate-slide-in space-y-4 rounded-2xl border-2 border-emerald-500/40 bg-light-surface p-6 dark:bg-dark-surface">
    <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-dark-border"><h3 className="flex items-center gap-2 text-sm font-bold text-emerald-500"><Icon name="graduation-cap" />پودمان یادگیری: {lesson.title}</h3><button onClick={onClose} className="text-xs text-slate-400">بستن ✕</button></div>
    <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
      <p>{lesson.text}</p><pre dir="ltr" className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-left font-mono text-[11px] text-slate-100">{lesson.code}</pre>
      <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 font-semibold text-emerald-600 dark:text-emerald-400">{lesson.question}</p>
      <div className="flex flex-wrap gap-2">{lesson.answers.map((value, index) => <button key={value} onClick={() => setAnswer(index)} className={`rounded-lg border px-3 py-2 font-bold ${answer === index ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 dark:border-dark-border'}`}>{value}</button>)}</div>
      {answer !== null && <p role="status" className={answer === lesson.correct ? 'text-emerald-500' : 'text-amber-500'}>{answer === lesson.correct ? 'آفرین! پاسخ صحیح است.' : 'دوباره تلاش کنید.'}</p>}
      {answer === lesson.correct && <Link href="/resume" className="inline-block rounded-lg bg-emerald-500 px-3 py-2 font-bold text-white">ویرایش مهارت‌های رزومه</Link>}
    </div>
  </section>;
}
