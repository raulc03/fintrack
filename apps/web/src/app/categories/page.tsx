"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useCategories } from "@/hooks/use-categories";
import { CategoryRowCreate } from "@/components/categories/category-row-create";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import type { CategoryType, CreateCategoryInput } from "@finance/types";

export default function CategoriesPage() {
  const { categories, loading, create, remove } = useCategories();
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("expense");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const handleCreate = async (data: CreateCategoryInput) => {
    await create(data);
    setCreating(false);
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
        onAddClick={() => setCreating(true)}
        addLabel="New Category"
      />
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12" />
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
              <CategoryList
                categories={expenseCategories}
                onDelete={handleDelete}
                creating={creating && activeTab === "expense"}
                onCreateSave={handleCreate}
                onCreateCancel={() => setCreating(false)}
                createType="expense"
              />
            </TabsContent>

            <TabsContent value="income" className="mt-4">
              <CategoryList
                categories={incomeCategories}
                onDelete={handleDelete}
                creating={creating && activeTab === "income"}
                onCreateSave={handleCreate}
                onCreateCancel={() => setCreating(false)}
                createType="income"
              />
            </TabsContent>
          </Tabs>
        )}

        {!loading && categories.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No categories yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create categories to organize your movements.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function CategoryList({
  categories,
  onDelete,
  creating,
  onCreateSave,
  onCreateCancel,
  createType,
}: {
  categories: ReturnType<typeof useCategories>["categories"];
  onDelete: (id: string, name: string) => void;
  creating: boolean;
  onCreateSave: (data: CreateCategoryInput) => void;
  onCreateCancel: () => void;
  createType: CategoryType;
}) {
  return (
    <div className="space-y-2">
      {creating && (
        <CategoryRowCreate
          type={createType}
          onSave={onCreateSave}
          onCancel={onCreateCancel}
        />
      )}
      {categories.length === 0 && !creating && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No categories in this type yet.
        </p>
      )}
      {categories.map((cat) => (
        <Card key={cat.id}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-medium text-sm">{cat.name}</span>
              {cat.isDefault && (
                <span className="text-xs text-muted-foreground">(default)</span>
              )}
            </div>
            {!cat.isDefault && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(cat.id, cat.name)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
