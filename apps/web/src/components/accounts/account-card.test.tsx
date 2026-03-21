import { render, screen } from "@testing-library/react";
import type { Account } from "@finance/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AccountCard } from "./account-card";

const mockAccount: Account = {
  id: "acc-1",
  name: "Main Checking",
  currency: "USD",
  initialBalance: 5000,
  currentBalance: 4250.5,
  color: "#3b82f6",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-03-15T00:00:00Z",
};

describe("AccountCard", () => {
  it("renders account name", () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText("Main Checking")).toBeInTheDocument();
  });

  it("renders currency badge", () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders formatted current balance", () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText("$ 4,250.50")).toBeInTheDocument();
  });

  it("links to account detail page", () => {
    render(<AccountCard account={mockAccount} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/accounts/acc-1");
  });
});
