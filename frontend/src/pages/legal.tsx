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

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <header className="border-b-2 border-border/60 bg-gradient-to-br from-primary/10 via-emerald-50 to-background dark:from-primary/15 dark:via-emerald-950/30 dark:to-background">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center shrink-0">
              <Icon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
              {config.badge}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-3">
            {config.title}
          </h1>
          <p className="text-base sm:text-lg font-bold text-foreground/80 max-w-2xl leading-relaxed">
            {config.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
            <span className="rounded-xl border-2 border-border/80 bg-background/80 px-4 py-1.5 shadow-xs">
              {t("legal.shared.last_updated", { date: config.updated })}
            </span>
            <span className="rounded-xl border-2 border-border/80 bg-background/80 px-4 py-1.5 shadow-xs">
              {t("legal.shared.draft_notice")}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-8">
        <Card className="border-2 border-amber-400/40 bg-amber-400/10 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex gap-4 items-start">
            <LifeBuoy className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed">{config.notice}</p>
          </CardContent>
        </Card>

        {config.sections.map((section) => (
          <section key={section.title} className="rounded-2xl border-2 border-border/80 bg-card p-6 sm:p-8 shadow-md">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-4">{section.title}</h2>
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground/90">
              {section.body}
            </p>
            {section.items && section.items.length > 0 && (
              <ul className="mt-5 space-y-3 text-base sm:text-lg font-bold text-foreground/85">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="mt-2.5 h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="rounded-2xl border-2 border-border/80 bg-card p-6 sm:p-8 shadow-md">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">{t("legal.shared.need_help_title")}</h2>
          <p className="text-base sm:text-lg font-bold text-foreground/80 mb-6 leading-relaxed">
            {t("legal.shared.need_help_body")}
          </p>
          <div className="flex flex-wrap gap-4">
            {config.actions.map((action) => (
              <Button
                key={action.href}
                asChild
                size="lg"
                className={`h-13 px-8 text-base font-black uppercase tracking-wider rounded-xl shadow-md ${action.href === "/support" ? "bg-amber-400 hover:bg-amber-500 text-black" : "border-2"}`}
              >
                <Link href={action.href}>
                  {action.label}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
