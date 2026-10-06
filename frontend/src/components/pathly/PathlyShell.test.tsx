import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { PathlyShell } from "./PathlyShell";
const mockReplace = jest.fn();
let mockAuthenticated = true;
const mockLogout = jest.fn(() => {
  mockAuthenticated = false;
});
jest.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("@/lib/use-auth-ready", () => ({ useAuthReady: () => true }));
jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: Object.assign(
    () => ({
      user: { id: "owner", firstName: "کاربر" },
      isAuthenticated: mockAuthenticated,
      isProfileComplete: false,
      logout: mockLogout,
    }),
    { setState: jest.fn() },
  ),
}));
jest.mock("@/stores/useThemeStore", () => ({
  useThemeStore: () => ({
    theme: "dark",
    initialize: jest.fn(),
    toggle: jest.fn(),
  }),
}));
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { isProfileComplete: false } })),
  },
}));
describe("Workspace routing", () => {
  beforeEach(() => {
    mockAuthenticated = true;
    jest.clearAllMocks();
  });
  it("keeps incomplete profiles in the workspace", () => {
    render(
      <PathlyShell>
        <p>Workspace</p>
      </PathlyShell>,
    );
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: "شروع گفتگو" }),
    ).not.toBeInTheDocument();
  });
  it("preserves the logout destination when auth changes on a private page", () => {
    const view = render(
      <PathlyShell>
        <p>Workspace</p>
      </PathlyShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "خروج از حساب" }));
    view.rerender(
      <PathlyShell>
        <p>Workspace</p>
      </PathlyShell>,
    );
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockReplace.mock.calls).toEqual([["/"]]);
  });
  it("redirects ordinary anonymous private-page visits to login", () => {
    mockAuthenticated = false;
    render(
      <PathlyShell>
        <p>Workspace</p>
      </PathlyShell>,
    );
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
