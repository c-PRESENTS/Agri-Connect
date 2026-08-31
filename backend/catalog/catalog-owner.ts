export const DEFAULT_CATALOG_OWNER_EMAIL = "harsh.gavand.tech@gmail.com";

export function configuredCatalogOwnerEmail(): string {
  return (process.env.MVP_CATALOG_OWNER_EMAIL || DEFAULT_CATALOG_OWNER_EMAIL)
    .trim()
    .toLowerCase();
}
