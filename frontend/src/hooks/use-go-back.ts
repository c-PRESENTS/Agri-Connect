import { useCallback } from "react";
import { useLocation } from "wouter";

export function useGoBack(fallback: string = "/") {
  const [, setLocation] = useLocation();
  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(fallback);
    }
  }, [setLocation, fallback]);
}
