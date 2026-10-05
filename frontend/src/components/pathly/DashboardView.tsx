'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { DemoNotice } from './DemoNotice';
export function DashboardView() {
  const router = useRouter();
  const { user } = useAuthStore();
  const paths: Record<string, string> = { jobs: '/jobs', copilot: '/chat', academy: '/academy', resume: '/resume', dashboard: '/dashboard' };
  const navigate = (tab: string) => router.push(paths[tab] ?? '/dashboard');
  const sendQuickPrompt = (prompt: string) => router.push('/chat?prompt=' + encodeURIComponent(prompt));
  return <div className='space-y-3'><section id="tab-dashboard" className="tab-content space-y-6 animate-fade-in">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-600/10 via-brand-500/5 to-transparent p-6 rounded-2xl border border-brand-500/20">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        سلام {user?.firstName || 'پرهام'} عزیز <span className="animate-bounce inline-block">👋</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        امروز ۳ موقعیت شغلی کاملاً منطبق با مهارت‌های جدید شما پیدا شده است.
                    </p>
                </div>
                <button onClick={() => { navigate('jobs') }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all interactive-hover self-start md:self-auto">
                    <span>مشاهده پیشنهادات شغلی</span>
                    <i aria-hidden="true" className="fa-solid fa-arrow-left text-xs"></i>
                </button>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="p-5 rounded-2xl bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-3 glass-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">تکمیل پروفایل</span>
                        <span className="p-2 rounded-lg bg-brand-500/10 text-brand-500 text-xs font-bold"><i aria-hidden="true" className="fa-solid fa-user-check"></i></span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">۷۸٪</span>
                        <span className="text-xs text-emerald-500 font-medium">+۱۲٪ این هفته</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-dark-border h-2 rounded-full overflow-hidden">
                        <div className="bg-brand-500 h-full rounded-full transition-all duration-1000" style={{"width":"78%"}}></div>
                    </div>
                </div>


                <div className="p-5 rounded-2xl bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-3 glass-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">میانگین انطباق</span>
                        <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold"><i aria-hidden="true" className="fa-solid fa-bullseye"></i></span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">۸۴٪</span>
                        <span className="text-xs text-slate-400">عالی برای جونیور</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">بالاتر از ۷۵٪ شرکت‌های مقصد</p>
                </div>


                <div className="p-5 rounded-2xl bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-3 glass-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">رزومه‌های ارسالی</span>
                        <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500 text-xs font-bold"><i aria-hidden="true" className="fa-solid fa-paper-plane"></i></span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">۴ موقعیت</span>
                    </div>
                    <p className="text-[11px] text-purple-400">۲ مصاحبه فعال در انتظار پاسخ</p>
                </div>


                <div className="p-5 rounded-2xl bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-3 glass-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">پیشرفت آکادمی</span>
                        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold"><i aria-hidden="true" className="fa-solid fa-graduation-cap"></i></span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">۲ از ۵</span>
                        <span className="text-xs text-slate-400">پودمان تکمیلی</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-dark-border h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{"width":"40%"}}></div>
                    </div>
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 glass-card space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-brand-500 bg-brand-500/10 px-3 py-1 rounded-full">برترین پیشنهاد هفته</span>
                        <span className="text-xs text-slate-400"><i aria-hidden="true" className="fa-regular fa-clock ml-1"></i>۲ ساعت پیش</span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">برنامه‌نویس جونیور React / Next.js</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">شرکت پیشگامان فناوری • تهران (هیبرید/دورکاری)</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                            <span className="text-2xl font-black">۹۲٪</span>
                            <span className="text-[10px] font-bold">تطابق مهارت</span>
                        </div>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        تیم محصول ما به‌دنبال یک توسعه‌دهنده باانگیزه جونیور مسلط به React، TypeScript و Tailwind CSS است. شما روی سامانه‌های مالی با ترافیک بالا کار خواهید کرد.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border">React.js</span>
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border">TypeScript</span>
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border">Tailwind CSS</span>
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-semibold">تضمین مصاحبه اولیه</span>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-dark-border/50 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">حقوق پیشنهادی: ۲۲ الی ۲۸ میلیون تومان</span>
                        <button onClick={() => { navigate('jobs') }} className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90">
                            ارسال رزومه سفارشی
                        </button>
                    </div>
                </div>


                <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-6 text-white flex flex-col justify-between space-y-4 shadow-xl">
                    <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                            <i aria-hidden="true" className="fa-solid fa-robot text-lg"></i>
                        </div>
                        <h3 className="text-lg font-bold">دستیار شغلی پت‌لی</h3>
                        <p className="text-xs text-white/80 leading-relaxed">
                            میتوانید فیلترهای شغلی را با زبان طبیعی تغییر دهید، رزومه خود را ارزیابی کنید یا برای مصاحبه تمرین نمایید.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <button onClick={() => { navigate('copilot'); sendQuickPrompt('رزومه من را برای موقعیت‌های جونیور تحلیل کن'); }} className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-medium text-right transition-all flex items-center justify-between">
                            <span>"رزومه من را تحلیل کن"</span>
                            <i aria-hidden="true" className="fa-solid fa-chevron-left text-[10px]"></i>
                        </button>
                        <button onClick={() => { navigate('copilot'); sendQuickPrompt('شغل‌های دورکاری با حقوق بالای ۲۰ میلیون پیشنهاد بده'); }} className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-medium text-right transition-all flex items-center justify-between">
                            <span>"شغل‌های دورکاری پیشنهادی"</span>
                            <i aria-hidden="true" className="fa-solid fa-chevron-left text-[10px]"></i>
                        </button>
                    </div>
                </div>
            </div>
        </section><DemoNotice>آمار، پیشنهاد هفته و درصدها نمونه مرجع هستند.</DemoNotice></div>;
}