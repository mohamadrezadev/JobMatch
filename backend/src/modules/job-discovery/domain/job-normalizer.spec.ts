import { normalizeJob } from "./job-normalizer";
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
