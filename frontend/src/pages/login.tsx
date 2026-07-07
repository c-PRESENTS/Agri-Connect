import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/auth/phone-input";
import { OtpInput } from "@/components/auth/otp-input";
import { GoogleButton } from "@/components/auth/google-button";
import { Leaf, ShieldCheck, Truck, Sprout, ArrowLeft, Check } from "lucide-react";

type AuthStep = "phone" | "otp" | "profile";

export default function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const {
    isAuthenticated, isLoading, sendOtp, verifyOtp, googleLogin, updateProfile, completeProfile,
  } = useAuth();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"farmer" | "buyer">("farmer");
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const googleClientIdRef = useRef<string>("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => { googleClientIdRef.current = cfg.googleClientId; })
      .catch(() => {});
  }, []);

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setPhoneError("Enter your mobile number");
      return;
    }
    setPhoneError("");
    try {
      await sendOtp.mutateAsync({ phone: phone.trim() });
      setStep("otp");
    } catch {
      setPhoneError("Failed to send OTP. Check your number and try again.");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter the full 6-digit code");
      return;
    }
    setOtpError("");
    try {
      const data = await verifyOtp.mutateAsync({ phone: phone.trim(), code: otp });
      if (data.isNewUser) {
        setStep("profile");
      }
    } catch {
      setOtpError("Invalid or expired OTP. Try again.");
    }
  };

  const handleGoogleLogin = useCallback(async () => {
    try {
      const { google } = window as any;
      if (!google?.accounts?.id) {
        console.warn("Google Identity Services not loaded");
        return;
      }
      const clientId = googleClientIdRef.current;
      if (!clientId) {
        setOtpError("Google sign-in is not configured yet.");
        return;
      }
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            const data = await googleLogin.mutateAsync({ credential: response.credential });
            if (data.isNewUser) {
              setStep("profile");
            }
          } catch {
            setOtpError("Google sign-in failed. Try again.");
          }
        },
      });
      google.accounts.id.prompt();
    } catch {
      setOtpError("Google sign-in failed. Try again.");
    }
  }, [googleLogin]);

  const handleCompleteProfile = async () => {
    try {
      await updateProfile.mutateAsync({ name: name.trim(), role });
      await completeProfile.mutateAsync();
      setLocation("/dashboard");
    } catch {
      // error handled by react query
    }
  };

  const otpSent = sendOtp.isSuccess;
  const isSubmitting = sendOtp.isPending || verifyOtp.isPending || googleLogin.isPending || updateProfile.isPending;

  if (step === "profile") {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row" data-testid="page-login">
        <div className="lg:w-1/2 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700 text-white p-5 sm:p-8 lg:p-16 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Leaf className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">AgriConnect</span>
          </div>
          <div className="space-y-6 my-12 lg:my-0">
            <h1 className="text-4xl lg:text-5xl font-serif leading-tight">One last step</h1>
            <p className="text-lg text-white/85 max-w-md">
              Tell us a bit about yourself so we can tailor the experience.
            </p>
          </div>
          <p className="text-sm text-white/70">© {new Date().getFullYear()} AgriConnect.</p>
        </div>
        <div className="lg:w-1/2 flex items-center justify-center p-5 sm:p-8 lg:p-16">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
              <CardDescription>Set your name and how you'll use the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Your Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("farmer")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      role === "farmer"
                        ? "border-green-600 bg-green-50 dark:bg-green-950"
                        : "border-border hover:border-green-300"
                    }`}
                  >
                    <Sprout className={`h-8 w-8 ${role === "farmer" ? "text-green-600" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">Farmer</span>
                    {role === "farmer" && <Check className="h-4 w-4 text-green-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("buyer")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      role === "buyer"
                        ? "border-green-600 bg-green-50 dark:bg-green-950"
                        : "border-border hover:border-green-300"
                    }`}
                  >
                    <ShieldCheck className={`h-8 w-8 ${role === "buyer" ? "text-green-600" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">Buyer</span>
                    {role === "buyer" && <Check className="h-4 w-4 text-green-600" />}
                  </button>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full text-base"
                onClick={handleCompleteProfile}
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? "Setting up..." : "Get Started"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" data-testid="page-login">
      {/* Brand panel */}
      <div className="lg:w-1/2 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700 text-white p-5 sm:p-8 lg:p-16 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Leaf className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">AgriConnect</span>
        </div>

        <div className="space-y-6 my-12 lg:my-0">
          <h1 className="text-4xl lg:text-5xl font-serif leading-tight">
            {t("login.hero_title", "Connecting farmers and buyers, directly.")}
          </h1>
          <p className="text-lg text-white/85 max-w-md">
            {t(
              "login.hero_subtitle",
              "Sign in to list produce, manage orders, and trade across the UK with full transparency.",
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg pt-4">
            <div className="flex items-start gap-2">
              <Sprout className="h-5 w-5 mt-0.5 shrink-0" />
              <span className="text-sm">{t("login.feature_marketplace", "Live marketplace")}</span>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="h-5 w-5 mt-0.5 shrink-0" />
              <span className="text-sm">{t("login.feature_logistics", "Smart logistics")}</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />
              <span className="text-sm">{t("login.feature_secure", "Secure sign-in")}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/70">
          © {new Date().getFullYear()} AgriConnect.
        </p>
      </div>

      {/* Auth panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-5 sm:p-8 lg:p-16">
        <Card className="w-full max-w-md shadow-lg">
          {step === "phone" && (
            <>
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl">{t("login.welcome", "Welcome back")}</CardTitle>
                <CardDescription>
                  Enter your mobile number to receive a one-time passcode.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PhoneInput
                  value={phone}
                  onChange={(v) => { setPhone(v); setPhoneError(""); }}
                  disabled={isSubmitting}
                  error={phoneError}
                />
                <Button
                  size="lg"
                  className="w-full text-base"
                  onClick={handleSendOtp}
                  disabled={!phone.trim() || isSubmitting}
                >
                  {sendOtp.isPending ? "Sending..." : "Send OTP via SMS"}
                </Button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">OR continue with</span>
                  </div>
                </div>
                <GoogleButton onClick={handleGoogleLogin} disabled={isSubmitting} loading={googleLogin.isPending} />
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {t(
                    "login.terms",
                    "By continuing you agree to our Terms of Service and Privacy Policy.",
                  )}
                </p>
              </CardContent>
            </>
          )}

          {step === "otp" && (
            <>
              <CardHeader className="space-y-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setStep("phone"); setOtp(""); setOtpError(""); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <CardTitle className="text-2xl">Verify OTP</CardTitle>
                </div>
                <CardDescription>
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <OtpInput
                  value={otp}
                  onChange={(v) => { setOtp(v); setOtpError(""); }}
                  disabled={isSubmitting}
                  error={otpError}
                />
                <Button
                  size="lg"
                  className="w-full text-base"
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || isSubmitting}
                >
                  {verifyOtp.isPending ? "Verifying..." : "Verify & Sign In"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendOtp.isPending}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    {sendOtp.isPending ? "Resending..." : "Resend OTP"}
                  </button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
