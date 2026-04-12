"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, CreateMovementInput, CreateObligationInput, Movement, MovementType } from "@finance/types";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MovementForm } from "@/components/movements/movement-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccounts } from "@/hooks/use-accounts";
import { useBudgetSummary } from "@/hooks/use-budget-summary";
import { useCategories } from "@/hooks/use-categories";
import { useGoals } from "@/hooks/use-goals";
import { useMovements } from "@/hooks/use-movements";
import { useObligations } from "@/hooks/use-obligations";
import { formatCurrency, formatCurrencyWithMainConversion } from "@/lib/currency";
import { getBudgetBucketMeta } from "@/lib/budgeting";
import { ROUTES } from "@/lib/constants";
import { formatDateInTimeZone } from "@/lib/date";
import { useSettings } from "@/hooks/use-settings";
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BUCKET_MOVEMENT_COPY: Record<string, { type: MovementType; description: string }> = {
  necessity: { type: "expense", description: "Essential expense" },
  desire: { type: "expense", description: "Optional expense" },
  save_invest: { type: "expense", description: "Savings or investment move" },
};

const BUCKET_ORDER = ["necessity", "desire", "save_invest"] as const;

const BUCKET_TONE_STYLES: Record<(typeof BUCKET_ORDER)[number], { accent: string; soft: string; ring: string }> = {
  necessity: {
    accent: "bg-rose-500",
    soft: "bg-rose-500/10 text-rose-200",
    ring: "data-active:border-rose-500/50 data-active:bg-rose-500/10",
  },
  desire: {
    accent: "bg-amber-400",
    soft: "bg-amber-400/10 text-amber-100",
    ring: "data-active:border-amber-400/50 data-active:bg-amber-400/10",
  },
  save_invest: {
    accent: "bg-emerald-500",
    soft: "bg-emerald-500/10 text-emerald-200",
    ring: "data-active:border-emerald-500/50 data-active:bg-emerald-500/10",
  },
};

function getValidBucket(value: string | null): (typeof BUCKET_ORDER)[number] {
  return BUCKET_ORDER.includes(value as (typeof BUCKET_ORDER)[number])
    ? (value as (typeof BUCKET_ORDER)[number])
    : "necessity";
}

