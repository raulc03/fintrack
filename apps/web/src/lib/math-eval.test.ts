import { evaluateMathExpression, hasMathOperators } from "./math-eval";

describe("evaluateMathExpression", () => {
  // Basic operations
  it("evaluates addition", () => expect(evaluateMathExpression("1+2")).toBe(3));
  it("evaluates subtraction", () => expect(evaluateMathExpression("10-3")).toBe(7));
  it("evaluates multiplication", () => expect(evaluateMathExpression("4*5")).toBe(20));
  it("evaluates division", () => expect(evaluateMathExpression("10/4")).toBe(2.5));

  // Operator precedence
  it("respects precedence: * before +", () => expect(evaluateMathExpression("2+3*4")).toBe(14));
  it("respects precedence: / before -", () => expect(evaluateMathExpression("10-6/2")).toBe(7));

  // Parentheses
  it("handles parentheses", () => expect(evaluateMathExpression("(2+3)*4")).toBe(20));
  it("handles nested parentheses", () => expect(evaluateMathExpression("((2+3)*4)")).toBe(20));

  // Decimals
  it("handles decimals", () => expect(evaluateMathExpression("1.5+2.5")).toBe(4));
  it("handles leading dot", () => expect(evaluateMathExpression(".5+.5")).toBe(1));

  // Negative numbers
  it("handles negative leading number", () => expect(evaluateMathExpression("-5+10")).toBe(5));
  it("handles negative in parens", () => expect(evaluateMathExpression("(-5)+10")).toBe(5));

  // Floating point rounding
  it("rounds to 2 decimal places", () => expect(evaluateMathExpression("0.1+0.2")).toBe(0.3));
  it("rounds result", () => expect(evaluateMathExpression("10/3")).toBe(3.33));

  // Whitespace
  it("handles spaces", () => expect(evaluateMathExpression("1 + 2")).toBe(3));
  it("handles leading/trailing spaces", () => expect(evaluateMathExpression("  5 * 3  ")).toBe(15));

  // Plain numbers
  it("returns plain number", () => expect(evaluateMathExpression("42")).toBe(42));
  it("returns decimal number", () => expect(evaluateMathExpression("3.14")).toBe(3.14));

  // Error cases
  it("returns null for empty string", () => expect(evaluateMathExpression("")).toBeNull());
  it("returns null for whitespace only", () => expect(evaluateMathExpression("   ")).toBeNull());
  it("returns null for division by zero", () => expect(evaluateMathExpression("5/0")).toBeNull());
  it("returns null for invalid expression", () => expect(evaluateMathExpression("abc")).toBeNull());
  it("returns null for double dots", () => expect(evaluateMathExpression("1..2")).toBeNull());
  it("returns null for unmatched parens", () => expect(evaluateMathExpression("(1+2")).toBeNull());
  it("returns null for empty parens", () => expect(evaluateMathExpression("()")).toBeNull());
  it("returns null for trailing operator", () => expect(evaluateMathExpression("5+")).toBeNull());

  // Depth limit
  it("returns null for deeply nested parens", () => {
    const deep = "(" .repeat(15) + "1" + ")".repeat(15);
    expect(evaluateMathExpression(deep)).toBeNull();
  });

  // Security: non-math chars stripped
  it("strips letters", () => expect(evaluateMathExpression("1a+2b")).toBe(3)); // strips a/b → "1+2" = 3
});

describe("hasMathOperators", () => {
  it("returns false for plain number", () => expect(hasMathOperators("42")).toBe(false));
  it("returns false for negative number", () => expect(hasMathOperators("-42")).toBe(false));
  it("returns true for addition", () => expect(hasMathOperators("1+2")).toBe(true));
  it("returns true for subtraction", () => expect(hasMathOperators("10-3")).toBe(true));
  it("returns true for multiplication", () => expect(hasMathOperators("4*5")).toBe(true));
  it("returns true for division", () => expect(hasMathOperators("10/2")).toBe(true));
  it("returns false for empty string", () => expect(hasMathOperators("")).toBe(false));
  it("returns false for decimal", () => expect(hasMathOperators("3.14")).toBe(false));
});
