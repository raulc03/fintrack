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
import { filterCategoriesByType } from "@/lib/constants";
import { parseVoiceInput, type ParsedMovement } from "@/lib/voice-parser";
import { formatCurrency } from "@/lib/currency";

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
  const [mode, setMode] = useState<"manual" | "voice">("manual");
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [obligationId, setObligationId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsed, setParsed] = useState<ParsedMovement | null>(null);
  const { settings } = useSettings();

  const speech = useSpeechRecognition();
  const filteredCategories = filterCategoriesByType(categories, type);
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
      setDate(new Date().toISOString().split("T")[0]);
      setAccountId(defaultAccountId);
      setDestinationAccountId("");
      setCategoryId("");
      setObligationId("");
      setExchangeRate("");
      setParsed(null);
      speechReset();
    }
  }, [open, defaultAccountId, speechReset]);

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
      ? destinationAccountId !== "" && (!isCrossCurrency || (exchangeRate !== "" && parseFloat(exchangeRate) > 0))
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
        categoryId: type !== "transfer" ? categoryId : "",
        obligationId: type === "expense" && obligationId ? obligationId : undefined,
        exchangeRate: isCrossCurrency ? parseFloat(exchangeRate) : undefined,
      });
      toast.success("Movement created");
      onOpenChange(false);
    } catch {
      toast.error("Failed to create movement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-2xl overflow-y-auto"
        showCloseButton={false}
      >
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Quick Add</SheetTitle>
          {speech.isSupported && (
            <div className="flex gap-1">
              <Button
                variant={mode === "manual" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setMode("manual")}
                aria-label="Manual input"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <Button
                variant={mode === "voice" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setMode("voice")}
                aria-label="Voice input"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="px-4 space-y-3">
          {mode === "manual" ? (
            <>
              {/* Type tabs */}
              <Tabs value={type} onValueChange={(v) => { setType(v as MovementType); setCategoryId(""); setObligationId(""); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="expense" className="flex-1">Expense</TabsTrigger>
                  <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
                  <TabsTrigger value="transfer" className="flex-1">Transfer</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Amount + Date row */}
              <div className="flex gap-2">
                <AmountInput
                  placeholder="Amount"
                  value={amount}
                  onChange={setAmount}
                  className="flex-1 text-lg h-10"
                />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-[130px] h-10 [color-scheme:dark]"
                />
              </div>

              {/* Description */}
              <Input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Account + Category (expense/income) or From + To (transfer) */}
              {type === "transfer" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={accountId} onValueChange={(v) => { if (v) { setAccountId(v); if (v === destinationAccountId) setDestinationAccountId(""); } }}>
                      <SelectTrigger>
                        <SelectValue placeholder="From">
                          {sourceAccount?.name ?? "From"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={destinationAccountId} onValueChange={(v) => v && setDestinationAccountId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="To">
                          {destAccount?.name ?? "To"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.filter((a) => a.id !== accountId).map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isCrossCurrency && (
                    <div className="space-y-1">
                      <AmountInput
                        value={exchangeRate}
                        onChange={setExchangeRate}
                        placeholder="Exchange rate"
                      />
                      {amount && exchangeRate && parseFloat(exchangeRate) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {sourceAccount?.currency} {amount} &times; {exchangeRate} = {destAccount?.currency}{" "}
                          {(parseFloat(amount) * parseFloat(exchangeRate)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Account">
                        {sourceAccount?.name ?? "Account"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category">
                        {filteredCategories.find((c) => c.id === categoryId)?.name ?? "Category"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Obligation link (expense only) */}
              {type === "expense" && unpaidObligations.length > 0 && (
                <Select
                  value={obligationId || "__none__"}
                  onValueChange={(v) => v && setObligationId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Obligation (optional)">
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
              )}
            </>
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
          <SheetFooter>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Creating..." : "Create Movement"}
            </Button>
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
    <div className="flex flex-col items-center gap-4 py-4">
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
