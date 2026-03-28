"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useCategories } from "@/hooks/use-categories";
import { CategoryForm } from "@/components/categories/category-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Tag } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import { toast } from "sonner";
import type { Category, CategoryType, CreateCategoryInput } from "@finance/types";

export default function CategoriesPage() {
  const { categories, loading, create, remove } = useCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("expense");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const handleCreate = async (data: CreateCategoryInput) => {
    await create(data);
    toast.success("Category created");
  };

  const handleDelete = async (id: string, name: string) => {
    await remove(id);
    toast.success(`"${name}" deleted`);
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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        return (
          <div
            key={cat.id}
            className="group relative flex flex-col items-center gap-2 py-2"
          >
            <div
              className="size-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: cat.color }}
            >
              <Icon className="size-6 text-white" />
            </div>
            <span className="text-xs font-medium text-center truncate w-full px-1">
              {cat.name}
            </span>
            {!cat.isDefault && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-full"
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
