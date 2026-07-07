import { useEffect, useState, useCallback, useRef } from "react";
import type { TFunction } from "i18next";
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
import {
  ArrowLeft,
  Check,
  CloudSun,
  Globe2,
  Leaf,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sprout,
  Truck,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AuthStep = "phone" | "otp" | "profile";

const trustSignals = [
  { icon: Sprout, labelKey: "login.feature_marketplace", fallback: "Live marketplace" },
  { icon: Truck, labelKey: "login.feature_logistics", fallback: "Smart logistics" },
  { icon: ShieldCheck, labelKey: "login.feature_secure", fallback: "Secure sign-in" },
];

const fieldMetrics = [
  { value: "24/7", labelKey: "login.metric_visibility", fallback: "market visibility" },
  { value: "SMS", labelKey: "login.metric_access", fallback: "simple phone access" },
  { value: "1", labelKey: "login.metric_workspace", fallback: "connected workspace" },
];

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

  const isSubmitting = sendOtp.isPending || verifyOtp.isPending || googleLogin.isPending || updateProfile.isPending;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#f6f8f1] text-slate-950"
      data-testid="page-login"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(132,204,22,0.22),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(20,184,166,0.16),transparent_26%),linear-gradient(135deg,#f8fbf3_0%,#eef6e7_46%,#fbfaf2_100%)]" />
      <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-lime-200/30 blur-3xl" />
      <div className="absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <BrandPanel t={t} />

        <section className="flex min-h-[52rem] items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <Card className="w-full max-w-[31rem] overflow-hidden rounded-[2rem] border-white/80 bg-white/90 shadow-[0_28px_90px_rgba(20,83,45,0.18)] backdrop-blur-xl">
            <div className="h-1.5 bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-500" />
            {step === "profile" ? (
              <ProfileStep
                t={t}
                name={name}
                role={role}
                isSubmitting={isSubmitting}
                onNameChange={setName}
                onRoleChange={setRole}
                onCompleteProfile={handleCompleteProfile}
              />
            ) : step === "phone" ? (
              <PhoneStep
                t={t}
                phone={phone}
                phoneError={phoneError}
                isSubmitting={isSubmitting}
                sendOtpPending={sendOtp.isPending}
                googleLoginPending={googleLogin.isPending}
                onPhoneChange={(value) => { setPhone(value); setPhoneError(""); }}
                onSendOtp={handleSendOtp}
                onGoogleLogin={handleGoogleLogin}
              />
            ) : (
              <OtpStep
                t={t}
                phone={phone}
                otp={otp}
                otpError={otpError}
                isSubmitting={isSubmitting}
                sendOtpPending={sendOtp.isPending}
                verifyOtpPending={verifyOtp.isPending}
                onOtpChange={(value) => { setOtp(value); setOtpError(""); }}
                onVerifyOtp={handleVerifyOtp}
                onResendOtp={handleSendOtp}
                onBack={() => { setStep("phone"); setOtp(""); setOtpError(""); }}
              />
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function BrandPanel({ t }: { t: TFunction }) {
  return (
    <section className="relative flex min-h-[34rem] flex-col justify-between px-5 py-6 sm:px-8 lg:min-h-screen lg:px-12 lg:py-10">
      <div className="pointer-events-none absolute inset-x-5 top-6 h-[calc(100%-3rem)] rounded-[2rem] border border-white/50 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-[2px] lg:inset-x-8" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950 text-lime-200 shadow-xl shadow-emerald-900/20">
            <Leaf className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-emerald-950">AgriConnect</p>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800/70">
              {t("login.brand_kicker", "Farm trade OS")}
            </p>
          </div>
        </div>
        <div className="hidden rounded-full border border-emerald-900/10 bg-white/60 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm sm:block">
          {t("login.secure_badge", "Secure access")}
        </div>
      </div>

      <div className="relative z-10 my-12 max-w-2xl lg:my-0">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/60 px-3.5 py-2 text-sm font-semibold text-emerald-900 shadow-sm backdrop-blur">
          <CloudSun className="h-4 w-4 text-lime-700" />
          {t("login.onboarding_cue", "Built for daily farm operations")}
        </div>

        <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl">
          {t("login.hero_title", "Trade smarter from field to market.")}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-8 text-emerald-950/75 sm:text-lg">
          {t(
            "login.hero_subtitle",
            "Sign in to list produce, manage orders, coordinate logistics, and keep your farm network moving with confidence.",
          )}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {trustSignals.map(({ icon: Icon, labelKey, fallback }) => (
            <div
              key={labelKey}
              className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 p-3.5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/75"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-lime-200 shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold leading-snug text-emerald-950">
                {t(labelKey, fallback)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <FieldIllustration t={t} />
        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/60 bg-white/50 p-3 shadow-sm backdrop-blur lg:grid-cols-1">
          {fieldMetrics.map((metric) => (
            <div key={metric.labelKey} className="rounded-2xl bg-emerald-950 px-3 py-3 text-lime-50">
              <p className="text-xl font-black">{metric.value}</p>
              <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-lime-100/70">
                {t(metric.labelKey, metric.fallback)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="relative z-10 mt-8 text-xs font-semibold text-emerald-950/60">
        &copy; {new Date().getFullYear()} AgriConnect.
      </p>
    </section>
  );
}

function FieldIllustration({ t }: { t: TFunction }) {
  return (
    <div className="relative min-h-56 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-emerald-900 via-emerald-800 to-lime-700 p-5 text-white shadow-2xl shadow-emerald-950/20">
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[repeating-linear-gradient(150deg,rgba(217,249,157,0.42)_0_2px,transparent_2px_18px)] opacity-70" />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime-300/30 blur-2xl" />
      <div className="absolute bottom-8 left-5 right-5 h-20 rounded-[100%] border-t border-lime-100/30" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-950/70 to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-100/75">
            {t("login.field_card_label", "Today on the network")}
          </p>
          <p className="mt-3 max-w-[15rem] text-2xl font-black leading-tight">
            {t("login.field_card_title", "Fresh produce. Clear orders. Trusted delivery.")}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Wheat className="h-6 w-6 text-lime-100" />
        </div>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-3 gap-2 text-xs font-semibold">
        <div className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur">
          {t("login.field_card_crop", "Crop lots")}
        </div>
        <div className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur">
          {t("login.field_card_bids", "Buyer bids")}
        </div>
        <div className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur">
          {t("login.field_card_routes", "Routes")}
        </div>
      </div>
    </div>
  );
}

type PhoneStepProps = {
  t: TFunction;
  phone: string;
  phoneError: string;
  isSubmitting: boolean;
  sendOtpPending: boolean;
  googleLoginPending: boolean;
  onPhoneChange: (value: string) => void;
  onSendOtp: () => void;
  onGoogleLogin: () => void;
};

function PhoneStep({
  t,
  phone,
  phoneError,
  isSubmitting,
  sendOtpPending,
  googleLoginPending,
  onPhoneChange,
  onSendOtp,
  onGoogleLogin,
}: PhoneStepProps) {
  return (
    <>
      <CardHeader className="space-y-5 px-6 pt-8 text-left sm:px-8 sm:pt-9">
        <StepBadge icon={Smartphone} label={t("login.phone_step_badge", "Phone first, password never")} />
        <div>
          <CardTitle className="text-3xl font-black tracking-tight text-slate-950">
            {t("login.welcome", "Welcome back")}
          </CardTitle>
          <CardDescription className="mt-3 text-base leading-7 text-slate-600">
            {t(
              "login.phone_description",
              "Enter your mobile number and we will send a one-time code by SMS.",
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6 pb-8 sm:px-8 sm:pb-9">
        <PhoneInput
          value={phone}
          onChange={onPhoneChange}
          disabled={isSubmitting}
          error={phoneError}
          label={t("login.mobile_number", "Mobile Number")}
          placeholder={t("login.phone_placeholder", "+91 84336 79895")}
        />

        <Button
          size="lg"
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-600 text-base font-black text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-800 hover:to-lime-700 focus-visible:ring-4 focus-visible:ring-lime-300"
          onClick={onSendOtp}
          disabled={!phone.trim() || isSubmitting}
        >
          {sendOtpPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
              {t("login.sending", "Sending...")}
            </span>
          ) : (
            t("login.send_otp", "Send OTP via SMS")
          )}
        </Button>

        <Divider label={t("login.or_continue_with", "OR continue with")} />

        <GoogleButton
          onClick={onGoogleLogin}
          disabled={isSubmitting}
          loading={googleLoginPending}
          label={t("login.google_sign_in", "Sign in with Google")}
        />

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <p className="text-sm leading-6 text-emerald-950/75">
              {t(
                "login.security_note",
                "Your code is single-use and expires quickly, keeping farm and buyer accounts protected.",
              )}
            </p>
          </div>
        </div>

        <p className="text-center text-xs leading-6 text-slate-500">
          {t(
            "login.terms",
            "By continuing you agree to our Terms of Service and Privacy Policy.",
          )}
        </p>
      </CardContent>
    </>
  );
}

type OtpStepProps = {
  t: TFunction;
  phone: string;
  otp: string;
  otpError: string;
  isSubmitting: boolean;
  sendOtpPending: boolean;
  verifyOtpPending: boolean;
  onOtpChange: (value: string) => void;
  onVerifyOtp: () => void;
  onResendOtp: () => void;
  onBack: () => void;
};

function OtpStep({
  t,
  phone,
  otp,
  otpError,
  isSubmitting,
  sendOtpPending,
  verifyOtpPending,
  onOtpChange,
  onVerifyOtp,
  onResendOtp,
  onBack,
}: OtpStepProps) {
  return (
    <>
      <CardHeader className="space-y-5 px-6 pt-8 text-left sm:px-8 sm:pt-9">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200"
          aria-label={t("login.back_to_phone", "Back to phone number")}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("login.back", "Back")}
        </button>
        <div>
          <CardTitle className="text-3xl font-black tracking-tight text-slate-950">
            {t("login.verify_otp", "Verify OTP")}
          </CardTitle>
          <CardDescription className="mt-3 text-base leading-7 text-slate-600">
            {t("login.otp_description", "Enter the 6-digit code sent to")}{" "}
            <span className="font-bold text-emerald-800">{phone}</span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6 pb-8 sm:px-8 sm:pb-9">
        <OtpInput
          value={otp}
          onChange={onOtpChange}
          disabled={isSubmitting}
          error={otpError}
        />

        <Button
          size="lg"
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-600 text-base font-black text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-800 hover:to-lime-700 focus-visible:ring-4 focus-visible:ring-lime-300"
          onClick={onVerifyOtp}
          disabled={otp.length !== 6 || isSubmitting}
        >
          {verifyOtpPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
              {t("login.verifying", "Verifying...")}
            </span>
          ) : (
            t("login.verify_sign_in", "Verify and Sign In")
          )}
        </Button>

        <div className="rounded-2xl border border-lime-100 bg-lime-50/70 p-4 text-center">
          <p className="text-sm text-slate-600">
            {t("login.did_not_receive", "Did not receive the code?")}
          </p>
          <button
            type="button"
            onClick={onResendOtp}
            disabled={sendOtpPending}
            className="mt-1 text-sm font-black text-emerald-700 transition hover:text-emerald-900 hover:underline disabled:opacity-50"
          >
            {sendOtpPending ? t("login.resending", "Resending...") : t("login.resend_otp", "Resend OTP")}
          </button>
        </div>
      </CardContent>
    </>
  );
}

type ProfileStepProps = {
  t: TFunction;
  name: string;
  role: "farmer" | "buyer";
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onRoleChange: (role: "farmer" | "buyer") => void;
  onCompleteProfile: () => void;
};

function ProfileStep({
  t,
  name,
  role,
  isSubmitting,
  onNameChange,
  onRoleChange,
  onCompleteProfile,
}: ProfileStepProps) {
  return (
    <>
      <CardHeader className="space-y-5 px-6 pt-8 text-left sm:px-8 sm:pt-9">
        <StepBadge icon={Globe2} label={t("login.profile_step_badge", "Personalize your workspace")} />
        <div>
          <CardTitle className="text-3xl font-black tracking-tight text-slate-950">
            {t("login.complete_profile", "Complete Your Profile")}
          </CardTitle>
          <CardDescription className="mt-3 text-base leading-7 text-slate-600">
            {t("login.profile_description", "Set your name and choose how you will use AgriConnect.")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6 pb-8 sm:px-8 sm:pb-9">
        <div className="space-y-2">
          <Label htmlFor="profile-name" className="text-sm font-black text-slate-800">
            {t("login.profile_name", "Your Name")}
          </Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="name"
            required
            className="h-14 rounded-2xl border-emerald-100 bg-emerald-50/50 px-4 text-base font-semibold shadow-inner shadow-emerald-900/5 transition placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-lime-200"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-black text-slate-800">
            {t("login.role_label", "I am a...")}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <RoleButton
              active={role === "farmer"}
              icon={Sprout}
              label={t("login.role_farmer", "Farmer")}
              onClick={() => onRoleChange("farmer")}
            />
            <RoleButton
              active={role === "buyer"}
              icon={ShieldCheck}
              label={t("login.role_buyer", "Buyer")}
              onClick={() => onRoleChange("buyer")}
            />
          </div>
        </div>

        <Button
          size="lg"
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-600 text-base font-black text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-800 hover:to-lime-700 focus-visible:ring-4 focus-visible:ring-lime-300"
          onClick={onCompleteProfile}
          disabled={!name.trim() || isSubmitting}
        >
          {isSubmitting ? t("login.setting_up", "Setting up...") : t("login.get_started", "Get Started")}
        </Button>
      </CardContent>
    </>
  );
}

function StepBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-sm font-black text-emerald-800">
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs font-black uppercase tracking-[0.2em]">
        <span className="bg-white px-3 text-slate-400">{label}</span>
      </div>
    </div>
  );
}

function RoleButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border-2 p-4 text-center transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200 ${
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-800/10"
          : "border-slate-200 bg-white text-slate-600 shadow-sm hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-800"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
          active ? "bg-emerald-700 text-lime-100" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-50"
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-sm font-black">{label}</span>
      {active && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-lime-400 text-emerald-950">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
