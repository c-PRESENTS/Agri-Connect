import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChange,
  disabled,
  error,
  label = "Mobile Number",
  placeholder = "+91 84336 79895",
}: PhoneInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="phone" className="text-sm font-black text-slate-800">{label}</Label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Phone className="h-4 w-4" />
        </div>
        <Input
          id="phone"
          type="tel"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="tel"
          required
          className="h-14 rounded-2xl border-emerald-100 bg-emerald-50/50 pl-16 pr-4 text-base font-semibold shadow-inner shadow-emerald-900/5 transition placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-lime-200"
        />
      </div>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}
