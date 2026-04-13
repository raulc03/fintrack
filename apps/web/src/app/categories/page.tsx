"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useCategories } from "@/hooks/use-categories";
import { CategoryForm } from "@/components/categories/category-form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Tag } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import { BUDGET_BUCKETS, getBudgetBucketMeta } from "@/lib/budgeting";
import { toast } from "sonner";
import type { Category, CategoryType, CreateCategoryInput } from "@finance/types";

export default function CategoriesPage() {
  const { categories, loading, create, update, remove } = useCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("expense");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");
  const unclassifiedExpenseCategories = expenseCategories.filter((c) => !c.bucket);

  const handleCreate = async (data: CreateCategoryInput) => {
    try {
      await create(data);
      toast.success("Category created");
    } catch {
      toast.error("Failed to create category");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await remove(id);
      toast.success(`"${name}" deleted`);
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const handleAssignBucket = async (id: string, bucket: NonNullable<Category["bucket"]>) => {
    try {
      await update(id, { bucket });
      toast.success("Bucket assigned");
    } catch {
      toast.error("Failed to assign bucket");
    }
  };

  return (
    <>
      <Header
        title="Categories"
        onAddClick={() => setFormOpen(true)}
        addLabel="New Category"
      />
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="expense">
                Expenses ({expenseCategories.length})
              </TabsTrigger>
              <TabsTrigger value="income">
                Income ({incomeCategories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense" className="mt-4">
              <BucketReviewCard
                categories={unclassifiedExpenseCategories}
                onAssignBucket={handleAssignBucket}
              />
              <CategoryGrid
                categories={expenseCategories}
                onDelete={handleDelete}
              />
            </TabsContent>

            <TabsContent value="income" className="mt-4">
              <CategoryGrid
                categories={incomeCategories}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        )}

        {!loading && categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No categories yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create categories to organize your movements.
            </p>
          </div>
        )}
      </div>

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        defaultType={activeTab as CategoryType}
      />
    </>
  );
}

function CategoryGrid({
  categories,
  onDelete,
}: {
  categories: Category[];
  onDelete: (id: string, name: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No categories in this type yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        return (
          <div
            key={cat.id}
            className="group relative flex flex-col items-center gap-3 py-2"
          >
            <div
              className="flex size-18 items-center justify-center rounded-full md:size-20"
              style={{ backgroundColor: cat.color }}
            >
              <Icon className="size-8 text-white md:size-9" />
            </div>
            <span className="w-full px-1 text-center text-sm font-medium leading-tight md:text-base">
              {cat.name}
            </span>
            {cat.type === "expense" && cat.bucket && (
              <Badge variant="outline" className="h-7 px-2.5 text-xs md:text-sm">
                {getBudgetBucketMeta(cat.bucket).label}
              </Badge>
            )}
            {!cat.isDefault && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute -top-1 -right-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity bg-background/80 rounded-full"
                onClick={() => onDelete(cat.id, cat.name)}
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BucketReviewCard({
  categories,
  onAssignBucket,
}: {
  categories: Category[];
  onAssignBucket: (id: string, bucket: NonNullable<Category["bucket"]>) => void | Promise<void>;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Review unclassified expenses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign each expense category to the 50/30/20 model before trusting the dashboard guidance.
          </p>
        </div>
        <Badge variant="outline" className="h-6 border-amber-500/30 bg-transparent text-amber-600">
          {categories.length} to review
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-xl border border-border/60 bg-background/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">Choose the bucket that should drive monthly advice for this category.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {BUDGET_BUCKETS.map((bucket) => (
                  <Button
                    key={bucket.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAssignBucket(category.id, bucket.value)}
                  >
                    {bucket.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
