import { useEffect, useState, useCallback, useRef, type RefObject } from "react";
import type { TFunction } from "i18next";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { getSafeReturnPath } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/auth/phone-input";
import { OtpInput } from "@/components/auth/otp-input";
import farmerImage from "@/assets/AgriConnect Images/stock_images/Farmer Image.png";
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
import { SiApple } from "react-icons/si";

type AuthStep = "phone" | "otp" | "profile";

const trustSignals = [
  { icon: Sprout, labelKey: "login.feature_marketplace", fallback: "Live Marketplace" },
  { icon: Truck, labelKey: "login.feature_logistics", fallback: "Smart Logistics" },
  { icon: ShieldCheck, labelKey: "login.feature_secure", fallback: "Secure & Simple" },
];

const fieldMetrics = [
  { value: "120+", labelKey: "login.metric_visibility", fallback: "Active buyers" },
  { value: "2.4K", labelKey: "login.metric_access", fallback: "Orders today" },
  { value: "15", labelKey: "login.metric_workspace", fallback: "Crops traded" },
];

let initializedGoogleClientId = "";
let activeGoogleCredentialHandler: (response: { credential?: string }) => void = () => undefined;

export default function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const search = useSearch();
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
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);
  const googleButtonRenderedRef = useRef(false);
  const [googleClientId, setGoogleClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || "");
  const [googleStatusMessage, setGoogleStatusMessage] = useState("");
  const returnPath = getSafeReturnPath(new URLSearchParams(search).get("returnTo"));

  useEffect(() => {
    if (!isLoading && isAuthenticated && step !== "profile") {
      setLocation(returnPath);
    }
  }, [isAuthenticated, isLoading, returnPath, setLocation, step]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        const clientId = cfg.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
        setGoogleClientId(clientId);
      })
      .catch(() => {});
  }, []);

  const handleGoogleCredential = useCallback(async (response: { credential?: string }) => {
    if (!response.credential) {
      setOtpError("Google sign-in failed. Try again.");
      return;
    }

    try {
      const data = await googleLogin.mutateAsync({ credential: response.credential });
      if (data.isNewUser) {
        setStep("profile");
      }
    } catch {
      setOtpError("Google sign-in failed. Try again.");
    }
  }, [googleLogin]);

  useEffect(() => {
    activeGoogleCredentialHandler = handleGoogleCredential;
  }, [handleGoogleCredential]);

  useEffect(() => {
    if (step !== "phone") {
      setGoogleStatusMessage("");
      return;
    }

    if (!googleClientId) {
      setGoogleStatusMessage("");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    const renderGoogleButton = () => {
      const { google } = window as any;
      const container = googleButtonContainerRef.current;
      if (!google?.accounts?.id || !container) return false;

      try {
        // Google Identity Services keeps one page-global callback. Reinitialize
        // on each fresh login-page mount so a prior student-login visit cannot
        // leave its callback active for the marketplace button.
        if (!googleButtonRenderedRef.current || initializedGoogleClientId !== googleClientId) {
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response: { credential?: string }) => activeGoogleCredentialHandler(response),
            ux_mode: "popup",
            cancel_on_tap_outside: false,
          });
          initializedGoogleClientId = googleClientId;
        }

        if (!googleButtonRenderedRef.current) {
          container.replaceChildren();
          google.accounts.id.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "signin_with",
            logo_alignment: "left",
            width: Math.max(280, Math.min(420, container.offsetWidth || 360)),
          });
          googleButtonRenderedRef.current = true;
        }
      } catch {
        setGoogleStatusMessage("Google sign-in could not load. Check your Google OAuth origin setup.");
        return false;
      }

      if (!cancelled) setGoogleStatusMessage("");
      return true;
    };

    setGoogleStatusMessage("Loading Google sign-in...");
    if (renderGoogleButton()) return;

    timer = setInterval(() => {
      attempts += 1;
      if (renderGoogleButton() || attempts >= 20) {
        if (timer) clearInterval(timer);
      }
    }, 250);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [googleClientId, step]);

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

  const handleCompleteProfile = async () => {
    try {
      await updateProfile.mutateAsync({ name: name.trim(), role });
      await completeProfile.mutateAsync();
      setLocation(returnPath);
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

      <div className="relative mx-auto flex min-h-screen w-full max-w-[92rem] items-center px-3 py-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[2rem] border border-white/75 bg-white/45 shadow-[0_32px_110px_rgba(20,83,45,0.18)] backdrop-blur-md sm:rounded-[2.5rem] lg:grid-cols-[1.05fr_0.95fr]">
          <BrandPanel t={t} />

          <section className="flex min-h-[42rem] items-center justify-center bg-white/70 px-4 py-8 sm:px-6 lg:px-10">
            <Card className="relative w-full max-w-[32rem] overflow-hidden rounded-[2rem] border border-white/[0.85] bg-white/95 shadow-[0_28px_80px_rgba(8,47,32,0.16)] backdrop-blur-xl sm:rounded-[2.25rem]">
              <div className="pointer-events-none absolute -right-8 top-6 h-28 w-28 rotate-12 text-lime-500/25">
                <Leaf className="h-full w-full" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-50/70 to-transparent" />
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
                  googleButtonContainerRef={googleButtonContainerRef}
                  googleStatusMessage={googleStatusMessage}
                  onPhoneChange={(value) => { setPhone(value); setPhoneError(""); }}
                  onSendOtp={handleSendOtp}
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
      </div>
    </main>
  );
}

