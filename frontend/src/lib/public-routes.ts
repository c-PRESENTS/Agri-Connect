export const PUBLIC_ROUTE_LINKS = [
  { path: "/", seoKey: "home" },
  { path: "/about", seoKey: "about" },
  { path: "/support", seoKey: "support" },
  { path: "/farmers-help", seoKey: "farmersHelp" },
  { path: "/government-schemes", seoKey: "governmentSchemes" },
  { path: "/land-leasing", seoKey: "landLeasing" },
  { path: "/logistics", seoKey: "logistics" },
  { path: "/ship", seoKey: "ship" },
  { path: "/share-care", seoKey: "shareCare" },
  { path: "/agritech", seoKey: "agritech" },
  { path: "/map", seoKey: "map" },
  { path: "/privacy-policy", seoKey: "privacy" },
  { path: "/terms-of-service", seoKey: "terms" },
  { path: "/refund-policy", seoKey: "refund" },
] as const;

export type SeoRouteKey = (typeof PUBLIC_ROUTE_LINKS)[number]["seoKey"] | "default" | "notFound";

export function getSeoRouteKey(pathname: string): SeoRouteKey {
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const route = PUBLIC_ROUTE_LINKS.find(({ path }) => path === cleanPath);
  return route?.seoKey ?? "notFound";
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
