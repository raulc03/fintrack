"use client";

import type { ObligationHistoryMonth } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";

interface ObligationHistoryCardProps {
  history: ObligationHistoryMonth[];
}

export function ObligationHistoryCard({ history }: ObligationHistoryCardProps) {
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Payment History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {history.map((month) => (
          <section key={month.month} className="space-y-3 border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{month.monthLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {month.items.filter((item) => item.isPaid).length} of {month.items.length} obligations paid
                </p>
              </div>
              <Badge variant="outline">{month.items.length} items</Badge>
            </div>
            <div className="space-y-2">
              {month.items.map((item) => (
                <div key={`${month.month}-${item.obligationId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.paidAmount, item.currency)} of {formatCurrency(item.dueAmount, item.currency)}
                    </p>
                  </div>
                  <Badge variant={item.isPaid ? "default" : "outline"}>
                    {item.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
