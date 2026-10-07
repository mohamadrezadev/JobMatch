import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import RegisterPage from "./page";

const register = jest.fn();
const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: (selector: (state: { register: typeof register }) => unknown) =>
    selector({ register }),
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a specific message for a duplicate email", async () => {
    register.mockRejectedValue(
      new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: { headers: {} } as never,
        data: {},
      }),
    );
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("نام", { exact: true }), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "احمدی");
    await user.type(screen.getByLabelText("ایمیل"), "used@example.com");
    await user.type(screen.getByLabelText("رمز عبور"), "password123");
    await user.click(screen.getByRole("button", { name: "ساخت حساب کاربری" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "این ایمیل قبلاً ثبت شده است. وارد حساب خود شوید یا از ایمیل دیگری استفاده کنید.",
    );
    expect(push).not.toHaveBeenCalled();
  });
});
