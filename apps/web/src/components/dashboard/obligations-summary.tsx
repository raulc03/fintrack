"use client";

import Link from "next/link";
import type { Currency, Obligation, ObligationSummary } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { ordinalSuffix } from "@/lib/format";
import { getCoverageColorClass, getCoverageProgressClass } from "@/lib/constants";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

interface ObligationsSummaryProps {
  obligations: Obligation[];
  summaries: ObligationSummary[];
}

export function ObligationsSummary({ obligations, summaries }: ObligationsSummaryProps) {
  if (obligations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Monthly Obligations</CardTitle>
        <Link
          href="/obligations"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {summaries.map((s) => {
            return (
              <div key={s.currency} className="py-3 first:pt-0 last:pb-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.currency} Obligations</span>
                  <span className={`text-xs font-medium ${getCoverageColorClass(s.coveragePercent)}`}>
                    {s.coveragePercent.toFixed(0)}% covered
                  </span>
                </div>
                <Progress
                  value={s.coveragePercent}
                  className={getCoverageProgressClass(s.coveragePercent)}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatCurrency(s.paidAmount, s.currency as Currency)} paid
                  </span>
                  <span>
                    {formatCurrency(s.totalObligations, s.currency as Currency)} total
                  </span>
                </div>
                {s.freeAfterObligations < 0 && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Need {formatCurrency(Math.abs(s.freeAfterObligations), s.currency as Currency)} more to cover all bills
                  </p>
                )}
                {s.freeAfterObligations >= 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(s.freeAfterObligations, s.currency as Currency)} free after pending bills
                  </p>
                )}
              </div>
            );
          })}

          {/* Individual obligations */}
          <div className="pt-3 space-y-2">
            {obligations.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {o.isPaid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={o.isPaid ? "text-muted-foreground" : ""}>{o.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {o.isPaid ? "Paid" : `Due ${o.dueDay}${ordinalSuffix(o.dueDay)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


