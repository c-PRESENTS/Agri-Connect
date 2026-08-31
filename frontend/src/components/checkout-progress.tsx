import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const checkoutSteps = [
  "Cart Details",
  "Delivery Details",
  "Payment Details",
  "Order Confirmation",
] as const;

export function CheckoutProgress({
  currentStep,
  compact = false,
}: {
  currentStep: 1 | 2 | 3 | 4;
  compact?: boolean;
}) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="flex w-full items-start">
        {checkoutSteps.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4;
          const completed =
            step < currentStep || (currentStep === 4 && step === currentStep);
          const active = step === currentStep && !completed;
          return (
            <li
              key={label}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
              aria-current={active ? "step" : undefined}
            >
              {index < checkoutSteps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-1/2 -translate-y-1/2 w-full rounded-full transition-colors",
                    compact ? "top-4 h-1" : "top-[22px] h-1.5 sm:top-[26px]",
                    step < currentStep ? "bg-amber-400" : "bg-border/60",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-3 bg-background text-sm font-black transition-all sm:h-13 sm:w-13 sm:text-base md:text-lg shadow-sm",
                  compact && "h-8 w-8 border-2 text-xs sm:h-8 sm:w-8 sm:text-xs md:text-sm",
                  completed && "border-primary bg-primary text-primary-foreground shadow-md",
                  active && "border-amber-500 bg-amber-400 text-black ring-4 ring-amber-400/25 shadow-md scale-105",
                  !completed && !active && "border-border/80 text-muted-foreground bg-muted/30",
                )}
              >
                {completed ? (
                  <Check
                    className={cn("h-5 w-5 sm:h-6 sm:w-6", compact && "h-4 w-4 sm:h-4 sm:w-4")}
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                ) : step}
              </span>
              <span
                className={cn(
                  "mt-2.5 max-w-28 text-xs font-black uppercase tracking-wider leading-tight sm:max-w-none sm:text-sm md:text-base",
                  compact && "mt-1.5 text-[9px] sm:text-[10px] md:text-xs",
                  active ? "text-amber-600 dark:text-amber-400" : completed ? "text-foreground font-black" : "text-muted-foreground font-bold",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
