import { renderHook, waitFor, act } from "@testing-library/react";
import type { Account } from "@finance/types";

const mockAccounts: Account[] = [
  { id: "1", name: "Checking", currency: "USD", initialBalance: 1000, currentBalance: 1200, color: "#3b82f6", createdAt: "", updatedAt: "" },
  { id: "2", name: "Savings", currency: "USD", initialBalance: 5000, currentBalance: 5000, color: "#10b981", createdAt: "", updatedAt: "" },
];

const mockService = vi.hoisted(() => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@finance/services", () => ({
  financeService: {
    accounts: mockService,
  },
}));

import { useAccounts } from "./use-accounts";

describe("useAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.getAll.mockResolvedValue([...mockAccounts]);
  });

  it("fetches accounts on mount", async () => {
    const { result } = renderHook(() => useAccounts());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts).toEqual(mockAccounts);
  });

  it("create appends to state", async () => {
    const newAccount: Account = { id: "3", name: "New", currency: "PEN", initialBalance: 0, currentBalance: 0, color: "#f00", createdAt: "", updatedAt: "" };
    mockService.create.mockResolvedValue(newAccount);

    const { result } = renderHook(() => useAccounts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: "New", currency: "PEN", initialBalance: 0 });
    });

    expect(result.current.accounts).toHaveLength(3);
  });

  it("remove filters from state", async () => {
    mockService.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccounts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("1");
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe("2");
  });
});
