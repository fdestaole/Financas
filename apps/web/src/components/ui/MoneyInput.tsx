import { NumericFormat } from "react-number-format";

interface Props {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
}

export function MoneyInput({ value, onChange, placeholder }: Props) {
  return (
    <NumericFormat
      className="input"
      value={value ?? ""}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      prefix="R$ "
      allowNegative={false}
      placeholder={placeholder ?? "R$ 0,00"}
      onValueChange={(v) => onChange(v.floatValue ?? 0)}
    />
  );
}
