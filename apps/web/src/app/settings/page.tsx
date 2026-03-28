"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import type { Currency } from "@finance/types";

export default function SettingsPage() {
  const { settings, loading, update } = useSettings();
  const [mainCurrency, setMainCurrency] = useState<Currency>("PEN");
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setMainCurrency(settings.mainCurrency);
      setRate(String(settings.usdToPenRate));
    }
  }, [loading, settings]);

  const handleSave = async () => {
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      toast.error("Exchange rate must be a positive number");
      return;
    }
    setSaving(true);
    try {
      await update({ mainCurrency, usdToPenRate: parsedRate });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Settings" />
      <div className="p-4 md:p-6 space-y-6 max-w-lg">
        {loading ? (
          <Skeleton className="h-[200px]" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Currency & Exchange Rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="settings-currency" className="text-sm font-medium">Main Currency</label>
                <Select value={mainCurrency} onValueChange={(v) => v && setMainCurrency(v as Currency)}>
                  <SelectTrigger id="settings-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Total balance will be displayed in this currency.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-rate" className="text-sm font-medium">USD to PEN Rate</label>
                <AmountInput
                  id="settings-rate"
                  value={rate}
                  onChange={setRate}
                  placeholder="3.70&#8230;"
                />
                <p className="text-xs text-muted-foreground">
                  1 USD = {rate || "?"} PEN
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving\u2026" : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
