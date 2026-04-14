"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  MovementType,
  Account,
  Category,
  Obligation,
  CreateMovementInput,
} from "@finance/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, MicOff, Keyboard, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSettings } from "@/hooks/use-settings";
import { filterCategoriesByType, resolveMovementCategoryId } from "@/lib/constants";
import { parseVoiceInput, type ParsedMovement } from "@/lib/voice-parser";
import { formatCurrency } from "@/lib/currency";
import { getTodayInTimeZone } from "@/lib/date";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  obligations?: Obligation[];
  onSubmit: (data: CreateMovementInput & { obligationId?: string }) => Promise<unknown>;
}

export function QuickAddSheet({
  open,
  onOpenChange,
  accounts,
  categories,
  obligations = [],
  onSubmit,
}: QuickAddSheetProps) {
  const { settings } = useSettings();
  const [mode, setMode] = useState<"manual" | "voice">("manual");
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getTodayInTimeZone(settings.timezone));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [obligationId, setObligationId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsed, setParsed] = useState<ParsedMovement | null>(null);

  const speech = useSpeechRecognition();
  const filteredCategories = filterCategoriesByType(categories, type);
  const resolvedCategoryId = resolveMovementCategoryId(categories, type, categoryId);
  const unpaidObligations = obligations.filter((o) => !o.isPaid);
  const defaultAccountId = accounts[0]?.id ?? "";
  const speechReset = speech.reset;

  const sourceAccount = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId]);
  const destAccount = useMemo(() => accounts.find((a) => a.id === destinationAccountId), [accounts, destinationAccountId]);
  const isCrossCurrency = type === "transfer" && sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency;

  // Pre-fill exchange rate
  useEffect(() => {
    if (isCrossCurrency && !exchangeRate) {
      const rate = settings.usdToPenRate;
      if (sourceAccount?.currency === "USD") {
        setExchangeRate(String(rate));
      } else {
        setExchangeRate(String(Math.round((1 / rate) * 10000) / 10000));
      }
    }
    if (!isCrossCurrency) setExchangeRate("");
  }, [isCrossCurrency, sourceAccount?.currency, settings.usdToPenRate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setMode("manual");
      setType("expense");
      setAmount("");
      setDescription("");
      setDate(getTodayInTimeZone(settings.timezone));
      setAccountId(defaultAccountId);
      setDestinationAccountId("");
      setCategoryId("");
      setObligationId("");
      setExchangeRate("");
      setParsed(null);
      speechReset();
    }
  }, [open, defaultAccountId, settings.timezone, speechReset]);

  // Parse voice transcript
  const transcript = speech.transcript;
  const isListening = speech.isListening;
  useEffect(() => {
    if (transcript && !isListening) {
      const result = parseVoiceInput(transcript, categories);
      setParsed(result);
    }
  }, [transcript, isListening, categories]);

  const applyParsed = () => {
    if (!parsed) return;
    setType(parsed.type);
    if (parsed.amount !== null) setAmount(parsed.amount.toString());
    setDescription(parsed.description);
    if (parsed.categoryMatch) setCategoryId(parsed.categoryMatch);
    setParsed(null);
    setMode("manual");
  };

  const canSubmit =
    amount !== "" &&
    parseFloat(amount) > 0 &&
      description.trim() !== "" &&
      accountId !== "" &&
      (type === "transfer"
      ? resolvedCategoryId !== "" && destinationAccountId !== "" && (!isCrossCurrency || (exchangeRate !== "" && parseFloat(exchangeRate) > 0))
      : categoryId !== "");

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        date: `${date}T12:00:00`,
        accountId,
        destinationAccountId: type === "transfer" ? destinationAccountId : undefined,
        categoryId: resolvedCategoryId,
        obligationId: type === "expense" && obligationId ? obligationId : undefined,
        exchangeRate: isCrossCurrency ? parseFloat(exchangeRate) : undefined,
      });
      toast.success("Movement created");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create movement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[76vh] overflow-y-auto rounded-t-[28px] border-t border-border/60 p-0 sm:max-h-[82vh]"
        showCloseButton={false}
      >
        <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4">
            <div className="space-y-1">
              <SheetTitle>Quick Add</SheetTitle>
              <SheetDescription>
                Capture a movement fast without leaving the dashboard.
              </SheetDescription>
            </div>
            {speech.isSupported && (
              <div className="flex rounded-xl border border-border/60 bg-muted/30 p-1">
                <Button
                  variant={mode === "manual" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("manual")}
                  aria-label="Manual input"
                  className="h-9 rounded-lg px-3"
                >
                  <Keyboard className="mr-2 h-4 w-4" />
                  Manual
                </Button>
                <Button
                  variant={mode === "voice" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("voice")}
                  aria-label="Voice input"
                  className="h-9 rounded-lg px-3"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Voice
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
          {mode === "manual" ? (
            <div className="space-y-5">
              <Tabs value={type} onValueChange={(v) => { setType(v as MovementType); setCategoryId(""); setObligationId(""); }}>
                <TabsList className="h-11 w-full rounded-xl bg-muted/40 p-1">
                  <TabsTrigger value="expense" className="flex-1 rounded-lg">Expense</TabsTrigger>
                  <TabsTrigger value="income" className="flex-1 rounded-lg">Income</TabsTrigger>
                  <TabsTrigger value="transfer" className="flex-1 rounded-lg">Transfer</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
                <div className="space-y-5 rounded-2xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Movement details</p>
                    <p className="text-xs text-muted-foreground">
                      Set the essentials first, then choose where the money came from and where it belongs.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.9fr)]">
                    <div className="space-y-2">
                      <label htmlFor="quick-add-amount" className="text-sm font-medium">Amount</label>
                      <AmountInput
                        id="quick-add-amount"
                        placeholder="0.00"
                        value={amount}
                        onChange={setAmount}
                        className="h-11 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="quick-add-date" className="text-sm font-medium">Date</label>
                      <Input
                        id="quick-add-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-11 w-full [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="quick-add-description" className="text-sm font-medium">Description</label>
                    <Input
                      id="quick-add-description"
                      placeholder={type === "transfer" ? "What is this transfer for?" : "What was this for?"}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  {type === "transfer" ? (
                    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div>
                        <p className="text-sm font-medium">Transfer route</p>
                        <p className="text-xs text-muted-foreground">Pick the source and destination accounts.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="quick-add-account" className="text-sm font-medium">From</label>
                          <Select value={accountId} onValueChange={(v) => { if (v) { setAccountId(v); if (v === destinationAccountId) setDestinationAccountId(""); } }}>
                            <SelectTrigger id="quick-add-account" className="h-11 w-full">
                              <SelectValue placeholder="Select account">
                                {sourceAccount?.name ?? "Select account"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="quick-add-destination" className="text-sm font-medium">To</label>
                          <Select value={destinationAccountId} onValueChange={(v) => v && setDestinationAccountId(v)}>
                            <SelectTrigger id="quick-add-destination" className="h-11 w-full">
                              <SelectValue placeholder="Select destination">
                                {destAccount?.name ?? "Select destination"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.filter((a) => a.id !== accountId).map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="quick-add-account" className="text-sm font-medium">Account</label>
                        <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
                          <SelectTrigger id="quick-add-account" className="h-11 w-full">
                            <SelectValue placeholder="Select account">
                              {sourceAccount?.name ?? "Select account"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="quick-add-category" className="text-sm font-medium">Category</label>
                        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                          <SelectTrigger id="quick-add-category" className="h-11 w-full">
                            <SelectValue placeholder="Select category">
                              {filteredCategories.find((c) => c.id === categoryId)?.name ?? "Select category"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                                  {c.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Quick summary</p>
                      <p className="text-xs text-muted-foreground">
                        Review the selected type, account, and linked extras before saving.
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">{type}</Badge>
                      {sourceAccount && (
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">{sourceAccount.name}</Badge>
                      )}
                      {type !== "transfer" && categoryId && (
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                          {filteredCategories.find((c) => c.id === categoryId)?.name}
                        </Badge>
                      )}
                      {type === "transfer" && destAccount && (
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">To {destAccount.name}</Badge>
                      )}
                    </div>
                  </div>

                  {type === "expense" && unpaidObligations.length > 0 && (
                    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Link an obligation</p>
                        <p className="text-xs text-muted-foreground">Optional. Mark an unpaid bill with this movement.</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <label htmlFor="quick-add-obligation" className="text-sm font-medium">Obligation</label>
                        <Select
                          value={obligationId || "__none__"}
                          onValueChange={(v) => v && setObligationId(v === "__none__" ? "" : v)}
                        >
                          <SelectTrigger id="quick-add-obligation" className="h-11 w-full">
                            <SelectValue placeholder="No obligation">
                              {unpaidObligations.find((o) => o.id === obligationId)?.name ?? "No obligation"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {unpaidObligations.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.name} ({formatCurrency(o.estimatedAmount, o.currency)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {isCrossCurrency && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Exchange rate</p>
                        <p className="text-xs text-muted-foreground">Required when the transfer moves across different currencies.</p>
                      </div>
                      <div className="mt-4 space-y-3">
                        <AmountInput
                          value={exchangeRate}
                          onChange={setExchangeRate}
                          placeholder="e.g. 3.70"
                          className="h-11"
                        />
                        {amount && exchangeRate && parseFloat(exchangeRate) > 0 && (
                          <div className="rounded-lg bg-background/80 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/60">
                            {sourceAccount?.currency} {amount} x {exchangeRate} = {destAccount?.currency}{" "}
                            {(parseFloat(amount) * parseFloat(exchangeRate)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <VoiceInput
              speech={speech}
              parsed={parsed}
              categories={categories}
              onApply={applyParsed}
              onRetry={() => { setParsed(null); speech.reset(); }}
            />
          )}
        </div>
        {mode === "manual" && (
          <SheetFooter className="border-t border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground sm:self-center">
                {type === "transfer" ? "Transfers use the dedicated Transfer category automatically." : "Quick add saves the movement immediately."}
              </p>
              <div className="flex w-full gap-3 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 sm:flex-none"
                >
                  Close
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="flex-1 sm:min-w-[180px] sm:flex-none"
                >
                  {isSubmitting ? "Creating..." : "Create Movement"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function VoiceInput({
  speech,
  parsed,
  categories,
  onApply,
  onRetry,
}: {
  speech: ReturnType<typeof useSpeechRecognition>;
  parsed: ParsedMovement | null;
  categories: Category[];
  onApply: () => void;
  onRetry: () => void;
}) {
  const matchedCategory = parsed?.categoryMatch
    ? categories.find((c) => c.id === parsed.categoryMatch)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border border-border/60 bg-background px-4 py-6 shadow-sm sm:px-6">
      <button
        onClick={speech.isListening ? speech.stop : speech.start}
        aria-label={speech.isListening ? "Stop recording" : "Start recording"}
        className={`size-20 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
          speech.isListening
            ? "bg-red-500/20 border-2 border-red-500 animate-pulse"
            : "bg-muted hover:bg-muted/80"
        }`}
      >
        {speech.isListening ? (
          <MicOff className="size-8 text-red-500" />
        ) : (
          <Mic className="size-8 text-muted-foreground" />
        )}
      </button>

      <p className="text-xs text-muted-foreground">
        {speech.isListening
          ? "Listening... tap to stop"
          : parsed
            ? "Review the result below"
            : "Tap the mic and say something like \"spent 50 on food\""}
      </p>

      {(speech.interimTranscript || speech.transcript) && !parsed && (
        <p className="text-sm text-center">
          <span className="text-foreground">{speech.transcript}</span>
          <span className="text-muted-foreground">{speech.interimTranscript}</span>
        </p>
      )}

      {speech.error && <p className="text-sm text-red-500">{speech.error}</p>}

      {parsed && (
        <div className="w-full space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <Badge variant={parsed.type === "income" ? "default" : "destructive"}>
              {parsed.type === "income" ? "Income" : "Expense"}
            </Badge>
            {parsed.amount !== null && (
              <Badge variant="secondary">{formatCurrency(parsed.amount, "USD")}</Badge>
            )}
            {matchedCategory ? (
              <Badge variant="outline" style={{ borderColor: matchedCategory.color, color: matchedCategory.color }}>
                {matchedCategory.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">No category match</Badge>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground italic">
            &quot;{parsed.description}&quot;
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Try again
            </Button>
            <Button size="sm" onClick={onApply}>
              <Check className="h-3.5 w-3.5 mr-1" /> Use this
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
