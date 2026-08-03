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
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-settings-heading">
            {t("settings.title", "Account Settings")}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settings.profile", "Profile")}
            </CardTitle>
            <CardDescription>{t("settings.your_info", "Edit your account information")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  aria-invalid={!form.firstName.trim()}
                  data-testid="input-first-name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  data-testid="input-last-name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+44 7700 900000"
                  aria-invalid={!phoneIsValid}
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Label htmlFor="city">Location</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(145px,0.9fr)] gap-2">
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="City"
                    data-testid="input-location-city"
                  />
                  <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryPickerOpen}
                        className="justify-between overflow-hidden px-3 font-normal"
                        data-testid="button-country-picker"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CountryFlag code={form.countryCode} className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                          <span className="truncate">
                            {form.countryCode ? getName(form.countryCode) : "Country"}
                          </span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  Country updates for common cities; you can still override it.
                </p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4 border-t pt-2 sm:col-span-2">
                <div className="min-w-0">
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 break-all text-sm font-medium" data-testid="text-profile-email">
                      {user?.email || "Not set"}
                    </p>
                    {user?.email && user.authMethod === "google" && (
                      <Badge className="text-[10px]">Verified</Badge>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <Label className="text-muted-foreground">Phone status</Label>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="break-all text-sm font-medium">{form.phone || "Not set"}</p>
                    {form.phone && user?.authMethod === "otp" && (
                      <Badge className="text-[10px]">Verified</Badge>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <Label className="text-muted-foreground">Account role</Label>
                  <p className="font-medium capitalize text-sm" data-testid="text-profile-role">{user?.role || "buyer"}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="min-h-5 text-sm" aria-live="polite">
                {validationMessage ? (
                  <span className="text-destructive">{validationMessage}</span>
                ) : showSavedStatus ? (
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Changes saved
                  </span>
                ) : null}
              </div>
              <Button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending || !isDirty || Boolean(validationMessage)}
                data-testid="button-save-profile"
              >
                {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {t("settings.security", "Security")}
              </CardTitle>
              <CardDescription className="mt-1">Password and two-factor authentication controls.</CardDescription>
            </div>
            <Badge className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-600">Coming soon</Badge>
          </CardHeader>
        </Card>

        <div className="flex items-center justify-between gap-4 border-t pt-5">
          <div>
            <p className="text-sm font-medium">Finished for now?</p>
            <p className="text-xs text-muted-foreground">Sign out securely from this device.</p>
          </div>
          <Button variant="outline" onClick={logout} data-testid="button-logout">
            <LogOut className="mr-2 h-4 w-4" />
            {t("nav.signout", "Sign out")}
          </Button>
        </div>
      </div>
    </div>
  );
}
