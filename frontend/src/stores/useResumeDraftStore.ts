import { create } from "zustand";
export interface ResumeDraft {
  name: string;
  title: string;
  summary: string;
  skills: string;
  projects: string;
  email: string;
}
const sample: ResumeDraft = {
  name: "پرهام رضایی",
  title: "توسعه‌دهنده فرانت‌اند (Junior Frontend Developer)",
  summary:
    "توسعه‌دهنده باانگیزه وب مسلط به React.js و JavaScript ES6+. علاقمند به ساخت رابط‌های کاربری مدرن، بهینه‌سازی سرعت و یادگیری ابزارهای جدید.",
  skills: "React.js, JavaScript, HTML5/CSS3, Tailwind CSS, Git, Rest API",
  email: "parham@example.com",
  projects:
    "پروژه داشبورد مدیریتی (پروژه شخصی)\nطراحی و پیاده‌‌سازی کامل پنل کاربری با React و Tailwind CSS به همراه نمودارهای تعاملی Chart.js.",
};
export const useResumeDraftStore = create<{
  owner: string;
  draft: ResumeDraft;
  initialize: (owner: string, name?: string, email?: string) => void;
  update: (values: Partial<ResumeDraft>) => void;
}>((set) => ({
  owner: "guest",
  draft: {
    name: "",
    email: "",
    title: "",
    summary: "",
    skills: "",
    projects: "",
  },
  initialize: (owner, name = "", email = "") =>
    set({
      owner,
      draft:
        owner === "demo"
          ? { ...sample }
          : { name, email, title: "", summary: "", skills: "", projects: "" },
    }),
  update: (values) =>
    set((state) => ({ draft: { ...state.draft, ...values } })),
}));
