import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { TopNavigation } from "@/components/top-navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  User,
  LogOut,
  ShieldCheck,
  Loader2,
  MapPin,
  Mail,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCode, getData, getName } from "country-list";
import * as CountryFlags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  countryCode: string;
};

const EMPTY_FORM: ProfileForm = {
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  countryCode: "",
};

const COUNTRIES = getData().sort((first, second) => first.name.localeCompare(second.name));
const COUNTRY_ALIASES: Record<string, string> = {
  uk: "GB",
  "u.k.": "GB",
  britain: "GB",
  "great britain": "GB",
  usa: "US",
  "u.s.a.": "US",
  america: "US",
  uae: "AE",
  "u.a.e.": "AE",
  emirates: "AE",
};
const CITY_COUNTRY_ALIASES: Record<string, string> = {
  amritsar: "IN",
  amsterdam: "NL",
  "abu dhabi": "AE",
  ahmedabad: "IN",
  auckland: "NZ",
  bangalore: "IN",
  bengaluru: "IN",
  berlin: "DE",
  birmingham: "GB",
  bristol: "GB",
  brisbane: "AU",
  cardiff: "GB",
  chennai: "IN",
  chicago: "US",
  delhi: "IN",
  dubai: "AE",
  dublin: "IE",
  edinburgh: "GB",
  glasgow: "GB",
  gurugram: "IN",
  gurgaon: "IN",
  hyderabad: "IN",
  jaipur: "IN",
  kolkata: "IN",
  london: "GB",
  "los angeles": "US",
  manchester: "GB",
  melbourne: "AU",
  montreal: "CA",
  mumbai: "IN",
  "new delhi": "IN",
  "new york": "US",
  noida: "IN",
  ottawa: "CA",
  pune: "IN",
  "san francisco": "US",
  singapore: "SG",
  sydney: "AU",
  toronto: "CA",
  vancouver: "CA",
  washington: "US",
  "washington dc": "US",
  "washington d.c.": "US",
};

function resolveCountryCode(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  return COUNTRY_ALIASES[normalizedValue] ?? getCode(value.trim()) ?? "";
}

function normalizeCityLookupKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(city|district|county|state|province|region)\b/g, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCountryCodeFromCity(value: string) {
  const normalizedCity = normalizeCityLookupKey(value);
  return CITY_COUNTRY_ALIASES[normalizedCity] ?? "";
}

function parseLocation(location: string) {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  const countryCandidate = parts.at(-1) ?? "";
  const countryCode = resolveCountryCode(countryCandidate);

  if (countryCode) {
    const city = parts.slice(0, -1).join(", ");
    return {
      city,
      countryCode: inferCountryCodeFromCity(city) || countryCode,
    };
  }

  return {
    city: location.trim(),
    countryCode: inferCountryCodeFromCity(location),
  };
}

function formatLocation(city: string, countryCode: string) {
  return [city.trim(), countryCode ? getName(countryCode) : ""].filter(Boolean).join(", ");
}

