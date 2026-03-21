"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { Account, CreateAccountInput, UpdateAccountInput } from "@finance/types";

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financeService.accounts.getAll();
      setAccounts(data);
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

  const create = async (input: CreateAccountInput) => {
    const created = await financeService.accounts.create(input);
    setAccounts((prev) => [...prev, created]);
    return created;
  };

  const update = async (id: string, input: UpdateAccountInput) => {
    const updated = await financeService.accounts.update(id, input);
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  };

  const remove = async (id: string) => {
    await financeService.accounts.delete(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return { accounts, loading, error, refetch: fetch, create, update, remove };
}

export function useAccount(id: string) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    financeService.accounts
      .getById(id)
      .then((data) => {
        setAccount(data);
        setError(null);
      })
      .catch((e) => setError(e as Error))
      .finally(() => setLoading(false));
  }, [id]);

  const update = async (input: UpdateAccountInput) => {
    const updated = await financeService.accounts.update(id, input);
    setAccount(updated);
    return updated;
  };

  return { account, loading, error, update };
}
