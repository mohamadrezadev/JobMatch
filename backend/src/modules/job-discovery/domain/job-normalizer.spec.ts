import { normalizeJob } from "./job-normalizer";
import { filterAndRank } from "./discovery";
const url = "https://jobinja.ir/companies/example/jobs/123/backend";
const page = `## Example Company

# استخدام Backend Developer

* #### موقعیت مکانی

  تهران
* #### نوع همکاری

  تمام وقت
  دورکاری
* #### حقوق

  ۲۰ تا ۳۰ میلیون تومان ماهانه
#### شرح موقعیت شغلی

Develop backend services.
#### معرفی شرکت

Company biography.
* #### مهارتهای مورد نیاز

  Node.js
  PostgreSQL
---
### مشاغل مشابه

* ## Python Developer
  Other Company
`;
describe("Observed Jobinja detail Markdown", () => {
  it("uses primary headings and labeled facts without merging company biography or related jobs", () => {
    expect(normalizeJob(page, url)).toMatchObject({
      title: "استخدام Backend Developer",
      company: "Example Company",
      location: "تهران",
      workType: "Remote",
      salaryMin: 20000000,
      salaryMax: 30000000,
      salaryPeriod: "MONTHLY",
      requiredSkills: ["Node.js", "PostgreSQL"],
      preferredSkills: [],
      description: "Develop backend services.",
      publishedAt: null,
    });
  });
  it("keeps an undisclosed salary null", () => {
    expect(
      normalizeJob(
        page.replace(
          "۲۰ تا ۳۰ میلیون تومان ماهانه",
          "برای مشاهده حقوق وارد شوید",
        ),
        url,
      )?.salaryMin,
    ).toBeNull();
  });
  it("does not apply source-specific assumptions to listings or foreign sources", () => {
    expect(normalizeJob(page, "https://jobinja.ir/jobs")).toBeNull();
    expect(normalizeJob(page, "https://jobvision.ir/jobs/123")).toBeNull();
  });
  it("requires the primary company and description heading, and rejects closed postings", () => {
    expect(
      normalizeJob(page.replace("## Example Company", "Company"), url),
    ).toBeNull();
    expect(
      normalizeJob(page.replace("#### شرح موقعیت شغلی", "Description"), url),
    ).toBeNull();
    expect(normalizeJob("این آگهی بسته شده است\n" + page, url)).toBeNull();
  });
});

describe("Observed rendered job pages", () => {
  const text = `نیکان سازه سدید
|
Nikan Sazeh Sadid
املاک و مستغلات
فرصت‌های شغلی
۱
استخدام کارشناس حسابداری
{{ tooltipText }}
دسته‌بندی شغلی
مالی و حسابداری
موقعیت مکانی
تهران ، تهران
نوع همکاری
تمام وقت
حداقل سابقه کار
بیش از شش سال
حقوق
از ۴۰,۰۰۰,۰۰۰ تومان
شرح موقعیت شغلی
آشنایی با اصول حسابداری
ثبت آگهی استخدام در جابینجا
معرفی شرکت
شرکت ساختمانی
مهارت‌های مورد نیاز
Microsoft Excel
جنسیت
مهم نیست
مشاغل مشابه
حسابدار
شرکت دیگر`;
  it("extracts primary facts from plain text without inventing onsite or monthly salary", () => {
    expect(normalizeJob(text, url)).toMatchObject({
      title: "استخدام کارشناس حسابداری",
      company: "نیکان سازه سدید",
      location: "تهران ، تهران",
      workType: null,
      salaryMin: 40000000,
      salaryPeriod: null,
      description: "آشنایی با اصول حسابداری",
      requiredSkills: ["Microsoft Excel"],
    });
    expect(
      normalizeJob(text.replace("شرح موقعیت شغلی", "توضیحات"), url),
    ).toBeNull();
    expect(normalizeJob(text, "https://jobinja.ir/jobs")).toBeNull();
    expect(normalizeJob("این آگهی بسته شده است\n" + text, url)).toBeNull();
  });
  it("extracts the IranTalent primary company/city and matches a Persian occupation", () => {
    const talent = `# Accountant

 Deniz Foolad Khavaremiyaneh Tehran

Posted Less than 2 weeks

Job Description

Issuing accounting documents.

Employment Type

* Full Time

Job Category

* Accounting

Seniority

* Junior Professional

Details`;
    const job = normalizeJob(
      talent,
      "https://www.irantalent.com/en/job/accountant/184216",
    )!;
    expect(job).toMatchObject({
      title: "Accountant",
      company: "Deniz Foolad Khavaremiyaneh",
      location: "Tehran",
      workType: null,
      description: "Issuing accounting documents.",
      salaryMin: null,
    });
    expect(
      filterAndRank([job], {
        targetRoles: ["حسابداری"],
        locations: ["Tehran"],
      }),
    ).toHaveLength(1);
    expect(
      filterAndRank([job], {
        targetRoles: ["حسابداری"],
        workTypes: ["OnSite"],
      }),
    ).toHaveLength(0);
    expect(
      normalizeJob(
        talent,
        "https://www.irantalent.com/jobs/accountant-jobs-in-tehran",
      ),
    ).toBeNull();
    const translated = talent
      .replace("Posted Less than 2 weeks", "دیروز منتشر شده")
      .replace("Job Description", "توضیحات")
      .replace("Employment Type", "نوع استخدام")
      .replace("Job Category", "گروه شغلی")
      .replace("Seniority", "رده سازمانی")
      .replace("Details", "جزییات");
    expect(
      normalizeJob(
        translated,
        "https://www.irantalent.com/job/accountant/184216",
      ),
    ).toMatchObject({
      title: "Accountant",
      company: "Deniz Foolad Khavaremiyaneh",
      description: "Issuing accounting documents.",
    });
  });
});
