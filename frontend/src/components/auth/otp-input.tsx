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
    <div className="space-y-2">
      <OTPInput
        value={value}
        onChange={onChange}
        maxLength={6}
        disabled={disabled}
        containerClassName="flex items-center gap-2 justify-center"
        render={({ slots }) => (
          <>
            <div className="flex items-center gap-2">
              {slots.slice(0, 3).map((slot, idx) => (
                <Slot key={idx} {...slot} />
              ))}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-lg font-bold">-</div>
            <div className="flex items-center gap-2">
              {slots.slice(3, 6).map((slot, idx) => (
                <Slot key={idx + 3} {...slot} />
              ))}
            </div>
          </>
        )}
      />
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}

function Slot(props: { char?: string | null; hasFakeCaret: boolean; isActive: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-14 w-12 items-center justify-center border-y border-r border-input text-lg font-semibold transition-all",
        "first:rounded-l-md first:border-l last:rounded-r-md",
        props.isActive && "z-10 ring-2 ring-ring ring-offset-2 ring-offset-background",
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
