"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { Category, CategoryType, CreateCategoryInput } from "@finance/types";

export function useCategories(type?: CategoryType) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financeService.categories.getAll(type);
      setCategories(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (input: CreateCategoryInput) => {
    const created = await financeService.categories.create(input);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const update = async (id: string, input: Partial<CreateCategoryInput>) => {
    const updated = await financeService.categories.update(id, input);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const remove = async (id: string) => {
    await financeService.categories.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return { categories, loading, error, refetch: fetch, create, update, remove };
}
