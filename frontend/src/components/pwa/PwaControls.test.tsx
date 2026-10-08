import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { PwaControls, PwaInstallButton } from "./PwaControls";
import { usePwaInstallStore } from "@/stores/usePwaInstallStore";

function renderPwaControls() {
  return render(
    <>
      <PwaInstallButton />
      <PwaControls />
    </>,
  );
}

beforeEach(() => {
  usePwaInstallStore.setState({ installed: true, open: false });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Chrome",
  });
  Object.defineProperty(navigator, "standalone", {
    configurable: true,
    value: false,
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

test("provides usable manual guidance when a native installation event is absent", () => {
  renderPwaControls();
  fireEvent.click(screen.getByRole("button", { name: "نصب کارمچ" }));
  expect(
    within(screen.getByRole("dialog")).getByText(/در منوی مرورگر/),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "نصب روی دستگاه" }),
  ).not.toBeInTheDocument();
});

test("shows Safari home-screen steps to iPhone users", () => {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "iPhone",
  });
  renderPwaControls();
  fireEvent.click(screen.getByRole("button", { name: "نصب کارمچ" }));
  expect(screen.getByText(/این سایت را در Safari/)).toBeVisible();
  expect(screen.getByText(/Add to Home Screen/)).toBeVisible();
});

test("hides installation in an installed window", () => {
  Object.defineProperty(navigator, "standalone", {
    configurable: true,
    value: true,
  });
  renderPwaControls();
  expect(
    screen.queryByRole("button", { name: "نصب کارمچ" }),
  ).not.toBeInTheDocument();
});

test.each(["dismissed", "failure"])(
  "handles native install %s without replaying a consumed event",
  async (outcome) => {
    renderPwaControls();
    const event = new Event("beforeinstallprompt", { cancelable: true });
    const prompt = jest.fn(
      outcome === "failure"
        ? () => Promise.reject(new Error("blocked"))
        : () => Promise.resolve(),
    );
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    act(() => window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "نصب کارمچ" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "نصب روی دستگاه" }));
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      outcome === "failure" ? "پنجره نصب باز نشد" : "نصب انجام نشد",
    );
    expect(
      screen.queryByRole("button", { name: "نصب روی دستگاه" }),
    ).not.toBeInTheDocument();
  },
);

test("reports lost connectivity and removes the notice on reconnect", () => {
  renderPwaControls();
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByRole("status")).toHaveTextContent("اتصال اینترنت قطع است");
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  act(() => window.dispatchEvent(new Event("online")));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