function CountryFlag({ code, className }: { code: string; className?: string }) {
  const Flag = CountryFlags[code as keyof typeof CountryFlags] as
    | ComponentType<SVGProps<SVGSVGElement>>
    | undefined;

  if (!Flag) return <MapPin className={className} aria-hidden="true" />;
  return <Flag className={className} aria-label={`${getName(code) ?? "Country"} flag`} />;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_FORM);
  const [showSavedStatus, setShowSavedStatus] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const parsedLocation = parseLocation(user.location ?? "");
      const nextForm = {
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phone: user.phone ?? "",
        city: parsedLocation.city,
        countryCode: parsedLocation.countryCode,
      };
      setForm(nextForm);
      const canonicalLocation = formatLocation(nextForm.city, nextForm.countryCode);
      setSavedForm(
        canonicalLocation === (user.location ?? "").trim()
          ? nextForm
          : { ...nextForm, countryCode: "" },
      );
    }
  }, [user]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setShowSavedStatus(false);
    setForm((current) => {
      if (field === "city") {
        const inferredCountryCode = inferCountryCodeFromCity(value);
        return {
          ...current,
          city: value,
          ...(inferredCountryCode ? { countryCode: inferredCountryCode } : {}),
        };
      }
      return { ...current, [field]: value };
    });
  };

  const isDirty = Object.keys(form).some(
    (key) => form[key as keyof ProfileForm] !== savedForm[key as keyof ProfileForm],
  );
  const phoneIsValid = !form.phone.trim() || /^\+?[0-9 ()-]{7,20}$/.test(form.phone.trim());
  const validationMessage = !form.firstName.trim()
    ? "First name is required."
    : !phoneIsValid
      ? "Enter a valid phone number."
      : "";

  const updateProfile = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/profile", {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        location: formatLocation(form.city, form.countryCode),
      });
      return res.json();
    },
    onSuccess: () => {
      setSavedForm(form);
      setShowSavedStatus(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" data-testid="button-back-dashboard">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight" data-testid="text-settings-heading">
            {t("settings.title", "Account Settings")}
          </h1>
        </div>

        <Card className="border-2 rounded-2xl shadow-lg">
          <CardHeader className="p-6 sm:p-8 pb-4 border-b border-border/40">
            <CardTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <User className="h-7 w-7 text-primary" />
              {t("settings.profile", "Profile")}
            </CardTitle>
            <CardDescription className="text-base font-bold text-foreground/70 mt-1">{t("settings.your_info", "Edit your account information")}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  aria-invalid={!form.firstName.trim()}
                  className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 px-4"
                  data-testid="input-first-name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 px-4"
                  data-testid="input-last-name"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+44 7700 900000"
                  aria-invalid={!phoneIsValid}
                  className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 px-4"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground mb-2 block">Location</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(160px,0.9fr)] gap-3">
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="City"
                    className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 px-4"
                    data-testid="input-location-city"
                  />
                  <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryPickerOpen}
                        className="h-13 justify-between overflow-hidden px-4 text-base font-black rounded-xl border-2"
                        data-testid="button-country-picker"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CountryFlag code={form.countryCode} className="h-5 w-7 shrink-0 rounded-md object-cover" />
                          <span className="truncate">
                            {form.countryCode ? getName(form.countryCode) : "Country"}
                          </span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[280px] p-0">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {COUNTRIES.map((country) => (
                              <CommandItem
                                key={country.code}
                                value={`${country.name} ${country.code}`}
                                onSelect={() => {
                                  updateField("countryCode", country.code);
                                  setCountryPickerOpen(false);
                                }}
                              >
                                <CountryFlag code={country.code} className="h-4 w-6 rounded-sm object-cover" />
                                <span className="flex-1">{country.name}</span>
                                <Check
                                  className={cn(
                                    "h-4 w-4",
                                    form.countryCode === country.code ? "opacity-100" : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  Country updates for common cities; you can still override it.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 border-t-2 border-border/40 pt-6 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(180px,0.85fr)]">
                <div className="flex min-h-28 min-w-0 flex-col justify-between overflow-hidden rounded-2xl border-2 border-border/80 bg-muted/30 p-4 shadow-xs sm:col-span-2 lg:col-span-1 lg:p-5">
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                    <Label className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground sm:text-sm">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">Email</span>
                    </Label>
                    {user?.email && (user.authMethod === "google" || user.email) && (
                      <Badge className="shrink-0 rounded-lg border-none bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-black shadow-2xs sm:text-xs">Verified</Badge>
                    )}
                  </div>
                  <p className="min-w-0 truncate text-sm font-bold text-foreground sm:text-base" title={user?.email || "Not set"} data-testid="text-profile-email">
                    {user?.email || "Not set"}
                  </p>
                </div>
                <div className="flex min-h-28 min-w-0 flex-col justify-between overflow-hidden rounded-2xl border-2 border-border/80 bg-muted/30 p-4 shadow-xs lg:p-5">
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                    <Label className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground sm:text-sm">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">Phone status</span>
                    </Label>
                    {form.phone && user?.authMethod === "otp" && (
                      <Badge className="shrink-0 rounded-lg border-none bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-black shadow-2xs sm:text-xs">Verified</Badge>
                    )}
                  </div>
                  <p className="min-w-0 truncate text-sm font-bold text-foreground sm:text-base" title={form.phone || "Not set"}>{form.phone || "Not set"}</p>
                </div>
                <div className="flex min-h-28 min-w-0 flex-col justify-between overflow-hidden rounded-2xl border-2 border-border/80 bg-muted/30 p-4 shadow-xs lg:p-5">
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                    <Label className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground sm:text-sm">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      <span className="whitespace-nowrap">Account role</span>
                    </Label>
                  </div>
                  <p className="truncate text-base font-black capitalize text-foreground sm:text-lg" data-testid="text-profile-role">{user?.role || "buyer"}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
              <div className="min-h-6 text-base font-bold" aria-live="polite">
                {validationMessage ? (
                  <span className="text-destructive font-black">{validationMessage}</span>
                ) : showSavedStatus ? (
                  <span className="flex items-center gap-2 text-emerald-700 font-black">
                    <CheckCircle2 className="h-5 w-5" />
                    Changes saved
                  </span>
                ) : null}
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
                <Button
                  variant="outline"
                  onClick={logout}
                  className="h-13 rounded-xl border-2 px-6 text-base font-black text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  {t("nav.signout", "Sign out")}
                </Button>
                <Button
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending || !isDirty || Boolean(validationMessage)}
                  className="h-13 px-8 text-base font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-lg rounded-xl"
                  data-testid="button-save-profile"
                >
                  {updateProfile.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-lg">
          <CardHeader className="p-6 sm:p-8 flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-primary" />
                {t("settings.security", "Security")}
              </CardTitle>
              <CardDescription className="text-base font-bold text-foreground/70 mt-1">Password and two-factor authentication controls.</CardDescription>
            </div>
            <Badge className="shrink-0 text-sm font-black px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-600 shadow-md">Coming soon</Badge>
          </CardHeader>
        </Card>

      </div>
    </div>
  );
}
