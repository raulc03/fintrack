import { render, screen } from "@testing-library/react";
import type { Obligation, ObligationSummary } from "@finance/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ObligationsSummary } from "./obligations-summary";

const mockObligations: Obligation[] = [
  { id: "ob1", name: "Rent", categoryId: "cat-1", estimatedAmount: 1200, currency: "USD", dueDay: 1, isPaid: true, manuallyPaid: false, linkedMovementId: "mov-1", isActive: true, createdAt: "", updatedAt: "" },
  { id: "ob2", name: "Netflix", categoryId: "cat-2", estimatedAmount: 15, currency: "USD", dueDay: 25, isPaid: false, manuallyPaid: false, isActive: true, createdAt: "", updatedAt: "" },
];

const mockSummaries: ObligationSummary[] = [
  { currency: "USD", totalObligations: 1215, paidAmount: 1200, pendingAmount: 15, coveragePercent: 98.8, currentBalance: 5000, freeAfterObligations: 4985 },
];

describe("ObligationsSummary", () => {
  it("renders nothing when no obligations", () => {
    const { container } = render(<ObligationsSummary obligations={[]} summaries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders coverage percentage", () => {
    render(<ObligationsSummary obligations={mockObligations} summaries={mockSummaries} />);
    expect(screen.getByText("99% covered")).toBeInTheDocument();
  });

  it("renders obligation names", () => {
    render(<ObligationsSummary obligations={mockObligations} summaries={mockSummaries} />);
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
  });

  it("shows Paid status for paid obligations", () => {
    render(<ObligationsSummary obligations={mockObligations} summaries={mockSummaries} />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("shows due date for pending obligations", () => {
    render(<ObligationsSummary obligations={mockObligations} summaries={mockSummaries} />);
    expect(screen.getByText("Due 25th")).toBeInTheDocument();
  });

  it("shows free after obligations amount", () => {
    render(<ObligationsSummary obligations={mockObligations} summaries={mockSummaries} />);
    expect(screen.getByText(/free after pending/)).toBeInTheDocument();
  });
});
