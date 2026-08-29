import { TopNavigation } from "@/components/top-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileText, LifeBuoy, RefreshCw, ShieldCheck, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

type LegalPageKind = "privacy" | "terms" | "refund";

type LegalAction = {
  href: string;
  label: string;
};

type LegalSection = {
  title: string;
  body: string;
  items?: string[];
};

type LegalPageConfig = {
  badge: string;
  title: string;
  description: string;
  updated: string;
  notice: string;
  sections: LegalSection[];
  actions: LegalAction[];
};

const PAGE_ICONS: Record<LegalPageKind, LucideIcon> = {
  privacy: ShieldCheck,
  terms: FileText,
  refund: RefreshCw,
};

function getPageConfig(value: unknown): LegalPageConfig {
  return value as LegalPageConfig;
}

export function LegalPage({ page }: { page: LegalPageKind }) {
  const { t } = useTranslation();
  const config = getPageConfig(t(`legal.pages.${page}`, { returnObjects: true }));
  const Icon = PAGE_ICONS[page];
  const compactLegal = page === "terms" || page === "refund";

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <header className="border-b-2 border-border/60 bg-gradient-to-br from-primary/10 via-emerald-50 to-background dark:from-primary/15 dark:via-emerald-950/30 dark:to-background">
        <div className={compactLegal ? "w-full px-3 py-5 sm:px-5 sm:py-6 lg:px-6" : "max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16"}>
          <div className={compactLegal ? "flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4" : ""}>
            <div>
              <div className={compactLegal ? "flex items-center gap-2.5 mb-2.5" : "flex items-center gap-4 mb-5"}>
                <div className={compactLegal ? "h-10 w-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0" : "h-14 w-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center shrink-0"}>
                  <Icon className={compactLegal ? "h-5 w-5 text-amber-600 dark:text-amber-400" : "h-7 w-7 text-amber-600 dark:text-amber-400"} />
                </div>
                <span className={compactLegal ? "text-xs font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400" : "text-sm font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400"}>
                  {config.badge}
                </span>
              </div>
              <h1 className={compactLegal ? "text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground mb-1.5" : "text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-3"}>
                {config.title}
              </h1>
              <p className={compactLegal ? "text-sm sm:text-base font-bold text-foreground/80 max-w-3xl leading-relaxed" : "text-base sm:text-lg font-bold text-foreground/80 max-w-2xl leading-relaxed"}>
                {config.description}
              </p>
            </div>
            <div className={compactLegal ? "flex flex-wrap gap-2 text-xs font-black lg:justify-end" : "mt-6 flex flex-wrap gap-3 text-sm font-black"}>
              <span className="rounded-xl border-2 border-border/80 bg-background/80 px-4 py-1.5 shadow-xs">
                {t("legal.shared.last_updated", { date: config.updated })}
              </span>
              <span className="rounded-xl border-2 border-border/80 bg-background/80 px-4 py-1.5 shadow-xs">
                {t("legal.shared.draft_notice")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className={compactLegal ? "w-full px-3 py-4 sm:px-5 sm:py-5 lg:px-6 space-y-4" : "max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-8"}>
        <Card className={compactLegal ? "border border-amber-400/40 bg-amber-400/10 rounded-xl shadow-sm" : "border-2 border-amber-400/40 bg-amber-400/10 rounded-2xl shadow-sm"}>
          <CardContent className={compactLegal ? "p-3.5 sm:p-4 flex gap-3 items-start" : "p-6 flex gap-4 items-start"}>
            <LifeBuoy className={compactLegal ? "h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" : "h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"} />
            <p className={compactLegal ? "text-sm font-bold text-foreground leading-relaxed" : "text-base sm:text-lg font-bold text-foreground leading-relaxed"}>{config.notice}</p>
          </CardContent>
        </Card>

        <div className={compactLegal ? "grid grid-cols-1 lg:grid-cols-2 gap-3 items-start" : "space-y-8"}>
          {config.sections.map((section) => (
            <section key={section.title} className={compactLegal ? "rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm" : "rounded-2xl border-2 border-border/80 bg-card p-6 sm:p-8 shadow-md"}>
              <h2 className={compactLegal ? "text-xl sm:text-2xl font-black text-foreground mb-2.5" : "text-2xl sm:text-3xl font-black text-foreground mb-4"}>{section.title}</h2>
              <p className={compactLegal ? "text-sm font-bold leading-relaxed text-foreground/90" : "text-base sm:text-lg font-bold leading-relaxed text-foreground/90"}>
                {section.body}
              </p>
              {section.items && section.items.length > 0 && (
                <ul className={compactLegal ? "mt-3 space-y-2 text-sm font-bold text-foreground/85" : "mt-5 space-y-3 text-base sm:text-lg font-bold text-foreground/85"}>
                  {section.items.map((item) => (
                    <li key={item} className={compactLegal ? "flex gap-2 items-start" : "flex gap-3 items-start"}>
                      <span className={compactLegal ? "mt-2 h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" : "mt-2.5 h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0"} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className={compactLegal ? "rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm" : "rounded-2xl border-2 border-border/80 bg-card p-6 sm:p-8 shadow-md"}>
          <h2 className={compactLegal ? "text-xl sm:text-2xl font-black text-foreground mb-2" : "text-2xl sm:text-3xl font-black text-foreground mb-3"}>{t("legal.shared.need_help_title")}</h2>
          <p className={compactLegal ? "text-sm font-bold text-foreground/80 mb-3 leading-relaxed" : "text-base sm:text-lg font-bold text-foreground/80 mb-6 leading-relaxed"}>
            {t("legal.shared.need_help_body")}
          </p>
          <div className={compactLegal ? "flex flex-wrap gap-2.5" : "flex flex-wrap gap-4"}>
            {config.actions.map((action) => (
              <Button
                key={action.href}
                asChild
                size={compactLegal ? "sm" : "lg"}
                className={compactLegal
                  ? `h-9 px-4 text-xs sm:text-sm font-black uppercase tracking-wider rounded-lg shadow-sm ${action.href === "/support" ? "bg-amber-400 hover:bg-amber-500 text-black" : "border"}`
                  : `h-13 px-8 text-base font-black uppercase tracking-wider rounded-xl shadow-md ${action.href === "/support" ? "bg-amber-400 hover:bg-amber-500 text-black" : "border-2"}`}
              >
                <Link href={action.href}>
                  {action.label}
                  <ArrowRight className={compactLegal ? "ml-1.5 h-4 w-4" : "ml-2 h-5 w-5"} />
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
