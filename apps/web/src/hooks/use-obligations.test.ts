import { renderHook, waitFor, act } from "@testing-library/react";
import type { Obligation, ObligationHistoryMonth, ObligationSummary } from "@finance/types";

const mockObligations: Obligation[] = [
  { id: "ob1", name: "Rent", categoryId: "cat-1", estimatedAmount: 1200, currency: "USD", dueDay: 1, isPaid: true, linkedMovementId: "mov-1", linkedMovementAmount: 1200, isActive: true, createdAt: "", updatedAt: "" },
  { id: "ob2", name: "Netflix", categoryId: "cat-2", estimatedAmount: 15, currency: "USD", dueDay: 25, isPaid: false, isActive: true, createdAt: "", updatedAt: "" },
];

const mockSummaries: ObligationSummary[] = [
  { currency: "USD", totalObligations: 1215, paidAmount: 1200, pendingAmount: 15, coveragePercent: 98.8, currentBalance: 5000, freeAfterObligations: 4985 },
];

const mockHistory: ObligationHistoryMonth[] = [
  {
    month: "2026-04",
    monthLabel: "Apr 2026",
    totalDue: 1215,
    totalPaid: 1200,
    items: [
      { obligationId: "ob1", name: "Rent", currency: "USD", dueAmount: 1200, paidAmount: 1200, isPaid: true },
      { obligationId: "ob2", name: "Netflix", currency: "USD", dueAmount: 15, paidAmount: 0, isPaid: false },
    ],
  },
];

const mockService = vi.hoisted(() => ({
  getAll: vi.fn(),
  getSummary: vi.fn(),
  getHistory: vi.fn(),
  getAvailableMovements: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  link: vi.fn(),
}));

vi.mock("@finance/services", () => ({
  financeService: {
    obligations: mockService,
  },
}));

import { useObligations } from "./use-obligations";

describe("useObligations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.getAll.mockResolvedValue([...mockObligations]);
    mockService.getSummary.mockResolvedValue([...mockSummaries]);
    mockService.getHistory.mockResolvedValue([...mockHistory]);
    mockService.getAvailableMovements.mockResolvedValue([]);
  });

  it("fetches obligations and summaries on mount", async () => {
    const { result } = renderHook(() => useObligations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.obligations).toEqual(mockObligations);
    expect(result.current.summaries).toEqual(mockSummaries);
    expect(result.current.history).toEqual(mockHistory);
  });

  it("create calls service and refetches", async () => {
    const newOb: Obligation = { id: "ob3", name: "Insurance", categoryId: "cat-3", estimatedAmount: 400, currency: "USD", dueDay: 28, isPaid: false, isActive: true, createdAt: "", updatedAt: "" };
    mockService.create.mockResolvedValue(newOb);

    const { result } = renderHook(() => useObligations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: "Insurance", categoryId: "cat-3", estimatedAmount: 400, currency: "USD", dueDay: 28 });
    });

    expect(mockService.create).toHaveBeenCalledTimes(1);
    expect(mockService.getAll).toHaveBeenCalledTimes(2);
  });

  it("remove calls service and refetches", async () => {
    mockService.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useObligations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("ob2");
    });

    expect(mockService.delete).toHaveBeenCalledWith("ob2");
    expect(mockService.getAll).toHaveBeenCalledTimes(2);
  });
});
