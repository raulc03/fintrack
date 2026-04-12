export type CategoryType = "income" | "expense";

export type CategoryBucket = "necessity" | "desire" | "save_invest";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  bucket?: CategoryBucket;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  bucket?: CategoryBucket;
  icon?: string;
  color?: string;
}
