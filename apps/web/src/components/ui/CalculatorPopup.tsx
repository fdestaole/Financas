import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  initialValue: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

type Operator = "+" | "-" | "*" | "/";

function parseDisplay(display: string): number {
  return parseFloat(display.replace(",", ".")) || 0;
}

function compute(acc: number, op: Operator, current: number): number {
  switch (op) {
    case "+": return acc + current;
    case "-": return acc - current;
    case "*": return acc * current;
    case "/": return current !== 0 ? acc / current : acc;
  }
}

export function CalculatorPopup({ initialValue, onConfirm, onClose }: Props) {
  const initDisplay =
    initialValue !== 0 ? String(initialValue).replace(".", ",") : "0";

  const [display, setDisplay] = useState(initDisplay);
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingOperand, setWaitingOperand] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  function handleDigit(digit: string) {
    if (waitingOperand) {
      setDisplay(digit === "," ? "0," : digit);
      setWaitingOperand(false);
      return;
    }
    if (digit === ",") {
      if (!display.includes(",")) setDisplay(display + ",");
      return;
    }
    setDisplay(display === "0" ? digit : display + digit);
  }

  function handleOperator(op: Operator) {
    const current = parseDisplay(display);
    if (accumulator !== null && operator && !waitingOperand) {
      const result = compute(accumulator, operator, current);
      setAccumulator(result);
      setDisplay(String(result).replace(".", ","));
    } else {
      setAccumulator(current);
    }
    setOperator(op);
    setWaitingOperand(true);
  }

  function handleEquals() {
    const current = parseDisplay(display);
    let result = current;
    if (accumulator !== null && operator) {
      result = compute(accumulator, operator, current);
    }
    result = Math.round(result * 100) / 100;
    onConfirm(result);
  }

  function handleClear() {
    setDisplay("0");
    setAccumulator(null);
    setOperator(null);
    setWaitingOperand(false);
  }

  function handleBackspace() {
    if (waitingOperand) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  }

  function handlePercent() {
    const value = parseDisplay(display);
    setDisplay(String(Math.round(value) / 100).replace(".", ","));
    setWaitingOperand(false);
  }

  function isActiveOp(op: Operator) {
    return operator === op && waitingOperand;
  }

  const num =
    "h-10 w-full rounded-md text-sm font-medium bg-surface-2 hover:bg-border text-text transition-colors select-none active:scale-95";
  const op = (active: boolean) =>
    cn(
      "h-10 w-full rounded-md text-sm font-medium transition-colors select-none active:scale-95",
      active ? "bg-accent text-white" : "bg-surface-2 hover:bg-border text-text-2",
    );

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 bg-surface rounded-xl shadow-modal border border-border p-2 w-52"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Display */}
      <div className="w-full px-3 py-2 mb-2 bg-surface-2 rounded-md border border-border">
        <div className="text-xs text-text-3 h-4 text-right">
          {accumulator !== null && operator
            ? `${String(accumulator).replace(".", ",")} ${operator}`
            : " "}
        </div>
        <div className="text-base font-mono text-right truncate text-text">{display}</div>
      </div>

      {/* Grid 4 colunas */}
      <div className="grid grid-cols-4 gap-1">
        {/* Row 1 */}
        <button
          className="h-10 w-full rounded-md text-sm font-medium bg-neg/10 hover:bg-neg/20 text-neg transition-colors select-none active:scale-95"
          onClick={handleClear}
        >C</button>
        <button className={op(false)} onClick={handleBackspace}>
          <Delete size={14} className="mx-auto" />
        </button>
        <button className={op(false)} onClick={handlePercent}>%</button>
        <button className={op(isActiveOp("/"))} onClick={() => handleOperator("/")}>÷</button>

        {/* Row 2 */}
        <button className={num} onClick={() => handleDigit("7")}>7</button>
        <button className={num} onClick={() => handleDigit("8")}>8</button>
        <button className={num} onClick={() => handleDigit("9")}>9</button>
        <button className={op(isActiveOp("*"))} onClick={() => handleOperator("*")}>×</button>

        {/* Row 3 */}
        <button className={num} onClick={() => handleDigit("4")}>4</button>
        <button className={num} onClick={() => handleDigit("5")}>5</button>
        <button className={num} onClick={() => handleDigit("6")}>6</button>
        <button className={op(isActiveOp("-"))} onClick={() => handleOperator("-")}>−</button>

        {/* Row 4 */}
        <button className={num} onClick={() => handleDigit("1")}>1</button>
        <button className={num} onClick={() => handleDigit("2")}>2</button>
        <button className={num} onClick={() => handleDigit("3")}>3</button>
        <button className={op(isActiveOp("+"))} onClick={() => handleOperator("+")}>+</button>

        {/* Row 5 — 0 ocupa 2 colunas, , e = ocupam 1 cada */}
        <button
          className="h-10 col-span-2 w-full rounded-md text-sm font-medium bg-surface-2 hover:bg-border text-text transition-colors select-none active:scale-95"
          onClick={() => handleDigit("0")}
        >0</button>
        <button className={num} onClick={() => handleDigit(",")}>,</button>
        <button
          className="h-10 w-full rounded-md text-sm font-medium bg-accent text-white shadow-glow transition-colors select-none active:scale-95"
          onClick={handleEquals}
        >=</button>
      </div>
    </div>
  );
}
