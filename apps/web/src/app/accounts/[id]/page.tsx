"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import { useAccount } from "@/hooks/use-accounts";
import { useAccountMovements } from "@/hooks/use-movements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountMovementsTable } from "@/components/accounts/account-movements-table";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { toast } from "sonner";
import { grid } from "@/lib/responsive";

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { account, loading: accountLoading, update } = useAccount(id);
  const { movements, loading: movementsLoading } = useAccountMovements(id);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  if (accountLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    );
  }

  const balanceChange = account.currentBalance - account.initialBalance;
  const balanceChangePercent =
    account.initialBalance > 0
      ? ((balanceChange / account.initialBalance) * 100).toFixed(1)
      : "0";

  const handleEditStart = () => {
    setEditValue(account.initialBalance.toString());
    setEditing(true);
  };

  const handleEditSave = async () => {
    const newBalance = parseFloat(editValue);
    if (isNaN(newBalance) || newBalance < 0) return;
    await update({ initialBalance: newBalance });
    setEditing(false);
    toast.success("Initial balance updated");
  };

  const handleEditCancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEditSave();
    if (e.key === "Escape") handleEditCancel();
  };

  return (
    <>
      <header className="flex items-center gap-3 h-14 px-4 md:px-6 border-b border-border">
        <Link
          href="/accounts"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">{account.name}</h1>
        <Badge variant="outline">{account.currency}</Badge>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        <div className={grid.stats}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(account.currentBalance, account.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Created {format(new Date(account.createdAt), "MMM dd, yyyy")}
              </p>
            </CardContent>
            <div
              className="h-1 rounded-b-lg"
              style={{ backgroundColor: account.color }}
            />
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Initial Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="text-lg h-9"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditSave}
                  >
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditCancel}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div
                  className="group flex items-center gap-2 cursor-pointer"
                  onClick={handleEditStart}
                >
                  <span className="text-2xl font-bold">
                    {formatCurrency(account.initialBalance, account.currency)}
                  </span>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Updated {format(new Date(account.updatedAt), "MMM dd, yyyy")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${balanceChange >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {balanceChange >= 0 ? "+" : ""}
                {formatCurrency(balanceChange, account.currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                {balanceChange >= 0 ? "+" : ""}
                {balanceChangePercent}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Movements</CardTitle>
          </CardHeader>
          <CardContent>
            {movementsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <AccountMovementsTable movements={movements} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
