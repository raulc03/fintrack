"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { Obligation, CreateObligationInput, UpdateObligationInput, ObligationSummary } from "@finance/types";

export function useObligations() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [summaries, setSummaries] = useState<ObligationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [obData, sumData] = await Promise.all([
        financeService.obligations.getAll(),
        financeService.obligations.getSummary(),
      ]);
      setObligations(obData);
      setSummaries(sumData);
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

  const togglePaid = async (id: string, paid: boolean) => {
    const updated = await financeService.obligations.togglePaid(id, paid);
    await fetch();
    return updated;
  };

  return { obligations, summaries, loading, error, refetch: fetch, create, update, remove, link, togglePaid };
}
