import { cn } from "@/lib/utils";

const urgencyConfig = {
  CRITIQUE: { label: "Critique", bg: "bg-red-500/10", text: "text-red-600", dot: "bg-red-500" },
  ELEVE: { label: "Élevé", bg: "bg-orange-500/10", text: "text-orange-600", dot: "bg-orange-500" },
  MODERE: { label: "Modéré", bg: "bg-yellow-500/10", text: "text-yellow-600", dot: "bg-yellow-500" },
  NORMAL: { label: "Normal", bg: "bg-green-500/10", text: "text-green-600", dot: "bg-green-500" },
};

export default function UrgencyBadge({ level, size = "sm" }) {
  const config = urgencyConfig[level] || urgencyConfig.NORMAL;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium",
      config.bg, config.text,
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}