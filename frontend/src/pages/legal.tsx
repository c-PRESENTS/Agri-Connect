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

      <header className="border-b bg-gradient-to-br from-primary/5 via-emerald-50 to-background dark:from-primary/10 dark:via-emerald-950/20 dark:to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {config.badge}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {config.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {config.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background/70 px-3 py-1">
              {t("legal.shared.last_updated", { date: config.updated })}
            </span>
            <span className="rounded-full border bg-background/70 px-3 py-1">
              {t("legal.shared.draft_notice")}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex gap-3 items-start">
            <LifeBuoy className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/85 leading-relaxed">{config.notice}</p>
          </CardContent>
        </Card>

        {config.sections.map((section) => (
          <section key={section.title} className="rounded-lg border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
            <p className="text-sm sm:text-[15px] leading-relaxed text-foreground/85">
              {section.body}
            </p>
            {section.items && section.items.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold mb-3">{t("legal.shared.need_help_title")}</h2>
          <p className="text-sm sm:text-[15px] text-muted-foreground mb-5 leading-relaxed">
            {t("legal.shared.need_help_body")}
          </p>
          <div className="flex flex-wrap gap-3">
            {config.actions.map((action) => (
              <Button key={action.href} asChild variant={action.href === "/support" ? "default" : "outline"}>
                <Link href={action.href}>
                  {action.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