export default function BucketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const currentMonthMovementFilters = useMemo(() => ({ currentMonth: true as const }), []);
  const { accounts, loading: accountsLoading, refetch: refetchAccounts } = useAccounts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { summary, loading: summaryLoading } = useBudgetSummary();
  const { refetch: refetchGoals } = useGoals();
  const {
    obligations,
    loading: obligationsLoading,
    create: createObligation,
    remove: removeObligation,
    link: linkObligation,
    refetch: refetchObligations,
  } = useObligations();
  const {
    movements,
    loading: movementsLoading,
    create: createMovement,
    update: updateMovement,
    remove: removeMovement,
    refetch: refetchMovements,
  } = useMovements(currentMonthMovementFilters);
  const [activeBucket, setActiveBucket] = useState<(typeof BUCKET_ORDER)[number]>(() => getValidBucket(searchParams.get("bucket")));
  const [creatingBucket, setCreatingBucket] = useState<string | null>(null);
  const [movementBucket, setMovementBucket] = useState<string | null>(null);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  const loading = accountsLoading || categoriesLoading || summaryLoading || obligationsLoading || movementsLoading;
  const linkedMovementIds = useMemo(
    () => new Set(obligations.map((obligation) => obligation.linkedMovementId).filter(Boolean)),
    [obligations]
  );

  useEffect(() => {
    setActiveBucket(getValidBucket(searchParams.get("bucket")));
  }, [searchParams]);

  const handleMovementSubmit = async (input: CreateMovementInput & { obligationId?: string }) => {
    const { obligationId, ...movementData } = input;
    const result = await createMovement(movementData);
    if (obligationId && result?.id) {
      await linkObligation(obligationId, result.id);
    }
    refetchAccounts();
    refetchGoals();
    refetchObligations();
    refetchMovements();
    toast.success("Movement created");
    setMovementBucket(null);
  };

  const handleMovementUpdate = async (input: CreateMovementInput & { obligationId?: string }) => {
    if (!editingMovement) return;
    await updateMovement(editingMovement.id, input);
    refetchAccounts();
    refetchGoals();
    refetchObligations();
    refetchMovements();
    toast.success("Movement updated");
    setEditingMovement(null);
  };

  const handleMovementDelete = async (movement: Movement) => {
    if (!confirm(`Delete "${movement.description}"? This cannot be undone.`)) return;
    await removeMovement(movement.id);
    refetchAccounts();
    refetchGoals();
    refetchObligations();
    refetchMovements();
    toast.success("Movement deleted");
  };

  if (loading || !summary) {
    return (
      <>
        <Header title="Buckets" />
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[220px] rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Buckets"
        customAction={
          <Link href={ROUTES.GOALS} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Long-term goals
          </Link>
        }
      />
      <div className="space-y-6 p-4 pb-24 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-medium">Monthly Budget Workspace</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage fixed commitments and variable monthly activity from the same place.
              </p>
            </div>
            <Badge variant="secondary">{formatCurrencyWithMainConversion(summary.income, summary.currency, settings.mainCurrency, settings.usdToPenRate)} income</Badge>
          </CardHeader>
        </Card>

        <Tabs
          value={activeBucket}
          onValueChange={(value) => {
            const nextBucket = getValidBucket(value);
            setActiveBucket(nextBucket);
            const nextSearchParams = new URLSearchParams(searchParams.toString());
            nextSearchParams.set("bucket", nextBucket);
            router.replace(`/buckets?${nextSearchParams.toString()}`, { scroll: false });
          }}
          className="gap-4"
        >
          <TabsList className="grid w-full grid-cols-1 items-stretch gap-3 rounded-3xl border border-border/60 bg-muted/20 p-3 !h-auto md:grid-cols-3">
            {summary.buckets.map((bucket) => (
              <TabsTrigger
                key={bucket.key}
                value={bucket.key}
                className={`min-h-[132px] w-full items-start justify-start rounded-2xl border border-transparent px-4 py-4 text-left shadow-none transition-all hover:border-border/70 hover:bg-background/40 ${BUCKET_TONE_STYLES[bucket.key].ring}`}
              >
                <div className="flex w-full flex-col items-start gap-3">
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${BUCKET_TONE_STYLES[bucket.key].soft}`}>
                        {bucket.percentOfIncome.toFixed(0)}%
                      </div>
                      <div className="text-base font-semibold text-foreground">{bucket.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">{formatCurrencyWithMainConversion(bucket.actualAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}</div>
                      <div className="text-[11px] text-muted-foreground">spent this month</div>
                    </div>
                  </div>

                  <div className="w-full space-y-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/80">
                      <div
                        className={`h-full rounded-full ${BUCKET_TONE_STYLES[bucket.key].accent}`}
                        style={{ width: `${Math.min(bucket.progressPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                      <span>Target {formatCurrencyWithMainConversion(bucket.targetAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}</span>
                      <span>{bucket.remainingAmount >= 0 ? `${formatCurrencyWithMainConversion(bucket.remainingAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} left` : `${formatCurrencyWithMainConversion(Math.abs(bucket.remainingAmount), summary.currency, settings.mainCurrency, settings.usdToPenRate)} over`}</span>
                    </div>
                  </div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {summary.buckets.map((bucket) => {
            const bucketCategories = categories.filter((category) => category.bucket === bucket.key && category.type === "expense");
            const bucketObligations = obligations.filter((obligation) => obligation.bucket === bucket.key);
            const bucketMovements = movements
              .filter((movement) => {
                if (movement.type !== "expense") return false;
                if (linkedMovementIds.has(movement.id)) return false;
                const category = categories.find((item) => item.id === movement.categoryId);
                return category?.bucket === bucket.key;
              })
              .slice(0, 6);
            const meta = getBudgetBucketMeta(bucket.key);

            return (
              <TabsContent key={bucket.key} value={bucket.key} className="mt-0">
                <Card>
                  <CardHeader className="gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-semibold">{meta.label}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={bucket.isOver ? "outline" : "secondary"}>
                          {formatCurrencyWithMainConversion(bucket.actualAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} total
                        </Badge>
                        <Button size="sm" onClick={() => setMovementBucket(bucket.key)}>
                          <Plus className="mr-1 h-4 w-4" />
                          Add movement
                        </Button>
                      </div>
                    </div>
                    <Progress value={Math.min(bucket.progressPercent, 100)} className={bucket.isOver ? "progress-gradient-red" : "progress-gradient-green"} />
                    <div className="grid gap-3 md:grid-cols-4">
                      <SummaryMini label="Target" value={formatCurrencyWithMainConversion(bucket.targetAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} />
                      <SummaryMini label="Fixed" value={formatCurrencyWithMainConversion(bucket.fixedAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} />
                      <SummaryMini label="Variable" value={formatCurrencyWithMainConversion(bucket.variableAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} />
                      <SummaryMini label={bucket.remainingAmount >= 0 ? "Left" : "Over"} value={formatCurrencyWithMainConversion(Math.abs(bucket.remainingAmount), summary.currency, settings.mainCurrency, settings.usdToPenRate)} tone={bucket.remainingAmount >= 0 ? "default" : "danger"} />
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-2">
                    <BucketFixedSection
                      bucket={bucket.key}
                      categories={bucketCategories}
                      obligations={bucketObligations}
                      onCreate={async (data) => {
                        await createObligation(data);
                        refetchObligations();
                        toast.success("Fixed item created");
                        setCreatingBucket(null);
                      }}
                      onDelete={async (obligationId, obligationName) => {
                        if (!confirm(`Delete "${obligationName}"? This cannot be undone.`)) return;
                        await removeObligation(obligationId);
                        refetchObligations();
                        toast.success("Fixed item deleted");
                      }}
                      creating={creatingBucket === bucket.key}
                      onStartCreate={() => setCreatingBucket(bucket.key)}
                      onCancelCreate={() => setCreatingBucket(null)}
                    />
                    <BucketVariableSection
                      bucket={bucket.key}
                      movements={bucketMovements}
                      categories={categories}
                      onEdit={(movement) => setEditingMovement(movement)}
                      onDelete={handleMovementDelete}
                      timezone={settings.timezone}
                      hasGoalAllocations={bucket.key === "save_invest" && bucket.variableAmount > bucketMovements.reduce((sum, movement) => sum + movement.amount, 0)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <MovementForm
        open={movementBucket !== null}
        onOpenChange={(open) => !open && setMovementBucket(null)}
        onSubmit={handleMovementSubmit}
        accounts={accounts}
        categories={categories}
        obligations={movementBucket ? obligations.filter((obligation) => obligation.bucket === movementBucket) : []}
        initialValues={movementBucket ? {
          type: BUCKET_MOVEMENT_COPY[movementBucket].type,
          description: BUCKET_MOVEMENT_COPY[movementBucket].description,
          categoryId: categories.find((category) => category.bucket === movementBucket && category.type === "expense")?.id,
        } : undefined}
      />

      <MovementForm
        open={editingMovement !== null}
        onOpenChange={(open) => !open && setEditingMovement(null)}
        onSubmit={handleMovementUpdate}
        accounts={accounts}
        categories={categories}
        editingMovement={editingMovement}
      />
    </>
  );
}

function BucketFixedSection({
  bucket,
  categories,
  obligations,
  onCreate,
  onDelete,
  creating,
  onStartCreate,
  onCancelCreate,
}: {
  bucket: string;
  categories: Category[];
  obligations: ReturnType<typeof useObligations>["obligations"];
  onCreate: (data: CreateObligationInput) => void | Promise<void>;
  onDelete: (obligationId: string, obligationName: string) => void | Promise<void>;
  creating: boolean;
  onStartCreate: () => void;
  onCancelCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Fixed commitments</h2>
          <p className="mt-1 text-xs text-muted-foreground">Recurring commitments that pre-allocate part of this bucket.</p>
        </div>
        <Button size="sm" variant="outline" onClick={onStartCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add fixed
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {creating && (
          <ObligationCreateInline
            bucket={bucket}
            categories={categories}
            onSave={onCreate}
            onCancel={onCancelCreate}
          />
        )}
        {obligations.length === 0 && !creating ? (
          <p className="text-sm text-muted-foreground">No fixed commitments yet.</p>
        ) : (
          obligations.map((obligation) => (
            <div key={obligation.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{obligation.name}</p>
                <p className="text-xs text-muted-foreground">Due day {obligation.dueDay}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={obligation.isPaid ? "secondary" : "outline"}>
                  {obligation.isPaid ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Circle className="mr-1 h-3.5 w-3.5" />}
                  {obligation.isPaid ? "Linked" : "Pending"}
                </Badge>
                <span className="text-sm font-medium">{formatCurrency(obligation.estimatedAmount, obligation.currency)}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => onDelete(obligation.id, obligation.name)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BucketVariableSection({
  bucket,
  movements,
  categories,
  onEdit,
  onDelete,
  timezone,
  hasGoalAllocations,
}: {
  bucket: string;
  movements: Movement[];
  categories: Category[];
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void | Promise<void>;
  timezone: string;
  hasGoalAllocations: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
      <div>
        <h2 className="text-sm font-medium">Variable activity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One-off movements tracked inside this bucket{bucket === "save_invest" ? " plus any goal allocations recorded this month." : "."}
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variable movements yet.</p>
        ) : (
          movements.map((movement) => {
            const category = categories.find((item) => item.id === movement.categoryId);
            return (
              <div key={movement.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{movement.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {category?.name ?? "Uncategorized"} · {formatDateInTimeZone(movement.date, timezone, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(movement.amount, movement.currency)}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit(movement)}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => onDelete(movement)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
        {hasGoalAllocations && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground">
            Some of this bucket's variable total comes from long-term goal allocations. Keep managing targets on the <Link href={ROUTES.GOALS} className="text-foreground underline underline-offset-4">Goals page</Link>.
          </div>
        )}
      </div>
    </div>
  );
}

function ObligationCreateInline({
  bucket,
  categories,
  onSave,
  onCancel,
}: {
  bucket: string;
  categories: Category[];
  onSave: (data: CreateObligationInput) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "PEN">("PEN");
  const [dueDay, setDueDay] = useState("1");

  const canSave = name.trim() !== "" && categoryId !== "" && Number(estimatedAmount) > 0 && Number(dueDay) >= 1;

  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/80 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="e.g. Rent" value={name} onChange={(event) => setName(event.target.value)} />
        <Select value={categoryId} onValueChange={(value) => value && setCategoryId(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category">
              {categories.find((category) => category.id === categoryId)?.name ?? "Select category"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AmountInput placeholder="Amount" value={estimatedAmount} onChange={setEstimatedAmount} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={currency} onValueChange={(value) => value && setCurrency(value as "USD" | "PEN") }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PEN">PEN</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min="1" max="31" placeholder="Due day" value={dueDay} onChange={(event) => setDueDay(event.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!canSave}
          onClick={() => onSave({
            name: name.trim(),
            bucket: bucket as CreateObligationInput["bucket"],
            categoryId,
            estimatedAmount: Number(estimatedAmount),
            currency,
            dueDay: Number(dueDay),
          })}
        >
          Save fixed item
        </Button>
      </div>
    </div>
  );
}

function SummaryMini({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-sm font-medium ${tone === "danger" ? "text-red-500" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
