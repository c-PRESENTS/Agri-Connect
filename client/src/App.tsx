import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AIChatAssistant } from "@/components/ai-chat-assistant";
import { usePageTranslation } from "@/hooks/use-page-translation";
import { ProtectedRoute } from "@/components/protected-route";
import { ProfileWizard } from "@/components/profile-wizard";
import { AppNavRail } from "@/components/app-nav-rail";
import { CompactMarketPanel } from "@/components/compact-market-panel";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { CompareBar } from "@/components/compare-bar";
import { GlobalSubcategoryPanel } from "@/components/global-subcategory-panel";
import { MobileNavSheet } from "@/components/mobile-nav-sheet";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import PhotoSell from "@/pages/photo-sell";
import CartPage from "@/pages/cart";
import GovernmentSchemes from "@/pages/government-schemes";
import FarmersHelp from "@/pages/farmers-help";
import LandLeasingPage from "@/pages/land-leasing";
import LogisticsPage from "@/pages/logistics";
import ShipPage from "@/pages/ship";
import ShipTrackPage from "@/pages/ship-track";
import ShareCarePage from "@/pages/share-care";
import LoginPage from "@/pages/login";
import SettingsPage from "@/pages/settings";
import AgriTechPage from "@/pages/agritech";
import SellerPage from "@/pages/seller";
import SellerProfilePage from "@/pages/seller-profile";
import ProductDetailPage from "@/pages/product-detail";
import ComparePage from "@/pages/compare";
import SmartMapPage from "@/pages/smart-map";
import CheckoutPage from "@/pages/checkout";
import OrderConfirmationPage from "@/pages/order-confirmation";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import PaymentSuccessPage from "@/pages/payment-success";
import PaymentCancelledPage from "@/pages/payment-cancelled";
import SupportPage from "@/pages/support";
import AboutPage from "@/pages/about";
import "@/i18n/index";

const FULLSCREEN_ROUTES = ["/", "/map"];
const NO_RAIL_ROUTES = ["/login"];
const NO_MARKET_PANEL_ROUTES = ["/", "/map", "/login"];
const NO_MOBILE_NAV_ROUTES = ["/login"];

function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isNoRail = NO_RAIL_ROUTES.includes(location);
  const isFullScreen = FULLSCREEN_ROUTES.includes(location);
  const showMarketPanel = !NO_MARKET_PANEL_ROUTES.includes(location);
  const showMobileNav = !NO_MOBILE_NAV_ROUTES.includes(location);

  if (isNoRail) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNavRail />
      <GlobalSubcategoryPanel />
      {showMarketPanel ? (
        <div className="flex flex-1 min-w-0 h-full overflow-hidden">
          <div className={`flex-1 min-w-0 ${isFullScreen ? "overflow-hidden" : "overflow-y-auto"} ${showMobileNav ? "pb-16 md:pb-0" : ""}`}>
            {children}
          </div>
          <div className="hidden lg:block">
            <CompactMarketPanel defaultOpen={true} />
          </div>
        </div>
      ) : (
        <div className={`flex-1 min-w-0 ${isFullScreen ? "overflow-hidden" : "overflow-y-auto"} ${showMobileNav ? "pb-16 md:pb-0" : ""}`}>
          {children}
        </div>
      )}
      {showMobileNav && (
        <MobileBottomNav
          onCategories={() => window.dispatchEvent(new Event("agri-mobile-nav-open"))}
        />
      )}
      <MobileNavSheet />
    </div>
  );
}

function AuthAwareContent() {
  const { user, isAuthenticated } = useAuth();
  usePageTranslation();

  return (
    <>
      {isAuthenticated && user && !user.profileComplete && <ProfileWizard />}
      <AppShell>
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
          <Route path="/seller" component={SellerPage} />
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
      </AppShell>
      <CompareBar />
      <AIChatAssistant />
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="agriconnect-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AuthAwareContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
