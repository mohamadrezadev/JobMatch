import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResumeStudio } from "./ResumeStudio";
import { useResumeDraftStore } from "@/stores/useResumeDraftStore";
import apiClient from "@/lib/api-client";
let mockAuthenticated = false;
jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: mockAuthenticated,
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
  it("reloads current profile facts even when this owner already has a draft", async () => {
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
            : url.endsWith("/skills")
              ? [{ skill: { name: "Excel" } }]
              : {
                  title: "حسابدار",
                  bio: "Current biography",
                  resumeFacts: ["Current education"],
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
        data: url.endsWith("/skills")
          ? []
          : { title: "Backend Developer", bio: "Actual biography" },
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
            : url.endsWith("/skills")
              ? []
              : { title: "Backend", bio: "Profile bio" },
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
