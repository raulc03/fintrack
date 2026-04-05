"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { Goal, CreateGoalInput, GoalAllocation, GoalHistory, Movement } from "@finance/types";

const HISTORY_MONTHS = 24;

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenseLimitHistory, setExpenseLimitHistory] = useState<GoalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [data, history] = await Promise.all([
        financeService.goals.getAll(),
        financeService.goals.getExpenseLimitHistory(HISTORY_MONTHS),
      ]);
      setGoals(data);
      setExpenseLimitHistory(history);
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
    await fetch();
    return created;
  };

  const update = async (id: string, input: Partial<CreateGoalInput>) => {
    const updated = await financeService.goals.update(id, input);
    await fetch();
    return updated;
  };

  const remove = async (id: string) => {
    await financeService.goals.delete(id);
    await fetch();
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

  return {
    goals,
    expenseLimitHistory,
    loading,
    error,
    refetch: fetch,
    create,
    update,
    remove,
    allocate,
  };
}

export function useGoal(id: string) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [allocations, setAllocations] = useState<GoalAllocation[]>([]);
  const [relatedMovements, setRelatedMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    financeService.goals.getById(id)
      .then(async (goalData) => {
        const allocationPromise = financeService.goals.getAllocations(id);

        if (goalData.type !== "expense_limit" || !goalData.categoryId) {
          const allocData = await allocationPromise;
          setGoal(goalData);
          setAllocations(allocData);
          setRelatedMovements([]);
          setError(null);
          return;
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const [allocData, movementData] = await Promise.all([
          allocationPromise,
          financeService.movements.getAll(
            {
              type: "expense",
              categoryId: goalData.categoryId,
              currency: goalData.currency,
              dateFrom: monthStart.toISOString(),
              dateTo: monthEnd.toISOString(),
            },
            1,
            100,
          ),
        ]);

        setGoal(goalData);
        setAllocations(allocData);
        setRelatedMovements(movementData.data);
        setError(null);
      })
      .catch((e) => setError(e as Error))
      .finally(() => setLoading(false));
  }, [id]);

   return { goal, allocations, relatedMovements, loading, error };
}
