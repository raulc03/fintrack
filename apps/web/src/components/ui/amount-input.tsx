import * as React from "react";
import { useMemo, useCallback } from "react";
import { Input } from "./input";
import { evaluateMathExpression, hasMathOperators } from "@/lib/math-eval";
import { cn } from "@/lib/utils";

interface AmountInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

function AmountInput({ value, onChange, className, onKeyDown, onBlur, ...props }: AmountInputProps) {
  const hasOperators = useMemo(() => hasMathOperators(value), [value]);
  const preview = useMemo(() => hasOperators ? evaluateMathExpression(value) : null, [hasOperators, value]);

  const evaluate = () => {
    if (!hasOperators) return;
    const result = evaluateMathExpression(value);
    if (result !== null) {
      onChange(String(result));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") evaluate();
    onKeyDown?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    evaluate();
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow math-safe characters
    const filtered = e.target.value.replace(/[^0-9.+\-*/() ]/g, "");
    onChange(filtered);
  };

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(className)}
        {...props}
      />
      {preview !== null && (
        <span className="absolute -bottom-4 left-1 text-[10px] text-muted-foreground">
          = {preview}
        </span>
      )}
    </div>
  );
}

export { AmountInput };
