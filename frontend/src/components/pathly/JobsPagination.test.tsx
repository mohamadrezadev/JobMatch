import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { JobsPagination } from "./JobsPagination";

describe("Opportunity pagination", () => {
  it("provides bounded page shortcuts and identifies the current page", () => {
    const onPage = jest.fn();
    render(
      <JobsPagination page={8} pages={20} loading={false} onPage={onPage} />,
    );
    expect(screen.getByRole("button", { name: "صفحه ۸" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("button", { name: "صفحه ۳" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "صفحه ۲۰" }));
    expect(onPage).toHaveBeenCalledWith(20);
  });
  it("disables boundary controls and all navigation while loading", () => {
    const { rerender } = render(
      <JobsPagination page={1} pages={2} loading={false} onPage={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "صفحه قبل" })).toBeDisabled();
    rerender(
      <JobsPagination page={2} pages={2} loading={false} onPage={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "صفحه بعد" })).toBeDisabled();
    rerender(<JobsPagination page={2} pages={2} loading onPage={jest.fn()} />);
    screen
      .getAllByRole("button")
      .forEach((button) => expect(button).toBeDisabled());
    rerender(
      <JobsPagination page={1} pages={1} loading={false} onPage={jest.fn()} />,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
