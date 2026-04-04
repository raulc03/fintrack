"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { financeService } from "@finance/services";
import type { Obligation, CreateObligationInput, UpdateObligationInput, ObligationSummary, ObligationHistoryMonth, Movement } from "@finance/types";

const HISTORY_PAGE_SIZE = 6;

export function useObligations() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [summaries, setSummaries] = useState<ObligationSummary[]>([]);
  const [history, setHistory] = useState<ObligationHistoryMonth[]>([]);
  const [historyMonths, setHistoryMonths] = useState(HISTORY_PAGE_SIZE);
  const [availableMovements, setAvailableMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);

  const fetch = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true);
    } else {
      setLoadingMoreHistory(true);
    }
    try {
      const [obData, sumData, movData, historyData] = await Promise.all([
        financeService.obligations.getAll(),
        financeService.obligations.getSummary(),
        financeService.obligations.getAvailableMovements(),
        financeService.obligations.getHistory(historyMonths),
      ]);
      setObligations(obData);
      setSummaries(sumData);
      setAvailableMovements(movData);
      setHistory(historyData);
      setError(null);
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e as Error);
    } finally {
      if (!hasLoadedRef.current) {
        setLoading(false);
      } else {
        setLoading(false);
      }
      setLoadingMoreHistory(false);
    }
  }, [historyMonths]);

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

  const loadMoreHistory = () => {
    setHistoryMonths((current) => current + HISTORY_PAGE_SIZE);
  };

  const canLoadMoreHistory = history.length === historyMonths;

  return {
    obligations,
    summaries,
    history,
    availableMovements,
    loading,
    loadingMoreHistory,
    error,
    canLoadMoreHistory,
    loadMoreHistory,
    refetch: fetch,
    create,
    update,
    remove,
    link,
  };
}
