import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function PhoneInput({ value, onChange, disabled, error }: PhoneInputProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="phone">Mobile Number</Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <Phone className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          id="phone"
          type="tel"
          placeholder="+44 7700 900000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="tel"
          required
          className="pl-10"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
