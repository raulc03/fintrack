import { renderHook, waitFor } from "@testing-library/react";
import type { Movement } from "@finance/types";

const mockMovements: Movement[] = [
  { id: "m1", type: "expense", amount: 50, currency: "USD", description: "Food", date: "2026-03-15T00:00:00Z", accountId: "acc-1", categoryId: "cat-1", createdAt: "", updatedAt: "" },
];

const mockGetAll = vi.hoisted(() => vi.fn());

vi.mock("@finance/services", () => ({
  financeService: {
    movements: {
      getAll: mockGetAll,
      create: vi.fn(),
      delete: vi.fn(),
      getByAccount: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { useMovements } from "./use-movements";

describe("useMovements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockResolvedValue({
      data: mockMovements,
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("fetches movements on mount", async () => {
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.movements).toEqual(mockMovements);
    expect(result.current.total).toBe(1);
  });

  it("passes filters to service", async () => {
    const filters = { type: "income" as const };
    renderHook(() => useMovements(filters));
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledWith(filters, 1, 20));
  });

  it("exposes pagination data", async () => {
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });
});
