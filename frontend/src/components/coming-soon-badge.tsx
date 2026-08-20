import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ComingSoonBadgeProps {
  className?: string;
}

export function ComingSoonBadge({ className }: ComingSoonBadgeProps = {}) {
  return (
    <Badge
      className={cn(
        "shrink-0 border-2 border-emerald-700/80 bg-emerald-600 px-4 py-2 sm:px-5 sm:py-2.5 text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-white shadow-md hover:bg-emerald-600 rounded-lg sm:rounded-xl",
        className
      )}
      aria-label="Coming soon"
    >
      Coming soon
    </Badge>
  );
}
