'use client';
import { useState } from 'react';
import { AcademyLesson } from './AcademyLesson';
import { DemoNotice } from './DemoNotice';
export function AcademyView() {
  const [lesson, setLesson] = useState<string | null>(null);
  const startAcademyLesson = (type: string) => setLesson(type);
  return <div className='space-y-3'><section id="tab-academy" className="tab-content space-y-6 animate-fade-in">

            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 md:p-8 rounded-3xl text-white shadow-xl space-y-3 relative overflow-hidden">
                <div className="relative z-10 max-w-2xl space-y-2">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold tracking-wide">آکادمی مهارت جاب مچ</span>
                    <h1 className="text-2xl md:text-3xl font-black">پل میان دانش دانشگاهی و بازار کار واقعی</h1>
                    <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                        یادگیری پروژه‌محور و کوتاه‌مدت برای پر کردن شکاف‌های مهارت در رزومه شما. هر مهارت تکمیلی شانس دعوت به مصاحبه شما را تا ۴۰٪ افزایش می‌دهد.
                    </p>
                </div>
                <div className="absolute left-4 bottom-0 opacity-20 pointer-events-none hidden md:block">
                    <i aria-hidden="true" className="fa-solid fa-graduation-cap text-9xl"></i>
                </div>
            </div>


            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-2xl border border-slate-200 dark:border-dark-border glass-card space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                            <i aria-hidden="true" className="fa-solid fa-bridge text-emerald-500"></i>
                            تحلیل پل شکاف مهارت (Skill Gap Bridge)
                        </h3>
                        <p className="text-xs text-slate-400">مهارت‌هایی که کارفرمایان خواسته‌اند اما هنوز در رزومه شما نیستند:</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-amber-600 dark:text-amber-400">TypeScript Fundamentals</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-bold">ضروری</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">در ۷۰٪ آگهی‌های جونیور React این ماه درخواست شده است.</p>
                        <button onClick={() => { startAcademyLesson('typescript') }} className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all">
                            شروع پودمان ۲۰ دقیقه‌ای
                        </button>
                    </div>

                    <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-brand-500">Git & Team Workflow</span>
                            <span className="text-[10px] bg-brand-500/20 text-brand-500 px-2 py-0.5 rounded font-bold">کاربردی</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">نحوه کار با PR، Git Flow و حل تعارض‌های ریپازیتوری.</p>
                        <button onClick={() => { startAcademyLesson('git') }} className="w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all">
                            شروع پودمان ۱۵ دقیقه‌ای
                        </button>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-emerald-500">AI Prompting for Devs</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-bold">موتور شتاب</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">استفاده از هوش مصنوعی برای کدنویسی ۲ برابری و دیباگ سریع.</p>
                        <button onClick={() => { startAcademyLesson('ai-prompt') }} className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all">
                            شروع پودمان ۱۰ دقیقه‌ای
                        </button>
                    </div>
                </div>
            </div>


            {lesson && <AcademyLesson key={lesson} type={lesson} onClose={() => setLesson(null)} />}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="p-6 rounded-2xl bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                                <i aria-hidden="true" className="fa-brands fa-react text-xl"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-800 dark:text-white">مسیر تسلط فرانت‌اند جونیور</h3>
                                <p className="text-[11px] text-slate-400">۴ پودمان • مجموع زمان ۲ ساعت</p>
                            </div>
                        </div>
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full font-bold">در حال یادگیری</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-500">پیشرفت کل مسیر</span>
                            <span className="text-brand-500">۵۰٪</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-dark-border h-2 rounded-full overflow-hidden">
                            <div className="bg-brand-500 h-full rounded-full" style={{"width":"50%"}}></div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-dark-border/50">
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-dark-card">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">۱. معماری کامپوننت‌های React</span>
                            <span className="text-emerald-500 font-bold"><i aria-hidden="true" className="fa-solid fa-circle-check"></i> تکمیل شد</span>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-dark-card">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">۲. مدیریت وضعیت با Zustand / Redux</span>
                            <span className="text-emerald-500 font-bold"><i aria-hidden="true" className="fa-solid fa-circle-check"></i> تکمیل شد</span>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-dark-card border border-brand-500/30">
                            <span className="text-brand-500 font-bold">۳. اصول تایپ اسکریپت (TypeScript)</span>
                            <button onClick={() => { startAcademyLesson('typescript') }} className="text-[11px] px-2 py-0.5 bg-brand-500 text-white rounded font-bold">ادامه</button>
                        </div>
                    </div>
                </div>


                <div className="p-6 rounded-2xl bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                                <i aria-hidden="true" className="fa-solid fa-wand-magic-sparkles text-xl"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-800 dark:text-white">استراتژی مصاحبه و رزومه‌نویسی AI</h3>
                                <p className="text-[11px] text-slate-400">۳ پودمان • مجموع زمان ۴۵ دقیقه</p>
                            </div>
                        </div>
                        <span className="text-xs bg-slate-200 dark:bg-dark-card text-slate-500 px-2.5 py-1 rounded-full font-bold">شروع نشده</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-500">پیشرفت کل مسیر</span>
                            <span className="text-slate-400">۰٪</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-dark-border h-2 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full" style={{"width":"0%"}}></div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-dark-border/50">
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-dark-card">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">۱. تنظیم دستیار هوشمند برای رزومه ATS</span>
                            <button onClick={() => { startAcademyLesson('ai-prompt') }} className="text-[11px] px-2 py-0.5 bg-purple-500 text-white rounded font-bold">شروع</button>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-dark-card">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">۲. شبیه‌سازی مصاحبه فنی فرانت‌اند</span>
                            <span className="text-slate-400">قفل شده</span>
                        </div>
                    </div>
                </div>
            </div>
        </section><DemoNotice>مسیرها و درصدهای پیشرفت نمونه هستند؛ درس‌ها را می‌توانید باز کنید.</DemoNotice></div>;
}