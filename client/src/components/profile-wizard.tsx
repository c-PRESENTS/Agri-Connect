import { useState } from "react";
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
      toast({ title: "Profile complete!", description: "Welcome to AgriConnect." });
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" data-testid="modal-profile-wizard">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>Step {step} of {totalSteps} — Help us personalize your experience</CardDescription>
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
              <Label className="text-base font-semibold">I am a...</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as "buyer" | "farmer")} className="grid grid-cols-2 gap-4">
                <Label
                  htmlFor="role-farmer"
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 cursor-pointer transition-colors ${role === "farmer" ? "border-primary bg-primary/5" : "border-muted"}`}
                >
                  <RadioGroupItem value="farmer" id="role-farmer" className="sr-only" />
                  <Sprout className="h-10 w-10 text-green-600" />
                  <span className="font-medium">Farmer</span>
                  <span className="text-xs text-muted-foreground text-center">I grow and sell produce</span>
                </Label>
                <Label
                  htmlFor="role-buyer"
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 cursor-pointer transition-colors ${role === "buyer" ? "border-primary bg-primary/5" : "border-muted"}`}
                >
                  <RadioGroupItem value="buyer" id="role-buyer" className="sr-only" />
                  <ShoppingCart className="h-10 w-10 text-blue-600" />
                  <span className="font-medium">Buyer</span>
                  <span className="text-xs text-muted-foreground text-center">I buy fresh produce</span>
                </Label>
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wizard-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-10"
                    data-testid="input-wizard-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wizard-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7XXX XXXXXX"
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
                <Label htmlFor="wizard-location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wizard-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Your city or area"
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
                    <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="wizard-avatar">Avatar URL</Label>
                  <Input
                    id="wizard-avatar"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    data-testid="input-wizard-avatar"
                  />
                  <p className="text-xs text-muted-foreground">Paste an image URL or leave blank for a generated avatar</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">Back</Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip} data-testid="button-wizard-skip">Skip</Button>
            )}
            {step < totalSteps ? (
              <Button onClick={handleNext} data-testid="button-wizard-next">Continue</Button>
            ) : (
              <Button onClick={handleComplete} disabled={updateProfile.isPending} data-testid="button-wizard-complete">
                {updateProfile.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Complete Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
