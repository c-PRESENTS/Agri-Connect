import { useEffect, useState } from "react";
import { LOCAL_BRANDED_PRODUCT_FALLBACK } from "@/lib/product-images";

interface SafeProductImageProps {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
}

/** Keeps card dimensions stable when a seller image is missing or fails to load. */
export function SafeProductImage({ src, fallbackSrc, alt, className }: SafeProductImageProps) {
  const preferred = src?.trim() || fallbackSrc?.trim() || null;
  const [activeSrc, setActiveSrc] = useState<string | null>(preferred);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(preferred);
    setFailed(false);
  }, [preferred]);

  if (!activeSrc || failed) {
    return <img src={LOCAL_BRANDED_PRODUCT_FALLBACK} alt={`${alt} image unavailable`} className={className} loading="lazy" />;
  }

  return <img src={activeSrc} alt={alt} className={className} loading="lazy" onError={() => {
    if (fallbackSrc && activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
    else setFailed(true);
  }} />;
}
