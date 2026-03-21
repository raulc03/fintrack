import type { MovementType, Category } from "@finance/types";

export interface ParsedMovement {
  type: MovementType;
  amount: number | null;
  description: string;
  categoryMatch: string | null;
}

const EXPENSE_KEYWORDS = [
  "spent",
  "paid",
  "bought",
  "cost",
  "expense",
  "payment",
  "charged",
  "pay",
  "purchase",
];

const INCOME_KEYWORDS = [
  "received",
  "earned",
  "got paid",
  "income",
  "salary",
  "deposit",
  "refund",
  "bonus",
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  "food": ["eat", "lunch", "dinner", "breakfast", "restaurant", "coffee", "groceries", "grocery", "supermarket", "store"],
  "transport": ["uber", "taxi", "gas", "fuel", "bus", "parking", "drive"],
  "rent": ["apartment", "housing", "landlord"],
  "utilities": ["electric", "electricity", "water", "internet", "phone", "bill"],
  "entertainment": ["movie", "cinema", "netflix", "game", "concert", "fun"],
  "health": ["doctor", "pharmacy", "medicine", "hospital", "gym", "fitness"],
  "shopping": ["clothes", "clothing", "amazon", "online", "mall"],
  "education": ["course", "book", "class", "school", "university", "tuition"],
  "salary": ["paycheck", "wage"],
  "freelance": ["project", "client", "gig", "contract"],
  "investments": ["stock", "dividend", "interest", "return"],
};

export function parseVoiceInput(
  transcript: string,
  categories: Category[]
): ParsedMovement {
  const text = transcript.toLowerCase().trim();

  // Detect type
  const isIncome = INCOME_KEYWORDS.some((kw) => text.includes(kw));
  const isExpense = EXPENSE_KEYWORDS.some((kw) => text.includes(kw));
  const type: MovementType = isIncome && !isExpense ? "income" : "expense";

  // Extract amount
  let amount: number | null = null;
  const dollarMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  const numberMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (dollarMatch) {
    amount = parseFloat(dollarMatch[1]);
  } else if (numberMatch) {
    amount = parseFloat(numberMatch[1].replace(",", "."));
  }

  // Match category
  const relevantCategories = categories.filter((c) => c.type === type);
  let categoryMatch: string | null = null;

  // Direct name match
  for (const cat of relevantCategories) {
    if (text.includes(cat.name.toLowerCase())) {
      categoryMatch = cat.id;
      break;
    }
  }

  // Alias match
  if (!categoryMatch) {
    for (const cat of relevantCategories) {
      const catNameLower = cat.name.toLowerCase();
      for (const [aliasKey, aliases] of Object.entries(CATEGORY_ALIASES)) {
        if (catNameLower.includes(aliasKey)) {
          if (aliases.some((alias) => text.includes(alias))) {
            categoryMatch = cat.id;
            break;
          }
        }
      }
      if (categoryMatch) break;
    }
  }

  return {
    type,
    amount,
    description: transcript.trim(),
    categoryMatch,
  };
}
