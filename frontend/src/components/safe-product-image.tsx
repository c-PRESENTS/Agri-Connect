import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

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
    return <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground" role="img" aria-label={`${alt} image unavailable`}><ImageOff className="h-8 w-8 opacity-50" /></div>;
  }

  return <img src={activeSrc} alt={alt} className={className} loading="lazy" onError={() => {
    if (fallbackSrc && activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
    else setFailed(true);
  }} />;
}
