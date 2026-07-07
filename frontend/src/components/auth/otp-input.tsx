import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function OtpInput({ value, onChange, disabled, error }: OtpInputProps) {
  return (
    <div className="space-y-3">
      <OTPInput
        value={value}
        onChange={onChange}
        maxLength={6}
        disabled={disabled}
        containerClassName="flex items-center gap-2 justify-center"
        render={({ slots }) => (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {slots.slice(0, 3).map((slot, idx) => (
                <Slot key={idx} {...slot} />
              ))}
            </div>
            <div className="flex items-center gap-1 text-lg font-black text-emerald-700">-</div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {slots.slice(3, 6).map((slot, idx) => (
                <Slot key={idx + 3} {...slot} />
              ))}
            </div>
          </>
        )}
      />
      {error && <p className="text-center text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function Slot(props: { char?: string | null; hasFakeCaret: boolean; isActive: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-14 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50/60 text-lg font-black text-emerald-950 shadow-inner shadow-emerald-900/5 transition-all sm:w-12",
        props.isActive && "z-10 border-emerald-400 bg-white ring-4 ring-lime-200",
      )}
    >
      {props.char || ""}
      {props.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}
