import type { Job } from '@/types/job';
export interface PathlyJob {
  id: string; title: string; company: string; location: string; locationText: string;
  type: string; salary: string; score?: number; matchedSkills: string[]; missingSkills: string[];
  source?: string; sourceUrl?: string; description: string; isRemote: boolean; isHybrid: boolean; demo: boolean;
}
export const demoJobs: PathlyJob[] = [
  { id: 'demo-1', title: 'برنامه‌نویس جونیور React / Next.js', company: 'شرکت پیشگامان فناوری', location: 'tehran', locationText: 'تهران (هیبرید)', type: 'تمام وقت', salary: '۲۲ الی ۲۸ میلیون تومان', score: 92, matchedSkills: ['React.js', 'JavaScript', 'Tailwind CSS', 'Git'], missingSkills: ['TypeScript Fundamentals'], description: 'ما به‌دنبال یک همکار جونیور مشتاق به یادگیری برای پیاده‌سازی کامپوننت‌های مدرن وب هستیم.', isRemote: false, isHybrid: true, demo: true },
  { id: 'demo-2', title: 'کارآموز توسعه‌‌دهنده فرانت‌اند', company: 'استارتاپ هوش‌نو', location: 'remote', locationText: 'کاملاً دورکاری (Remote)', type: 'کارآموزی / تمام وقت', salary: '۱۲ الی ۱۶ میلیون تومان', score: 85, matchedSkills: ['React.js', 'HTML5/CSS3', 'Git'], missingSkills: ['TypeScript', 'REST API'], description: 'فرصت عالی برای شروع مسیر شغلی همراه با منتورشیپ مستقیم ارشد تیم.', isRemote: true, isHybrid: false, demo: true },
  { id: 'demo-3', title: 'توسعه‌دهنده وب (Frontend Developer)', company: 'گروه رایان گستر', location: 'tehran', locationText: 'تهران (حضوری)', type: 'تمام وقت', salary: '۲۰ الی ۲۵ میلیون تومان', score: 78, matchedSkills: ['JavaScript', 'HTML5/CSS3', 'Rest API'], missingSkills: ['React.js Advanced'], description: 'توسعه و نگهداری وب‌سایت‌های سازمانی با استاندارد پاسخگویی بالا.', isRemote: false, isHybrid: false, demo: true },
];
export function unwrap<T>(response: T | { success: boolean; data: T }): T {
  return response && typeof response === 'object' && 'success' in response && 'data' in response ? response.data : response as T;
}
export function toPathlyJob(job: Job): PathlyJob {
  const salary = job.salaryMin != null || job.salaryMax != null ? [job.salaryMin, job.salaryMax].filter(value => value != null).map(value => value!.toLocaleString('fa-IR')).join(' الی ') + (job.currency === 'TOMAN' ? ' تومان' : ' (واحد اعلام نشده)') : 'حقوق اعلام نشده';
  const work = job.workType === 'Remote' ? 'دورکاری' : job.workType === 'Hybrid' ? 'هیبرید' : job.workType === 'OnSite' ? 'حضوری' : 'نوع حضور اعلام نشده';
  return { id: job.id, title: job.title, company: job.company, location: job.location ?? '', locationText: `${job.location ?? 'شهر اعلام نشده'} (${work})`, type: job.experienceLevel ?? 'سطح تجربه اعلام نشده', salary, matchedSkills: job.requiredSkills.map(skill => skill.name), missingSkills: [], description: job.description ?? 'شرح موقعیت در منبع اعلام نشده است.', isRemote: job.workType === 'Remote', isHybrid: job.workType === 'Hybrid', demo: false, source: job.source, sourceUrl: job.sourceUrl ?? undefined };
}