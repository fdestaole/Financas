import { useEffect, useState } from "react";
import { Delete } from "lucide-react";

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
    "h-10 w-full rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors select-none active:scale-95";
  const op = (active: boolean) =>
    `h-10 w-full rounded-lg text-sm font-medium transition-colors select-none active:scale-95 ${
      active
        ? "bg-brand-500 text-white"
        : "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
    }`;

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 w-52 dark:bg-slate-900 dark:border-slate-700"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Display */}
      <div className="w-full px-3 py-2 mb-2 bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <div className="text-xs text-slate-400 dark:text-slate-500 h-4 text-right">
          {accumulator !== null && operator
            ? `${String(accumulator).replace(".", ",")} ${operator}`
            : " "}
        </div>
        <div className="text-base font-mono text-right truncate text-slate-900 dark:text-slate-100">{display}</div>
      </div>

      {/* Grid 4 colunas */}
      <div className="grid grid-cols-4 gap-1">
        {/* Row 1 */}
        <button
          className="h-10 w-full rounded-lg text-sm font-medium bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-300 transition-colors select-none active:scale-95"
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
          className="h-10 col-span-2 w-full rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors select-none active:scale-95"
          onClick={() => handleDigit("0")}
        >0</button>
        <button className={num} onClick={() => handleDigit(",")}>,</button>
        <button
          className="h-10 w-full rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors select-none active:scale-95"
          onClick={handleEquals}
        >=</button>
      </div>
    </div>
  );
}
