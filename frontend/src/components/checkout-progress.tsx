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
                    "absolute left-1/2 top-4 h-0.5 w-full",
                    step < currentStep ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background text-xs font-bold transition-colors sm:h-9 sm:w-9 sm:text-sm",
                  completed && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary ring-4 ring-primary/10",
                  !completed && !active && "border-border text-muted-foreground",
                )}
              >
                {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : step}
              </span>
              <span
                className={cn(
                  "mt-2 max-w-24 text-[10px] font-semibold leading-tight sm:max-w-none sm:text-xs md:text-sm",
                  active || completed ? "text-foreground" : "text-muted-foreground",
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
