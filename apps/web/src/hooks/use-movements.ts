"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { Movement, CreateMovementInput, MovementFilters } from "@finance/types";
import type { PaginatedResponse } from "@finance/services";

export function useMovements(filters?: MovementFilters) {
  const [data, setData] = useState<PaginatedResponse<Movement>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(
    async (page = 1, pageSize = 20) => {
      setLoading(true);
      try {
        const result = await financeService.movements.getAll(
          filters,
          page,
          pageSize
        );
        setData(result);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (input: CreateMovementInput) => {
    const created = await financeService.movements.create(input);
    await fetch();
    return created;
  };

  const remove = async (id: string) => {
    await financeService.movements.delete(id);
    await fetch();
  };

  return {
    movements: data.data,
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    loading,
    error,
    refetch: fetch,
    create,
    remove,
  };
}

export function useAccountMovements(accountId: string) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financeService.movements.getByAccount(accountId);
      setMovements(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { movements, loading, refetch: fetch };
}
