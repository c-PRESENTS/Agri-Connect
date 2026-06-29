import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, ShieldCheck, Truck, Sprout } from "lucide-react";

export default function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

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
            <CardTitle className="text-2xl">{t("login.welcome", "Welcome back")}</CardTitle>
            <CardDescription>
              {t(
                "login.replit_description",
                "AgriConnect uses Replit Auth — one click and you're in. No new password to remember.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              className="w-full text-base"
              onClick={login}
              disabled={isLoading}
              data-testid="button-login-replit"
            >
              {t("login.continue", "Continue with Replit")}
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
