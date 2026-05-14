import { useId } from "react";
import { cn } from "@/lib/cn";

interface Props {
  data: number[];
  color?: string;        // CSS color, default var(--color-accent)
  height?: number;
  width?: number;        // viewBox width — default 100, escala via CSS
  gradient?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = "var(--color-accent)",
  height = 28,
  width = 100,
  gradient = true,
  strokeWidth = 1.5,
  className,
}: Props) {
  const gradId = useId();
  if (data.length < 2) {
    return <div className={cn("w-full", className)} style={{ height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const padY = strokeWidth;
  const innerH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const path = `M${points.join(" L")}`;
  const area = `${path} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      {gradient && (
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {gradient && <path d={area} fill={`url(#${gradId})`} />}
      <path d={path} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </svg>
  );
}
