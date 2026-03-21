"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { Goal, CreateGoalInput, GoalAllocation } from "@finance/types";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financeService.goals.getAll();
      setGoals(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (input: CreateGoalInput) => {
    const created = await financeService.goals.create(input);
    setGoals((prev) => [...prev, created]);
    return created;
  };

  const update = async (id: string, input: Partial<CreateGoalInput>) => {
    const updated = await financeService.goals.update(id, input);
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    return updated;
  };

  const remove = async (id: string) => {
    await financeService.goals.delete(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const allocate = async (
    goalId: string,
    amount: number,
    movementId: string
  ) => {
    const allocation = await financeService.goals.allocate(
      goalId,
      amount,
      movementId
    );
    await fetch();
    return allocation;
  };

  return { goals, loading, error, refetch: fetch, create, update, remove, allocate };
}

export function useGoal(id: string) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [allocations, setAllocations] = useState<GoalAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      financeService.goals.getById(id),
      financeService.goals.getAllocations(id),
    ])
      .then(([goalData, allocData]) => {
        setGoal(goalData);
        setAllocations(allocData);
        setError(null);
      })
      .catch((e) => setError(e as Error))
      .finally(() => setLoading(false));
  }, [id]);

  return { goal, allocations, loading, error };
}
