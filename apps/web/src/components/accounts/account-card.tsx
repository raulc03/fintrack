"use client";

import Link from "next/link";
import type { Account } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {account.name}
          </CardTitle>
          <Badge variant="outline">{account.currency}</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(account.currentBalance, account.currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Initial: {formatCurrency(account.initialBalance, account.currency)}
          </p>
        </CardContent>
        <div
          className="h-1 rounded-b-lg"
          style={{ backgroundColor: account.color }}
        />
      </Card>
    </Link>
  );
}
