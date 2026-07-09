import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { usePageTranslation } from "@/hooks/use-page-translation";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import "@/i18n/index";

const AIChatAssistant = lazy(() => import("@/components/ai-chat-assistant").then((module) => ({ default: module.AIChatAssistant })));
const ProfileWizard = lazy(() => import("@/components/profile-wizard").then((module) => ({ default: module.ProfileWizard })));
const AppNavRail = lazy(() => import("@/components/app-nav-rail").then((module) => ({ default: module.AppNavRail })));
const CompactMarketPanel = lazy(() => import("@/components/compact-market-panel").then((module) => ({ default: module.CompactMarketPanel })));
const MobileBottomNav = lazy(() => import("@/components/mobile-bottom-nav").then((module) => ({ default: module.MobileBottomNav })));
const CompareBar = lazy(() => import("@/components/compare-bar").then((module) => ({ default: module.CompareBar })));
const GlobalSubcategoryPanel = lazy(() => import("@/components/global-subcategory-panel").then((module) => ({ default: module.GlobalSubcategoryPanel })));
const MobileNavSheet = lazy(() => import("@/components/mobile-nav-sheet").then((module) => ({ default: module.MobileNavSheet })));
const AccessibilityToolbar = lazy(() => import("@/components/accessibility-toolbar").then((module) => ({ default: module.AccessibilityToolbar })));

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const PhotoSell = lazy(() => import("@/pages/photo-sell"));
const CartPage = lazy(() => import("@/pages/cart"));
const GovernmentSchemes = lazy(() => import("@/pages/government-schemes"));
const FarmersHelp = lazy(() => import("@/pages/farmers-help"));
const LandLeasingPage = lazy(() => import("@/pages/land-leasing"));
const LogisticsPage = lazy(() => import("@/pages/logistics"));
const ShipPage = lazy(() => import("@/pages/ship"));
const ShipTrackPage = lazy(() => import("@/pages/ship-track"));
const ShareCarePage = lazy(() => import("@/pages/share-care"));
const LoginPage = lazy(() => import("@/pages/login"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AgriTechPage = lazy(() => import("@/pages/agritech"));
const SellerPage = lazy(() => import("@/pages/seller"));
const SellerProfilePage = lazy(() => import("@/pages/seller-profile"));
const ProductDetailPage = lazy(() => import("@/pages/product-detail"));
const ComparePage = lazy(() => import("@/pages/compare"));
const SmartMapPage = lazy(() => import("@/pages/smart-map"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const OrderConfirmationPage = lazy(() => import("@/pages/order-confirmation"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const OrderDetailPage = lazy(() => import("@/pages/order-detail"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const PaymentCancelledPage = lazy(() => import("@/pages/payment-cancelled"));
const SupportPage = lazy(() => import("@/pages/support"));
const AboutPage = lazy(() => import("@/pages/about"));

const FULLSCREEN_ROUTES = ["/", "/map"];
const NO_RAIL_ROUTES = ["/login"];
const NO_MARKET_PANEL_ROUTES = ["/", "/map", "/login"];
const NO_MOBILE_NAV_ROUTES = ["/login"];
const RTL_LANGS = new Set(["ar", "ur", "fa", "he"]);

function RouteFallback() {
  return <div className="min-h-screen bg-background" aria-busy="true" />;
}

function ShellFallback() {
  return null;
}

function I18nRuntime() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const baseLang = lang.split("-")[0];

  useEffect(() => {
    document.documentElement.lang = baseLang;
    document.documentElement.dir = RTL_LANGS.has(baseLang) ? "rtl" : "ltr";
    localStorage.setItem("agriconnect-lang", baseLang);
  }, [baseLang]);

  return null;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isNoRail = NO_RAIL_ROUTES.includes(location);
  const isFullScreen = FULLSCREEN_ROUTES.includes(location);
  const showMarketPanel = !NO_MARKET_PANEL_ROUTES.includes(location);
  const showMobileNav = !NO_MOBILE_NAV_ROUTES.includes(location);

  if (isNoRail) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<ShellFallback />}>
        <AppNavRail />
        <GlobalSubcategoryPanel />
      </Suspense>
      {showMarketPanel ? (
        <div className="flex flex-1 min-w-0 h-full overflow-hidden">
          <div className={`flex-1 min-w-0 ${isFullScreen ? "overflow-hidden" : "overflow-y-auto"} ${showMobileNav ? "pb-16 md:pb-0" : ""}`}>
            {children}
          </div>
          <div className="hidden lg:block">
            <Suspense fallback={<ShellFallback />}>
              <CompactMarketPanel defaultOpen={true} />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className={`flex-1 min-w-0 ${isFullScreen ? "overflow-hidden" : "overflow-y-auto"} ${showMobileNav ? "pb-16 md:pb-0" : ""}`}>
          {children}
        </div>
      )}
      {showMobileNav && (
        <Suspense fallback={<ShellFallback />}>
          <MobileBottomNav
            onCategories={() => window.dispatchEvent(new Event("agri-mobile-nav-open"))}
          />
        </Suspense>
      )}
      <Suspense fallback={<ShellFallback />}>
        <MobileNavSheet />
      </Suspense>
    </div>
  );
}

function AuthAwareContent() {
  const { user, isAuthenticated } = useAuth();
  usePageTranslation();

  return (
    <>
      {isAuthenticated && user && !user.profileComplete && (
        <Suspense fallback={<ShellFallback />}>
          <ProfileWizard />
        </Suspense>
      )}
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/login" component={LoginPage} />
            <Route path="/dashboard">
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            </Route>
            <Route path="/dashboard/photo-sell">
              <ProtectedRoute><PhotoSell /></ProtectedRoute>
            </Route>
            <Route path="/dashboard/schemes">
              <ProtectedRoute><GovernmentSchemes /></ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            </Route>
            <Route path="/farmers-help" component={FarmersHelp} />
            <Route path="/land-leasing" component={LandLeasingPage} />
            <Route path="/logistics" component={LogisticsPage} />
            <Route path="/ship/track/:trackingId" component={ShipTrackPage} />
            <Route path="/ship" component={ShipPage} />
            <Route path="/share-care" component={ShareCarePage} />
            <Route path="/cart" component={CartPage} />
            <Route path="/agritech" component={AgriTechPage} />
            <Route path="/government-schemes" component={GovernmentSchemes} />
            <Route path="/products/:id" component={ProductDetailPage} />
            <Route path="/compare" component={ComparePage} />
            <Route path="/seller">
              <ProtectedRoute><SellerPage /></ProtectedRoute>
            </Route>
            <Route path="/sellers/:id" component={SellerProfilePage} />
            <Route path="/map" component={SmartMapPage} />
            <Route path="/checkout">
              <ProtectedRoute><CheckoutPage /></ProtectedRoute>
            </Route>
            <Route path="/order-confirmation/:id">
              <ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>
            </Route>
            <Route path="/orders">
              <ProtectedRoute><OrdersPage /></ProtectedRoute>
            </Route>
            <Route path="/orders/:id">
              <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
            </Route>
            <Route path="/payment/success">
              <ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>
            </Route>
            <Route path="/payment/cancelled" component={PaymentCancelledPage} />
            <Route path="/support" component={SupportPage} />
            <Route path="/about" component={AboutPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </AppShell>
      <Suspense fallback={<ShellFallback />}>
        <CompareBar />
        <AccessibilityToolbar />
        <AIChatAssistant />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="agriconnect-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <I18nRuntime />
          <Toaster />
          <AuthAwareContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
