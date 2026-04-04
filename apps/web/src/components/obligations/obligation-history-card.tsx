"use client";

import { useState } from "react";
import type { ObligationHistoryMonth } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

const VISIBLE_ITEMS = 3;
const VISIBLE_MONTHS = 6;

interface ObligationHistoryCardProps {
  history: ObligationHistoryMonth[];
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function ObligationHistoryCard({ history, canLoadMore, loadingMore, onLoadMore }: ObligationHistoryCardProps) {
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [showAllMonths, setShowAllMonths] = useState(false);

  if (history.length === 0) return null;

  const toggleMonth = (month: string) => {
    setExpandedMonths((current) => ({ ...current, [month]: !current[month] }));
  };

  const visibleMonths = showAllMonths ? history : history.slice(0, VISIBLE_MONTHS);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Payment History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {visibleMonths.map((month) => (
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
              {(expandedMonths[month.month] ? month.items : month.items.slice(0, VISIBLE_ITEMS)).map((item) => (
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
              {month.items.length > VISIBLE_ITEMS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-xl text-xs text-muted-foreground"
                  onClick={() => toggleMonth(month.month)}
                >
                  {expandedMonths[month.month]
                    ? `Show fewer obligations`
                    : `Show ${month.items.length - VISIBLE_ITEMS} more obligations`}
                </Button>
              )}
            </div>
          </section>
        ))}
        {canLoadMore ? (
          <Button type="button" variant="outline" className="w-full" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more months"}
          </Button>
        ) : history.length > VISIBLE_MONTHS ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setShowAllMonths((current) => !current)}
          >
            {showAllMonths ? "Show less" : "Show all loaded months"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
