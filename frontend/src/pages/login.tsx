import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, ShieldCheck, Truck, Sprout } from "lucide-react";

export default function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const authError = login.error || register.error;
  const isSubmitting = login.isPending || register.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (mode === "register") {
        await register.mutateAsync({ name: name.trim(), email: email.trim(), password });
      } else {
        await login.mutateAsync({ email: email.trim(), password });
      }
      setLocation("/dashboard");
    } catch {
      // React Query stores the error; the form renders it below the fields.
    }
  };

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
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">
              {mode === "register" ? t("login.create_account", "Create Account") : t("login.welcome", "Welcome back")}
            </CardTitle>
            <CardDescription>
              {t(
                "login.credentials_description",
                "Sign in securely with your AgriConnect email and password.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("login.name", "Full name")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                    data-testid="input-register-name"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("login.email", "Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  data-testid="input-login-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("login.password", "Password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                  data-testid="input-login-password"
                />
              </div>
              {authError && (
                <p className="text-sm text-destructive" role="alert" data-testid="text-auth-error">
                  {authError.message}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full text-base"
                disabled={isLoading || isSubmitting}
                data-testid={mode === "register" ? "button-register-submit" : "button-login-submit"}
              >
                {mode === "register" ? t("login.create_account", "Create Account") : t("login.sign_in", "Sign in")}
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setMode(mode === "register" ? "login" : "register")}
              data-testid="button-toggle-auth-mode"
            >
              {mode === "register"
                ? t("login.back_to_login", "Back to Login")
                : t("login.create_account", "Create Account")}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t(
                "login.terms",
                "By continuing you agree to our Terms of Service and Privacy Policy.",
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
