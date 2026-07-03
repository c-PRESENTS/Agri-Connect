import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LiveSellersRail } from "@/components/live-sellers-rail";

interface SplitMapLayoutProps {
  children: ReactNode;
  /** Optional title shown above the bottom map section. */
  bottomTitle?: string;
  /** Optional subtitle shown above the bottom map section. */
  bottomSubtitle?: string;
  /**
   * Convenience alias used by directory pages that pass a single map config
   * object: `<SplitMapLayout mapProps={{ title, subtitle }}>`.
   */
  mapProps?: { title?: string; subtitle?: string };
}

/**
 * Stacked layout used on directory-style pages.
 * Page content fills the full width on top, and the live map + nearby
 * sellers widget sits below it as a full-width section.
 *
 * The bottom panel uses the same LiveSellersRail used in the home category
 * view — same Leaflet map, same click-marker-to-expand-detail behavior.
 */
export function SplitMapLayout({
  children,
  bottomTitle,
  bottomSubtitle,
  mapProps,
}: SplitMapLayoutProps) {
  const { t } = useTranslation();
  const title = bottomTitle ?? mapProps?.title ?? t("map.farmers_and_products");
  const subtitle =
    bottomSubtitle ??
    mapProps?.subtitle ??
    t("map.nearby_products");
  return (
    <div className="flex flex-col w-full">
      {/* Top: full-width page content */}
      <div className="w-full min-w-0">{children}</div>

      {/* Bottom: full-width map + nearby section */}
      <section
        className="w-full border-t bg-muted/20 mt-6"
        data-testid="section-bottom-map"
      >
        <div className="px-4 sm:px-6 py-6">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold" data-testid="text-bottom-map-title">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground" data-testid="text-bottom-map-subtitle">
                {subtitle}
              </p>
            )}
          </div>
          <LiveSellersRail layout="wide" mapHeight={460} listHeight={520} />
        </div>
      </section>
    </div>
  );
}
