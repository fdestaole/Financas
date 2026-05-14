import { cn } from "@/lib/cn";

interface Props {
  name: string;
  email?: string;
  size?: number;
  className?: string;
}

const COLORS = [
  "#a78bfa", "#4ade80", "#22d3ee", "#fbbf24",
  "#fb923c", "#f472b6", "#818cf8", "#34d399",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, email, size = 32, className }: Props) {
  const seed = email ?? name;
  const bg = COLORS[hashString(seed) % COLORS.length];
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
