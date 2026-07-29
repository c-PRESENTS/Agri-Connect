import { Badge } from "@/components/ui/badge";

export function ComingSoonBadge() {
  return (
    <Badge
      className="shrink-0 border border-emerald-700 bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm hover:bg-emerald-600"
      aria-label="Coming soon"
    >
      Coming soon
    </Badge>
  );
}
