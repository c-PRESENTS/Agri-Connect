import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, MapPin, Phone, Sprout, ShoppingCart, Check } from "lucide-react";

function deriveDisplayName(user: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null): string {
  if (!user) return "AgriConnect User";
  if (user.name) return user.name;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  return user.email || "AgriConnect User";
}

export function ProfileWizard() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"buyer" | "farmer">((user?.role as "buyer" | "farmer") || "buyer");
  const [name, setName] = useState(user?.name || deriveDisplayName(user));
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [avatar, setAvatar] = useState(user?.avatar || user?.profileImageUrl || "");
  const totalSteps = 4;

  if (!user || user.profileComplete) return null;

  const seed = user.id || user.email || "agriconnect";
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    try {
      await updateProfile.mutateAsync({
        role,
        name: name || deriveDisplayName(user),
        phone: phone || null,
        location: location || "Global",
        avatar: avatar || fallbackAvatar,
        profileComplete: true,
      });
      toast({ title: t("profile_wizard.profile_complete_title"), description: t("profile_wizard.profile_complete_description") });
    } catch {
      toast({ title: t("profile_wizard.error_title"), description: t("profile_wizard.error_description"), variant: "destructive" });
    }
  };

  const handleSkip = async () => {
    try {
      await updateProfile.mutateAsync({
        role,
        name: name || deriveDisplayName(user),
        location: location || "Global",
        avatar: avatar || fallbackAvatar,
        profileComplete: true,
      });
    } catch {
      toast({ title: t("profile_wizard.error_title"), description: t("profile_wizard.error_description"), variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" data-testid="modal-profile-wizard">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>{t("profile_wizard.title")}</CardTitle>
          <CardDescription>{t("profile_wizard.step_of", { step, total: totalSteps })}</CardDescription>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">{t("profile_wizard.i_am_a")}</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as "buyer" | "farmer")} className="grid grid-cols-2 gap-4">
                <Label
                  htmlFor="role-farmer"
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 cursor-pointer transition-colors ${role === "farmer" ? "border-primary bg-primary/5" : "border-muted"}`}
                >
                  <RadioGroupItem value="farmer" id="role-farmer" className="sr-only" />
                  <Sprout className="h-10 w-10 text-green-600" />
                  <span className="font-medium">{t("profile_wizard.farmer")}</span>
                  <span className="text-xs text-muted-foreground text-center">{t("profile_wizard.farmer_description")}</span>
                </Label>
                <Label
                  htmlFor="role-buyer"
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 cursor-pointer transition-colors ${role === "buyer" ? "border-primary bg-primary/5" : "border-muted"}`}
                >
                  <RadioGroupItem value="buyer" id="role-buyer" className="sr-only" />
                  <ShoppingCart className="h-10 w-10 text-blue-600" />
                  <span className="font-medium">{t("profile_wizard.buyer")}</span>
                  <span className="text-xs text-muted-foreground text-center">{t("profile_wizard.buyer_description")}</span>
                </Label>
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-name">{t("profile_wizard.full_name")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wizard-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("profile_wizard.full_name_placeholder")}
                    className="pl-10"
                    data-testid="input-wizard-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-phone">{t("profile_wizard.phone_number")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wizard-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("profile_wizard.phone_placeholder")}
                    className="pl-10"
                    data-testid="input-wizard-phone"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-location">{t("profile_wizard.location")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wizard-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t("profile_wizard.location_placeholder")}
                    className="pl-10"
                    data-testid="input-wizard-location"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-primary/20">
                  {avatar ? (
                    <img src={avatar} alt="Profile avatar preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="wizard-avatar">{t("profile_wizard.avatar_url")}</Label>
                  <Input
                    id="wizard-avatar"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder={t("profile_wizard.avatar_placeholder")}
                    data-testid="input-wizard-avatar"
                  />
                  <p className="text-xs text-muted-foreground">{t("profile_wizard.avatar_hint")}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">{t("profile_wizard.back_button")}</Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip} data-testid="button-wizard-skip">{t("profile_wizard.skip_button")}</Button>
            )}
            {step < totalSteps ? (
              <Button onClick={handleNext} data-testid="button-wizard-next">{t("profile_wizard.continue_button")}</Button>
            ) : (
              <Button onClick={handleComplete} disabled={updateProfile.isPending} data-testid="button-wizard-complete">
                {updateProfile.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {t("profile_wizard.complete_profile")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
