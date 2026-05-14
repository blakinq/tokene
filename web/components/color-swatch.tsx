import { cn } from "@/lib/utils";

export function ColorSwatch({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-4 shrink-0 rounded-[3px] border border-border/80",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
        className,
      )}
      style={{ backgroundColor: value }}
    />
  );
}
