"use client";

import { useState, useEffect } from "react";
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
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [obligationId, setObligationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsed, setParsed] = useState<ParsedMovement | null>(null);

  const speech = useSpeechRecognition();

  const filteredCategories = filterCategoriesByType(categories, type);

  const defaultAccountId = accounts[0]?.id ?? "";
  const speechReset = speech.reset;

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setMode("manual");
      setType("expense");
      setAmount("");
      setDescription("");
      setAccountId(defaultAccountId);
      setDestinationAccountId("");
      setCategoryId("");
      setObligationId("");
      setParsed(null);
      speechReset();
    }
  }, [open, defaultAccountId, speechReset]);

  // Parse when transcript finalizes
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
    description.trim() !== "" &&
    accountId !== "" &&
    (type === "transfer" ? destinationAccountId !== "" : categoryId !== "");

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        date: new Date().toISOString(),
        accountId,
        destinationAccountId:
          type === "transfer" ? destinationAccountId : undefined,
        categoryId,
        obligationId: type === "expense" && obligationId ? obligationId : undefined,
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
        className="max-h-[80vh] rounded-t-2xl overflow-y-auto"
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
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <Button
                variant={mode === "voice" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setMode("voice")}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="px-4 space-y-4">
          {mode === "manual" ? (
            <ManualForm
              type={type}
              onTypeChange={(t) => {
                setType(t);
                setCategoryId("");
                setObligationId("");
              }}
              amount={amount}
              onAmountChange={setAmount}
              description={description}
              onDescriptionChange={setDescription}
              accountId={accountId}
              onAccountChange={setAccountId}
              destinationAccountId={destinationAccountId}
              onDestinationChange={setDestinationAccountId}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              obligationId={obligationId}
              onObligationChange={setObligationId}
              accounts={accounts}
              categories={filteredCategories}
              obligations={obligations}
            />
          ) : (
            <VoiceInput
              speech={speech}
              parsed={parsed}
              categories={categories}
              onApply={applyParsed}
              onRetry={() => {
                setParsed(null);
                speech.reset();
              }}
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

function ManualForm({
  type,
  onTypeChange,
  amount,
  onAmountChange,
  description,
  onDescriptionChange,
  accountId,
  onAccountChange,
  destinationAccountId,
  onDestinationChange,
  categoryId,
  onCategoryChange,
  obligationId,
  onObligationChange,
  accounts,
  categories,
  obligations,
}: {
  type: MovementType;
  onTypeChange: (t: MovementType) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  accountId: string;
  onAccountChange: (v: string) => void;
  destinationAccountId: string;
  onDestinationChange: (v: string) => void;
  categoryId: string;
  onCategoryChange: (v: string) => void;
  obligationId: string;
  onObligationChange: (v: string) => void;
  accounts: Account[];
  categories: Category[];
  obligations: Obligation[];
}) {
  return (
    <>
      <Tabs
        value={type}
        onValueChange={(v) => onTypeChange(v as MovementType)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="expense" className="flex-1">
            Expense
          </TabsTrigger>
          <TabsTrigger value="income" className="flex-1">
            Income
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex-1">
            Transfer
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <AmountInput
        placeholder="Amount"
        value={amount}
        onChange={onAmountChange}
        className="text-lg h-10"
      />

      <Input
        placeholder="Description"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />

      <Select
        value={accountId}
        onValueChange={(v) => v && onAccountChange(v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {type === "transfer" ? (
        <Select
          value={destinationAccountId}
          onValueChange={(v) => v && onDestinationChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="To account" />
          </SelectTrigger>
          <SelectContent>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      ) : (
        <Select
          value={categoryId}
          onValueChange={(v) => v && onCategoryChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === "expense" && obligations.filter((o) => !o.isPaid).length > 0 && (
        <Select
          value={obligationId || "__none__"}
          onValueChange={(v) => v && onObligationChange(v === "__none__" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Link obligation (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {obligations.filter((o) => !o.isPaid).map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
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
      {/* Mic button */}
      <button
        onClick={speech.isListening ? speech.stop : speech.start}
        className={`size-20 rounded-full flex items-center justify-center transition-all cursor-pointer ${
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

      {/* Live transcript */}
      {(speech.interimTranscript || speech.transcript) && !parsed && (
        <p className="text-sm text-center">
          <span className="text-foreground">{speech.transcript}</span>
          <span className="text-muted-foreground">
            {speech.interimTranscript}
          </span>
        </p>
      )}

      {/* Error */}
      {speech.error && (
        <p className="text-sm text-red-500">{speech.error}</p>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="w-full space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <Badge variant={parsed.type === "income" ? "default" : "destructive"}>
              {parsed.type === "income" ? "Income" : "Expense"}
            </Badge>
            {parsed.amount !== null && (
              <Badge variant="secondary">
                {formatCurrency(parsed.amount, "USD")}
              </Badge>
            )}
            {matchedCategory && (
              <Badge
                variant="outline"
                style={{
                  borderColor: matchedCategory.color,
                  color: matchedCategory.color,
                }}
              >
                {matchedCategory.name}
              </Badge>
            )}
            {!matchedCategory && (
              <Badge variant="outline" className="text-muted-foreground">
                No category match
              </Badge>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground italic">
            &quot;{parsed.description}&quot;
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Try again
            </Button>
            <Button size="sm" onClick={onApply}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Use this
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
