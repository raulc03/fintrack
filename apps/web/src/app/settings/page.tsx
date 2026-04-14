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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { formatTimezoneLabel, getBrowserTimezone, getSupportedTimezones } from "@/lib/timezones";
import type { Currency } from "@finance/types";

export default function SettingsPage() {
  const { settings, loading, update } = useSettings();
  const [mainCurrency, setMainCurrency] = useState<Currency>("PEN");
  const [rate, setRate] = useState("");
  const browserTimezone = getBrowserTimezone();
  const [timezone, setTimezone] = useState(browserTimezone);
  const [saving, setSaving] = useState(false);
  const timezones = getSupportedTimezones();
  const preferredTimezones = Array.from(new Set([
    browserTimezone,
    settings.timezone,
    "America/Lima",
    "America/Bogota",
    "America/Santiago",
    "America/Buenos_Aires",
    "America/Sao_Paulo",
    "America/Mexico_City",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/Madrid",
    "UTC",
  ].filter(Boolean)));

  useEffect(() => {
    if (!loading) {
      setMainCurrency(settings.mainCurrency);
      setRate(String(settings.usdToPenRate));
      setTimezone(settings.timezone);
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
      await update({ mainCurrency, usdToPenRate: parsedRate, timezone });
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

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="settings-timezone" className="text-sm font-medium">Timezone</label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setTimezone(getBrowserTimezone())}>
                    Use my current timezone
                  </Button>
                </div>
                <Select value={timezone} onValueChange={(value) => value && setTimezone(value)}>
                  <SelectTrigger id="settings-timezone" className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectGroup>
                      <SelectLabel>Common</SelectLabel>
                      {preferredTimezones.map((zone) => (
                        <SelectItem key={zone} value={zone}>{formatTimezoneLabel(zone)}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>All Timezones</SelectLabel>
                      {timezones.filter((zone) => !preferredTimezones.includes(zone)).map((zone) => (
                        <SelectItem key={zone} value={zone}>{formatTimezoneLabel(zone)}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used for movement dates, current month calculations, and monthly histories. Cloudflare does not decide this; your saved timezone does.
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
