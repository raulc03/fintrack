import { formatCurrency, getCurrencySymbol } from "./currency";

describe("formatCurrency", () => {
  it("formats USD with dollar sign and space", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$ 1,234.50");
  });

  it("formats PEN with S/ symbol", () => {
    const result = formatCurrency(1500, "PEN");
    expect(result).toContain("S/");
    expect(result).toContain("1,500");
  });

  it("handles zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$ 0.00");
  });

  it("handles small decimals", () => {
    expect(formatCurrency(9.99, "USD")).toBe("$ 9.99");
  });

  it("handles large numbers", () => {
    const result = formatCurrency(1000000, "USD");
    expect(result).toContain("1,000,000");
  });
});

describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns S/ for PEN", () => {
    expect(getCurrencySymbol("PEN")).toBe("S/");
  });
});