function BrandPanel({ t }: { t: TFunction }) {
  return (
    <section className="relative flex min-h-[38rem] flex-col justify-between overflow-hidden px-5 py-6 sm:px-8 lg:min-h-[calc(100vh-2rem)] lg:px-12 lg:py-10 xl:px-16">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: `url(${farmerImage})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#f8f3df]/[0.94] via-[#f6efd8]/[0.78] to-emerald-950/[0.28]" />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/[0.58] via-transparent to-white/[0.16]" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-emerald-950/20 to-transparent" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950 text-lime-200 shadow-2xl shadow-emerald-950/30">
            <Leaf className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-emerald-950">AgriConnect</p>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              {t("login.brand_kicker", "Farm trade OS")}
            </p>
          </div>
        </div>
        <div className="hidden rounded-full border border-white/[0.65] bg-white/[0.55] px-4 py-2 text-sm font-black text-emerald-950 shadow-sm backdrop-blur-md sm:block">
          {t("login.secure_badge", "Secure access")}
        </div>
      </div>

      <div className="relative z-10 my-12 max-w-2xl lg:my-0">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.65] bg-white/[0.55] px-4 py-2.5 text-sm font-black text-emerald-950 shadow-sm backdrop-blur-md">
          <CloudSun className="h-4 w-4 text-lime-700" />
          {t("login.onboarding_cue", "Built for every farmer, every day")}
        </div>

        <h1 className="max-w-xl text-4xl font-black leading-[1.04] tracking-tight text-emerald-950 drop-shadow-sm sm:text-5xl lg:text-6xl">
          {t("login.hero_title", "Trade smarter from field to market.")}
        </h1>
        <p className="mt-5 max-w-lg text-base font-medium leading-8 text-slate-700 sm:text-lg">
          {t(
            "login.hero_subtitle",
            "Connect with buyers, manage orders, access real-time prices, and grow your farm business with confidence.",
          )}
        </p>

        <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
          {trustSignals.map(({ icon: Icon, labelKey, fallback }) => (
            <div
              key={labelKey}
              className="group flex items-center gap-3 rounded-2xl border border-white/[0.5] bg-white/[0.48] p-3.5 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.62]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-lime-200 shadow-lg shadow-emerald-950/20">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-black leading-snug text-emerald-950">
                  {t(labelKey, fallback)}
                </span>
                <span className="mt-1 block text-xs font-semibold text-slate-700">
                  {labelKey === "login.feature_marketplace"
                    ? t("login.feature_marketplace_hint", "Reach trusted buyers")
                    : labelKey === "login.feature_logistics"
                      ? t("login.feature_logistics_hint", "Fast & reliable delivery")
                      : t("login.feature_secure_hint", "Your data, always protected")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-[34rem]">
        <FieldIllustration t={t} />
      </div>

      <p className="relative z-10 mt-6 text-xs font-bold text-white/70 drop-shadow">
        &copy; {new Date().getFullYear()} AgriConnect.
      </p>
    </section>
  );
}

function FieldIllustration({ t }: { t: TFunction }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-lime-300/[0.18] bg-emerald-950/[0.9] p-4 text-white shadow-2xl shadow-emerald-950/[0.28] backdrop-blur-md sm:p-5">
      <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-lime-300/[0.14] blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-lime-500/12 to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-lime-200/75">
            <Leaf className="h-3.5 w-3.5" />
            {t("login.field_card_label", "Today on the network")}
          </p>
          <p className="mt-3 text-2xl font-black leading-tight">
            {t("login.field_card_title", "Good morning, farmer!")}
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-lime-50/[0.85]">
            <span className="h-2.5 w-2.5 rounded-full bg-lime-400 shadow-[0_0_18px_rgba(163,230,53,0.7)]" />
            {t("login.field_card_activity", "Market is active in 12 districts")}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-3 gap-2.5">
        {fieldMetrics.map((metric, index) => {
          const icons = [ShieldCheck, Globe2, Sprout];
          const MetricIcon = icons[index] ?? Wheat;

          return (
            <div
              key={metric.labelKey}
              className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm backdrop-blur"
            >
              <MetricIcon className="h-5 w-5 text-lime-300" />
              <p className="mt-3 text-lg font-black text-white">{metric.value}</p>
              <p className="mt-1 text-[0.7rem] font-semibold leading-snug text-lime-50/75">
                {t(metric.labelKey, metric.fallback)}
              </p>
            </div>
          );
        })}
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
  googleButtonContainerRef: RefObject<HTMLDivElement>;
  googleStatusMessage: string;
  onPhoneChange: (value: string) => void;
  onSendOtp: () => void;
};

function PhoneStep({
  t,
  phone,
  phoneError,
  isSubmitting,
  sendOtpPending,
  googleButtonContainerRef,
  googleStatusMessage,
  onPhoneChange,
  onSendOtp,
}: PhoneStepProps) {
  return (
    <>
      <CardHeader className="relative z-10 space-y-7 px-6 pt-9 text-left sm:px-10 sm:pt-11">
        <StepBadge icon={Smartphone} label={t("login.phone_step_badge", "Phone first, password never")} />
        <div>
          <CardTitle className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
            {t("login.welcome", "Welcome back")}
          </CardTitle>
          <CardDescription className="mt-4 max-w-sm text-base font-medium leading-8 text-slate-600">
            {t(
              "login.phone_description",
              "Enter your mobile number and we will send a one-time code by SMS.",
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6 px-6 pb-9 sm:px-10 sm:pb-11">
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
          className="h-16 w-full rounded-2xl bg-[#2f9136] text-base font-black text-white shadow-[0_18px_34px_rgba(47,145,54,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#267c2e] focus-visible:ring-4 focus-visible:ring-lime-300"
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

        <div className="relative min-h-14">
          <div
            ref={googleButtonContainerRef}
            className="flex min-h-14 w-full items-center justify-center [&>div]:mx-auto"
            aria-label={t("login.google_sign_in", "Sign in with Google")}
          />
          {googleStatusMessage && (
            <p className="mt-2 text-center text-xs font-semibold text-slate-500">
              {googleStatusMessage}
            </p>
          )}
        </div>

        <a href="/student/login" className="block text-center text-sm font-semibold text-emerald-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          Student login
        </a>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 w-full rounded-full border-slate-300 bg-white text-base font-bold text-slate-950 shadow-sm opacity-90"
          disabled
          aria-label={t("login.apple_sign_in_coming_soon")}
          title={t("login.apple_sign_in_coming_soon")}
        >
          <SiApple className="mr-3 h-5 w-5" />
          {t("login.apple_sign_in")}
        </Button>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-lime-50/70 p-5">
          <div className="flex gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <p className="text-sm font-medium leading-6 text-emerald-950/75">
              {t(
                "login.security_note",
                "Your code is single-use and expires quickly, keeping farm and buyer accounts protected.",
              )}
            </p>
          </div>
        </div>

        <p className="px-4 text-center text-xs leading-6 text-slate-500">
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
      <CardHeader className="relative z-10 space-y-6 px-6 pt-9 text-left sm:px-10 sm:pt-11">
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
          <CardTitle className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
            {t("login.verify_otp", "Verify OTP")}
          </CardTitle>
          <CardDescription className="mt-4 text-base font-medium leading-8 text-slate-600">
            {t("login.otp_description", "Enter the 6-digit code sent to")}{" "}
            <span className="font-bold text-emerald-800">{phone}</span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6 px-6 pb-9 sm:px-10 sm:pb-11">
        <OtpInput
          value={otp}
          onChange={onOtpChange}
          disabled={isSubmitting}
          error={otpError}
        />

        <Button
          size="lg"
          className="h-16 w-full rounded-2xl bg-[#2f9136] text-base font-black text-white shadow-[0_18px_34px_rgba(47,145,54,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#267c2e] focus-visible:ring-4 focus-visible:ring-lime-300"
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

        <div className="rounded-2xl border border-lime-100 bg-lime-50/80 p-5 text-center">
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
      <CardHeader className="relative z-10 space-y-7 px-6 pt-9 text-left sm:px-10 sm:pt-11">
        <StepBadge icon={Globe2} label={t("login.profile_step_badge", "Personalize your workspace")} />
        <div>
          <CardTitle className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
            {t("login.complete_profile", "Complete Your Profile")}
          </CardTitle>
          <CardDescription className="mt-4 text-base font-medium leading-8 text-slate-600">
            {t("login.profile_description", "Set your name and choose how you will use AgriConnect.")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6 px-6 pb-9 sm:px-10 sm:pb-11">
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
          className="h-16 w-full rounded-2xl bg-[#2f9136] text-base font-black text-white shadow-[0_18px_34px_rgba(47,145,54,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#267c2e] focus-visible:ring-4 focus-visible:ring-lime-300"
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
