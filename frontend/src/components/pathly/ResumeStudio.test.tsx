import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResumeStudio } from "./ResumeStudio";
import { useResumeDraftStore } from "@/stores/useResumeDraftStore";
import apiClient from "@/lib/api-client";
let mockAuthenticated = false;
jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: mockAuthenticated,
    isProfileComplete: mockAuthenticated,
    user: mockAuthenticated
      ? {
          id: "owner",
          firstName: "Actual",
          lastName: "User",
          email: "actual@example.test",
        }
      : null,
  }),
}));
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
describe("Resume studio truthfulness and preview", () => {
  it("reloads the server base even when this owner already has a draft", async () => {
    mockAuthenticated = true;
    useResumeDraftStore
      .getState()
      .initialize("owner", "Old name", "old@example.test");
    useResumeDraftStore
      .getState()
      .update({ title: "Old title", summary: "Old summary" });
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === "/api/resumes"
            ? []
            : {
                version: 0,
                content: {
                  name: "Actual User",
                  email: "actual@example.test",
                  title: "حسابدار",
                  summary: "Current biography",
                  highlights: ["Current education"],
                  skills_to_emphasize: ["Excel"],
                },
              },
      }),
    );
    render(<ResumeStudio />);
    await waitFor(() =>
      expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
        "Current biography",
      ),
    );
    expect(screen.getByLabelText("نام و نام خانوادگی")).toHaveValue(
      "Actual User",
    );
    expect(screen.getByLabelText("عنوان شغلی")).toHaveValue("حسابدار");
    expect(
      screen.getByLabelText("مهارت‌های اصلی (با ویرگول جدا کنید)"),
    ).toHaveValue("Excel");
  });
  it("keeps base and manual edits separate until a proposal is accepted", async () => {
    mockAuthenticated = true;
    window.history.replaceState({}, "", "/resume?job=job-id");
    const content = {
      name: "Actual User",
      title: "Backend",
      summary: "Saved base",
      highlights: ["Real project"],
      skills_to_emphasize: ["Node.js"],
    };
    const saved = {
      id: "resume-id",
      jobId: "job-id",
      version: 2,
      content: { ...content, summary: "Saved manual edit" },
    };
    const proposal = {
      id: "proposal-id",
      jobId: "job-id",
      baseVersion: 1,
      status: "PROPOSED",
      content: { ...content, summary: "Real project" },
    };
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === "/api/resumes/base"
            ? { version: 1, content }
            : url === "/api/resumes"
              ? [saved]
              : url.includes("/proposals")
                ? []
                : { title: "Backend", company: "Company" },
      }),
    );
    (apiClient.post as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === "/api/resume/generate"
            ? proposal
            : { ...saved, version: 3, content: proposal.content },
      }),
    );
    render(<ResumeStudio />);
    await waitFor(() =>
      expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
        "Saved manual edit",
      ),
    );
    fireEvent.change(screen.getByLabelText("خلاصه حرفه‌ای"), {
      target: { value: "Unsaved manual edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "نسخه مخصوص آگهی" }));
    expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
      "Unsaved manual edit",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "سفارشی‌سازی برای شغل منتخب" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "پذیرش پیشنهاد و ساخت نسخه مخصوص آگهی",
        }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
      "Unsaved manual edit",
    );
    expect(apiClient.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "رزومه پایه" }));
    expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue("Saved base");
    fireEvent.change(screen.getByLabelText("خلاصه حرفه‌ای"), {
      target: { value: "Unsaved base" },
    });
    fireEvent.click(screen.getByRole("button", { name: "رزومه پایه" }));
    expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue("Unsaved base");
    expect(
      screen.getByRole("button", { name: "سفارشی‌سازی برای شغل منتخب" }),
    ).toBeDisabled();
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { version: 2, content: { ...content, summary: "Unsaved base" } },
    });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره رزومه پایه" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "نسخه مخصوص آگهی" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "نسخه مخصوص آگهی" }));
    expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
      "Unsaved manual edit",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "پذیرش پیشنهاد و ساخت نسخه مخصوص آگهی",
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
        "Real project",
      ),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/resumes/proposals/proposal-id/accept",
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticated = false;
    window.history.replaceState({}, "", "/resume?preview=design");
    useResumeDraftStore.getState().initialize("demo");
  });
  it("updates its preview from explicitly edited fields", () => {
    render(<ResumeStudio />);
    fireEvent.change(screen.getByLabelText("نام و نام خانوادگی"), {
      target: { value: "نام جدید" },
    });
    expect(document.querySelector("#preview-name")).toHaveTextContent(
      "نام جدید",
    );
    fireEvent.change(
      screen.getByLabelText("مهارت‌های اصلی (با ویرگول جدا کنید)"),
      { target: { value: "React, TypeScript" } },
    );
    expect(document.querySelector("#preview-skills")).toHaveTextContent(
      "TypeScript",
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it("does not transplant sample projects or skills into an authenticated user", async () => {
    mockAuthenticated = true;
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === "/api/resumes"
            ? []
            : {
                version: 0,
                content: {
                  name: "Actual User",
                  email: "actual@example.test",
                  title: "Backend Developer",
                  summary: "Actual biography",
                  highlights: [],
                  skills_to_emphasize: [],
                },
              },
      }),
    );
    render(<ResumeStudio />);
    await waitFor(() =>
      expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
        "Actual biography",
      ),
    );
    expect(screen.getByLabelText("نام و نام خانوادگی")).toHaveValue(
      "Actual User",
    );
    expect(
      screen.getByLabelText("مهارت‌های اصلی (با ویرگول جدا کنید)"),
    ).toHaveValue("");
    expect(document.querySelector("#resume-print-area")).not.toHaveTextContent(
      "پروژه داشبورد مدیریتی",
    );
    expect(document.querySelector("#resume-print-area")).not.toHaveTextContent(
      "parham@example.com",
    );
  });
  it("keeps unavailable profile fields empty rather than inventing credentials", async () => {
    mockAuthenticated = true;
    (apiClient.get as jest.Mock).mockRejectedValue(
      new Error("missing profile"),
    );
    render(<ResumeStudio />);
    await waitFor(() =>
      expect(screen.getByLabelText("خلاصه حرفه‌ای")).not.toBeDisabled(),
    );
    expect(screen.getByLabelText("عنوان شغلی")).toHaveValue("");
    expect(
      screen.getByLabelText("مهارت‌های اصلی (با ویرگول جدا کنید)"),
    ).toHaveValue("");
    expect(useResumeDraftStore.getState().draft.projects).toBe("");
  });
  it("restores backend resumes and saves explicit edits against the resume id", async () => {
    mockAuthenticated = true;
    window.history.replaceState({}, "", "/resume?job=job-id");
    const saved = {
      id: "resume-id",
      jobId: "job-id",
      version: 2,
      content: {
        name: "Actual User",
        email: "actual@example.test",
        title: "Backend",
        summary: "Saved summary",
        highlights: ["Saved project"],
        skills_to_emphasize: ["Node.js"],
      },
    };
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === "/api/resumes"
            ? [saved]
            : url.includes("/proposals")
              ? []
              : url === "/api/resumes/base"
                ? {
                    version: 1,
                    content: { ...saved.content, summary: "Base summary" },
                  }
                : { title: "Backend", company: "Target company" },
      }),
    );
    (apiClient.put as jest.Mock).mockResolvedValue({ data: saved });
    render(<ResumeStudio />);
    await waitFor(() =>
      expect(screen.getByLabelText("خلاصه حرفه‌ای")).toHaveValue(
        "Saved summary",
      ),
    );
    expect(
      screen.getByLabelText("سوابق / پروژه‌های ثبت‌شده توسط شما"),
    ).toHaveValue("Saved project");
    fireEvent.change(screen.getByLabelText("خلاصه حرفه‌ای"), {
      target: { value: "My edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره ویرایش" }));
    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        "/api/resumes/resume-id",
        expect.objectContaining({ summary: "My edit" }),
      ),
    );
  });
});
