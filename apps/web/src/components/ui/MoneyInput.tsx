import { useEffect, useRef, useState } from "react";
import { NumericFormat } from "react-number-format";
import { CalculatorPopup } from "./CalculatorPopup";
import { FIELD_BASE } from "./Input";

interface Props {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
}

export function MoneyInput({ value, onChange, placeholder }: Props) {
  const [showCalc, setShowCalc] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowCalc(false);
      }
    };
    if (showCalc) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalc]);

  const numericValue = typeof value === "number" ? value : 0;

  return (
    <div ref={wrapperRef} className="relative">
      <NumericFormat
        className={FIELD_BASE}
        value={value ?? ""}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        prefix="R$ "
        allowNegative={false}
        placeholder={placeholder ?? "R$ 0,00"}
        onFocus={() => setShowCalc(true)}
        onValueChange={(v) => onChange(v.floatValue ?? 0)}
      />
      {showCalc && (
        <CalculatorPopup
          initialValue={numericValue}
          onConfirm={(v) => {
            onChange(v);
            setShowCalc(false);
          }}
          onClose={() => setShowCalc(false)}
        />
      )}
    </div>
  );
}
