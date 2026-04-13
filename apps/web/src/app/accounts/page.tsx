"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountCardCreate } from "@/components/accounts/account-card-create";
import { useAccounts } from "@/hooks/use-accounts";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { grid } from "@/lib/responsive";

export default function AccountsPage() {
  const { accounts, loading, create } = useAccounts();
  const [creating, setCreating] = useState(false);

  const handleCreate = async (data: Parameters<typeof create>[0]) => {
    try {
      await create(data);
      setCreating(false);
      toast.success("Account created");
    } catch {
      toast.error("Failed to create account");
    }
  };

  return (
    <>
      <Header
        title="Accounts"
        onAddClick={() => setCreating(true)}
        addLabel="New Account"
      />
      <div className="p-4 md:p-6">
        {loading ? (
          <div className={grid.cards}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[140px] rounded-lg" />
            ))}
          </div>
        ) : accounts.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No accounts yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create your first account to start tracking your finances.
            </p>
          </div>
        ) : (
          <div className={grid.cards}>
            {creating && (
              <AccountCardCreate
                onSave={handleCreate}
                onCancel={() => setCreating(false)}
              />
            )}
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
