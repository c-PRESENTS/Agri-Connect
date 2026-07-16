export const PUBLIC_ROUTE_LINKS = [
  { path: "/", seoKey: "home" },
  { path: "/login", seoKey: "login" },
  { path: "/dashboard", seoKey: "dashboard" },
  { path: "/dashboard/photo-sell", seoKey: "photoSell" },
  { path: "/dashboard/list-product", seoKey: "photoSell" },
  { path: "/dashboard/schemes", seoKey: "governmentSchemes" },
  { path: "/settings", seoKey: "settings" },
  { path: "/favorites", seoKey: "default" },
  { path: "/my-profile", seoKey: "settings" },
  { path: "/profile-completion", seoKey: "settings" },
  { path: "/student-help-point", seoKey: "farmersHelp" },
  { path: "/student/login", seoKey: "login" },
  { path: "/student/verify-email", seoKey: "login" },
  { path: "/student/confirm-login", seoKey: "login" },
  { path: "/student/dashboard", seoKey: "dashboard" },
  { path: "/student/resources", seoKey: "farmersHelp" },
  { path: "/student/support", seoKey: "support" },
  { path: "/student/requests", seoKey: "support" },
  { path: "/about", seoKey: "about" },
  { path: "/support", seoKey: "support" },
  { path: "/farmers-help", seoKey: "farmersHelp" },
  { path: "/government-schemes", seoKey: "governmentSchemes" },
  { path: "/land-leasing", seoKey: "landLeasing" },
  { path: "/logistics", seoKey: "logistics" },
  { path: "/ship", seoKey: "ship" },
  { path: "/share-care", seoKey: "shareCare" },
  { path: "/cart", seoKey: "cart" },
  { path: "/agritech", seoKey: "agritech" },
  { path: "/compare", seoKey: "compare" },
  { path: "/seller", seoKey: "seller" },
  { path: "/fulfillment", seoKey: "seller" },
  { path: "/operator", seoKey: "dashboard" },
  { path: "/map", seoKey: "map" },
  { path: "/checkout", seoKey: "checkout" },
  { path: "/orders", seoKey: "orders" },
  { path: "/payment/success", seoKey: "paymentSuccess" },
  { path: "/payment/cancelled", seoKey: "paymentCancelled" },
  { path: "/privacy-policy", seoKey: "privacy" },
  { path: "/terms-of-service", seoKey: "terms" },
  { path: "/refund-policy", seoKey: "refund" },
] as const;

export const DYNAMIC_ROUTE_LINKS = [
  { pattern: /^\/products\/[^/]+$/, seoKey: "productDetail" },
  { pattern: /^\/sellers\/[^/]+$/, seoKey: "sellerProfile" },
  { pattern: /^\/ship\/track\/[^/]+$/, seoKey: "shipTrack" },
  { pattern: /^\/order-confirmation\/[^/]+$/, seoKey: "orderConfirmation" },
  { pattern: /^\/orders\/[^/]+$/, seoKey: "orderDetail" },
] as const;

export type SeoRouteKey =
  | (typeof PUBLIC_ROUTE_LINKS)[number]["seoKey"]
  | (typeof DYNAMIC_ROUTE_LINKS)[number]["seoKey"]
  | "default"
  | "notFound";

export function getSeoRouteKey(pathname: string): SeoRouteKey {
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const route = PUBLIC_ROUTE_LINKS.find(({ path }) => path === cleanPath);
  if (route) return route.seoKey;

  const dynamicRoute = DYNAMIC_ROUTE_LINKS.find(({ pattern }) => pattern.test(cleanPath));
  return dynamicRoute?.seoKey ?? "notFound";
}

// Foundation for a future automated public-link check without runtime requests.
export function getPublicRouteConfigurationIssues(routes = PUBLIC_ROUTE_LINKS): string[] {
  const paths = new Set<string>();
  const issues: string[] = [];

  routes.forEach(({ path }) => {
    if (!path.startsWith("/")) issues.push(`Route must begin with '/': ${path}`);
    if (paths.has(path)) issues.push(`Duplicate public route: ${path}`);
    paths.add(path);
  });

  return issues;
}
