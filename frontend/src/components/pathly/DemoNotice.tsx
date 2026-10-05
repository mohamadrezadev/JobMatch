export function DemoNotice({ children = 'اطلاعات این بخش نمونه طراحی است و به سوابق واقعی شما اضافه نمی‌شود.' }: { children?: React.ReactNode }) {
  return <p className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400"><span className="rounded bg-brand-500/10 px-2 py-0.5 font-bold text-brand-500">نمونه طراحی</span>{children}</p>;
}
