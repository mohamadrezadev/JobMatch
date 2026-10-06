import { renderResumePDF } from "./pdf";
describe("Searchable backend Persian PDF", () => {
  it("renders an actual PDF with registered Persian and English text", async () => {
    const file = await renderResumePDF({
      name: "نام واقعی",
      email: "user@example.test",
      title: "Backend Developer",
      location: "تهران",
      experienceYears: 1,
      summary: "اطلاعات ثبت‌شده کاربر",
      highlights: ["ساخت API"],
      skills_to_emphasize: ["Node.js"],
    });
    expect(file.subarray(0, 5).toString()).toBe("%PDF-");
    expect(file.toString("latin1")).toContain("/Font");
    expect(file.toString("latin1")).toContain("/ToUnicode");
    expect(file.length).toBeGreaterThan(1000);
  }, 20000);
});
