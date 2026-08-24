const safeAlias = (value: string): string => {
  if (!/^[a-z][a-z0-9_]*$/i.test(value)) throw new Error("Unsafe SQL alias");
  return value;
};

export function sellerPublicEligibilitySql(sellerAlias = "u"): string {
  const seller = safeAlias(sellerAlias);
  return `
    ${seller}.account_status='active'
    AND (
      (${seller}.auth_method='catalog_seed' AND ${seller}.is_verified=true)
      OR EXISTS (
        SELECT 1
        FROM seller_verification_cases public_verification
        WHERE public_verification.seller_id=${seller}.id
          AND public_verification.status='verified'
          AND (public_verification.expires_at IS NULL OR public_verification.expires_at>now())
      )
    )`;
}

export function productPublicVisibilitySql(productAlias = "p", sellerAlias = "u"): string {
  const product = safeAlias(productAlias);
  return `
    ${product}.moderation_status='approved'
    AND ${product}.price_minor>0
    AND ${product}.stock>=0
    AND length(trim(${product}.unit))>0
    AND jsonb_typeof(${product}.product_data->'images')='array'
    AND jsonb_array_length(${product}.product_data->'images')>0
    AND ${sellerPublicEligibilitySql(sellerAlias)}`;
}

export function productCompatibilityPublicationStatus(status: string): "draft" | "published" | "suspended" {
  if (status === "approved") return "published";
  if (status === "suspended") return "suspended";
  return "draft";
}
