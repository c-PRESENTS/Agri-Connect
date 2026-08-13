import { lazy, Suspense, useLayoutEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

const AppNavRail = lazy(() => import("@/components/app-nav-rail").then((module) => ({ default: module.AppNavRail })));
const CompactMarketPanel = lazy(() => import("@/components/compact-market-panel").then((module) => ({ default: module.CompactMarketPanel })));
const MobileBottomNav = lazy(() => import("@/components/mobile-bottom-nav").then((module) => ({ default: module.MobileBottomNav })));
const GlobalSubcategoryPanel = lazy(() => import("@/components/global-subcategory-panel").then((module) => ({ default: module.GlobalSubcategoryPanel })));
const MobileNavSheet = lazy(() => import("@/components/mobile-nav-sheet").then((module) => ({ default: module.MobileNavSheet })));

const FULLSCREEN_ROUTES = ["/", "/map"];
const NO_RAIL_ROUTES = ["/login"];
// Informational and feature pages own their page-level layout and should not be
// squeezed into the commerce/Quick Shop split view. In particular,
// FarmersHelp owns a nested full-height sidebar/scroll area.
const NO_MARKET_PANEL_ROUTES = [
  "/",
  "/map",
  "/marketplace",
  "/regional-organisation",
  "/login",
  "/about",
  "/support",
  "/farmers-help",
  "/government-schemes",
  "/logistics",
  "/logistics-collaboration",
];
const NO_MOBILE_NAV_ROUTES = ["/login"];

function ShellFallback() {
  return null;
}

function SkipLink() {
  return <a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Skip to main content</a>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isNoRail = NO_RAIL_ROUTES.includes(location);
  const isFullScreen = FULLSCREEN_ROUTES.includes(location);
  const showMarketPanel = !NO_MARKET_PANEL_ROUTES.some(
    (route) => location === route || (route !== "/" && location.startsWith(`${route}/`)),
  );
  const showMobileNav = !NO_MOBILE_NAV_ROUTES.includes(location);

  // AppShell owns the scrolling viewport on desktop. React can reuse this
  // element when navigating between the two shell layouts, which otherwise
  // carries a previous page's scrollTop into the destination route.
  useLayoutEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.scrollTop = 0;
      mainContent.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  if (isNoRail) return <><SkipLink /><div id="main-content" tabIndex={-1}>{children}</div></>;

  return (
    <><SkipLink /><div className="flex h-screen overflow-hidden">
      <Suspense fallback={<ShellFallback />}>
        <AppNavRail />
        <GlobalSubcategoryPanel />
      </Suspense>
      {showMarketPanel ? (
        <div className="flex flex-1 min-w-0 h-full overflow-hidden">
          <div id="main-content" tabIndex={-1} className={`flex-1 min-w-0 ${isFullScreen ? "overflow-hidden" : "overflow-y-auto"} ${showMobileNav ? "pb-16 md:pb-0" : ""}`}>
            {children}
          </div>
          <div className="hidden h-full min-h-0 lg:block">
            <Suspense fallback={<ShellFallback />}>
              <CompactMarketPanel defaultOpen={true} />
            </Suspense>
          </div>
        </div>
      ) : (
        <div id="main-content" tabIndex={-1} className={`flex-1 min-w-0 ${isFullScreen ? "overflow-hidden" : "overflow-y-auto"} ${showMobileNav ? "pb-16 md:pb-0" : ""}`}>
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
    </div></>
  );
}
