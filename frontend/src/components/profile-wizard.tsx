import { useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { prepareAvatarImage } from "@/lib/avatar-image-upload";
import { Loader2, User, MapPin, Phone, Sprout, ShoppingCart, Check, ImagePlus, Trash2 } from "lucide-react";

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
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"buyer" | "farmer">((user?.role as "buyer" | "farmer") || "buyer");
  const [name, setName] = useState(user?.name || deriveDisplayName(user));
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [avatar, setAvatar] = useState(user?.avatar || user?.profileImageUrl || "");
  const [uploadedAvatarName, setUploadedAvatarName] = useState("");
  const [isPreparingAvatar, setIsPreparingAvatar] = useState(false);
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

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsPreparingAvatar(true);
    try {
      const preparedAvatar = await prepareAvatarImage(file);
      setAvatar(preparedAvatar);
      setUploadedAvatarName(file.name);
    } catch (reason) {
      toast({
        title: t("profile_wizard.avatar_upload_error_title"),
        description: reason instanceof Error ? reason.message : t("profile_wizard.avatar_upload_error_description"),
        variant: "destructive",
      });
    } finally {
      setIsPreparingAvatar(false);
    }
  };

  const handleComplete = async () => {
    try {
      await updateProfile.mutateAsync({
        role,
        name: name || deriveDisplayName(user),
        phone: phone || null,
        location: location || null,
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
        location: location || null,
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
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    data-testid="input-wizard-avatar-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={isPreparingAvatar}
                    onClick={() => avatarFileRef.current?.click()}
                    data-testid="button-wizard-avatar-upload"
                  >
                    {isPreparingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {isPreparingAvatar
                      ? t("profile_wizard.preparing_photo")
                      : uploadedAvatarName
                        ? t("profile_wizard.replace_photo")
                        : t("profile_wizard.upload_photo")}
                  </Button>
                  {uploadedAvatarName && (
                    <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2" data-testid="wizard-avatar-upload-ready">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{uploadedAvatarName}</p>
                        <p className="text-xs text-emerald-700">{t("profile_wizard.photo_ready")}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("profile_wizard.remove_photo")}
                        onClick={() => {
                          setAvatar("");
                          setUploadedAvatarName("");
                        }}
                        data-testid="button-wizard-avatar-remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                    {t("profile_wizard.or_use_avatar_url")}
                  </div>
                  <Label htmlFor="wizard-avatar">{t("profile_wizard.avatar_url")}</Label>
                  <Input
                    id="wizard-avatar"
                    type="url"
                    value={uploadedAvatarName ? "" : avatar}
                    disabled={Boolean(uploadedAvatarName) || isPreparingAvatar}
                    onChange={(e) => {
                      setUploadedAvatarName("");
                      setAvatar(e.target.value);
                    }}
                    placeholder={t("profile_wizard.avatar_placeholder")}
                    data-testid="input-wizard-avatar"
                  />
                  <p className="text-xs text-muted-foreground">{t("profile_wizard.avatar_upload_hint")}</p>
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
              <Button onClick={handleComplete} disabled={updateProfile.isPending || isPreparingAvatar} data-testid="button-wizard-complete">
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
