import { resumeGenerationError } from "./resume-generation-error";

it("shows the actual profile rejection from Nest instead of blaming the model", () => {
  expect(
    resumeGenerationError({
      response: {
        status: 400,
        data: {
          message: "ابتدا پروفایل خود را کامل کنید.",
          error: "Bad Request",
        },
      },
    }),
  ).toBe("ابتدا پروفایل خود را کامل کنید.");
});
it("supports enveloped errors and separates deleted jobs", () => {
  expect(
    resumeGenerationError({
      response: {
        status: 404,
        data: { error: { message: "فرصت شغلی یافت نشد." } },
      },
    }),
  ).toBe("فرصت شغلی یافت نشد.");
});
it("reports provider and network failures without exposing internal errors", () => {
  expect(
    resumeGenerationError({
      response: {
        status: 503,
        data: { message: "private provider diagnostics" },
      },
    }),
  ).toContain("سرویس تولید رزومه");
  expect(resumeGenerationError({ code: "ERR_NETWORK" })).toContain("ارتباط");
});
it("explains stale base conflicts without blaming incomplete profiles", () => {
  expect(
    resumeGenerationError({ response: { status: 409, data: {} } }),
  ).toContain("رزومه پایه تغییر کرده");
  expect(
    resumeGenerationError({
      response: { status: 409, data: { message: "نسخه تغییر کرده است." } },
    }),
  ).toBe("نسخه تغییر کرده است.");
});
