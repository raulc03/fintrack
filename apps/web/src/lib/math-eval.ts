const MAX_DEPTH = 10;

/**
 * Safely evaluate a math expression string.
 * Supports: +, -, *, /, parentheses, decimals.
 * Returns null for invalid expressions or division by zero.
 * No eval() or Function() — uses recursive descent parsing.
 */
export function evaluateMathExpression(expr: string): number | null {
  // Sanitize: only allow digits, dots, operators, parens, spaces
  const sanitized = expr.replace(/[^0-9.+\-*/() ]/g, "").trim();
  if (!sanitized) return null;

  let pos = 0;
  let depth = 0;

  function skipSpaces() {
    while (pos < sanitized.length && sanitized[pos] === " ") pos++;
  }

  function parseNumber(): number | null {
    skipSpaces();
    let start = pos;

    // Handle unary minus
    if (pos < sanitized.length && sanitized[pos] === "-") pos++;

    let hasDot = false;
    while (pos < sanitized.length && (sanitized[pos] >= "0" && sanitized[pos] <= "9" || sanitized[pos] === ".")) {
      if (sanitized[pos] === ".") {
        if (hasDot) return null; // double dot
        hasDot = true;
      }
      pos++;
    }

    if (pos === start || (pos === start + 1 && sanitized[start] === "-")) return null;

    const num = Number(sanitized.slice(start, pos));
    return isNaN(num) ? null : num;
  }

  function parsePrimary(): number | null {
    skipSpaces();

    if (pos < sanitized.length && sanitized[pos] === "(") {
      depth++;
      if (depth > MAX_DEPTH) return null;
      pos++; // skip '('
      const result = parseAddSub();
      skipSpaces();
      if (pos >= sanitized.length || sanitized[pos] !== ")") return null;
      pos++; // skip ')'
      depth--;
      return result;
    }

    return parseNumber();
  }

  function parseMulDiv(): number | null {
    let left = parsePrimary();
    if (left === null) return null;

    while (pos < sanitized.length) {
      skipSpaces();
      const op = sanitized[pos];
      if (op !== "*" && op !== "/") break;
      pos++;
      const right = parsePrimary();
      if (right === null) return null;

      if (op === "*") {
        left = left * right;
      } else {
        if (right === 0) return null; // division by zero
        left = left / right;
      }
    }

    return left;
  }

  function parseAddSub(): number | null {
    let left = parseMulDiv();
    if (left === null) return null;

    while (pos < sanitized.length) {
      skipSpaces();
      const op = sanitized[pos];
      if (op !== "+" && op !== "-") break;
      pos++;
      const right = parseMulDiv();
      if (right === null) return null;

      if (op === "+") {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  const result = parseAddSub();
  skipSpaces();

  // Must have consumed entire input
  if (pos !== sanitized.length) return null;

  if (result === null || !isFinite(result)) return null;

  // Round to 2 decimal places to avoid floating point issues
  return Math.round(result * 100) / 100;
}

/** Check if a string contains math operators (not just a plain number). */
export function hasMathOperators(expr: string): boolean {
  // Remove leading minus (unary), then check for operators
  const withoutLeadingMinus = expr.replace(/^\s*-/, "");
  return /[+\-*/]/.test(withoutLeadingMinus);
}
