import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const checkoutSteps = [
  "Cart Details",
  "Delivery Details",
  "Payment Details",
  "Order Confirmation",
] as const;

export function CheckoutProgress({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
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
                    "absolute left-1/2 top-[22px] sm:top-[26px] -translate-y-1/2 h-1.5 w-full rounded-full transition-colors",
                    step < currentStep ? "bg-amber-400" : "bg-border/60",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-3 bg-background text-sm font-black transition-all sm:h-13 sm:w-13 sm:text-base md:text-lg shadow-sm",
                  completed && "border-primary bg-primary text-primary-foreground shadow-md",
                  active && "border-amber-500 bg-amber-400 text-black ring-4 ring-amber-400/25 shadow-md scale-105",
                  !completed && !active && "border-border/80 text-muted-foreground bg-muted/30",
                )}
              >
                {completed ? <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={3} aria-hidden="true" /> : step}
              </span>
              <span
                className={cn(
                  "mt-2.5 max-w-28 text-xs font-black uppercase tracking-wider leading-tight sm:max-w-none sm:text-sm md:text-base",
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
