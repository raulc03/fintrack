"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { Obligation, CreateObligationInput, UpdateObligationInput, ObligationSummary, ObligationHistoryMonth, Movement } from "@finance/types";

export function useObligations() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [summaries, setSummaries] = useState<ObligationSummary[]>([]);
  const [history, setHistory] = useState<ObligationHistoryMonth[]>([]);
  const [availableMovements, setAvailableMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [obData, sumData, movData, historyData] = await Promise.all([
        financeService.obligations.getAll(),
        financeService.obligations.getSummary(),
        financeService.obligations.getAvailableMovements(),
        financeService.obligations.getHistory(),
      ]);
      setObligations(obData);
      setSummaries(sumData);
      setAvailableMovements(movData);
      setHistory(historyData);
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

  const create = async (input: CreateObligationInput) => {
    const created = await financeService.obligations.create(input);
    await fetch();
    return created;
  };

  const update = async (id: string, input: UpdateObligationInput) => {
    const updated = await financeService.obligations.update(id, input);
    await fetch();
    return updated;
  };

  const remove = async (id: string) => {
    await financeService.obligations.delete(id);
    await fetch();
  };

  const link = async (id: string, movementId: string | null) => {
    const updated = await financeService.obligations.link(id, movementId);
    await fetch();
    return updated;
  };

  return { obligations, summaries, history, availableMovements, loading, error, refetch: fetch, create, update, remove, link };
}
