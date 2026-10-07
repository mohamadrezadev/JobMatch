import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./Button";
import { LoadingState, PageLoading } from "./LoadingState";

describe("Loading feedback", () => {
  afterEach(() => jest.useRealTimers());
  it("announces the actual operation and explains a slow response without fabricated progress", () => {
    jest.useFakeTimers();
    const { rerender, unmount } = render(
      <LoadingState
        title="در حال دریافت فرصت‌ها…"
        description="دریافت آگهی‌ها"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("دریافت آگهی‌ها");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByRole("status")).toHaveTextContent("پاسخ هنوز نرسیده");
    rerender(
      <LoadingState title="در حال ذخیره رزومه…" description="ثبت تغییرات" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("ثبت تغییرات");
    expect(screen.queryByText(/پاسخ هنوز نرسیده/)).not.toBeInTheDocument();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
  it("keeps visual placeholders hidden from assistive technology", () => {
    const { container } = render(
      <PageLoading title="دریافت پروفایل" layout="form" />,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("prevents repeated submission only while the button is busy", () => {
    const onClick = jest.fn();
    const { rerender } = render(
      <Button loading onClick={onClick}>
        در حال ذخیره…
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button onClick={onClick}>ذخیره</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
