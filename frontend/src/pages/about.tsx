import { TopNavigation } from "@/components/top-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, Globe, Truck, ShieldCheck, Users, Leaf } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function AboutPage() {
  const { t } = useTranslation();
  const benefitCards = [
    { icon: Users, title: "direct_access", text: "direct_access_desc" },
    { icon: Leaf, title: "farmer_wellbeing", text: "farmer_wellbeing_desc" },
    { icon: Globe, title: "public_motivation", text: "public_motivation_desc" },
    { icon: Truck, title: "logistics_access", text: "logistics_access_desc" },
    { icon: ShieldCheck, title: "transparent_trust", text: "transparent_trust_desc" },
    { icon: Sprout, title: "knowledge_support", text: "knowledge_support_desc" },
  ];
  const values = ["fairness", "access", "transparency", "resilience"];

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <header className="border-b bg-gradient-to-br from-primary/5 via-background to-emerald-50 dark:from-primary/10 dark:via-background dark:to-emerald-950/20">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sprout className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("about.badge")}
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 max-w-3xl" data-testid="text-about-heading">
            {t("about.headline")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {t("about.description")}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-12">
        <section className="grid md:grid-cols-3 gap-5" aria-labelledby="about-purpose-heading">
          <div>
            <h2 id="about-purpose-heading" className="font-serif text-2xl font-bold mb-4">{t("about.purpose")}</h2>
            <p className="text-[15px] leading-relaxed text-foreground/85">{t("about.purpose_text")}</p>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">{t("about.vision")}</h2>
            <p className="text-[15px] leading-relaxed text-foreground/85">{t("about.vision_text")}</p>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">{t("about.mission")}</h2>
            <p className="text-[15px] leading-relaxed text-foreground/85">{t("about.mission_text")}</p>
          </div>
        </section>

        <section aria-labelledby="about-benefits-heading">
          <h2 id="about-benefits-heading" className="font-serif text-2xl font-bold mb-4">{t("about.benefits")}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {benefitCards.map(({ icon: Icon, title, text }) => (
              <Card key={title} data-testid={`card-about-${title}`}>
                <CardContent className="pt-6">
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold text-base mb-1.5">{t(`about.${title}`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.${text}`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-[1.1fr_0.9fr] gap-5" aria-labelledby="about-story-heading">
          <div>
            <h2 id="about-story-heading" className="font-serif text-2xl font-bold mb-4">{t("about.story")}</h2>
            <p className="text-[15px] leading-relaxed text-foreground/85 mb-3">{t("about.story_text")}</p>
            <p className="text-[15px] leading-relaxed text-foreground/85">{t("about.story_text_secondary")}</p>
          </div>
          <Card data-testid="card-about-impact">
            <CardContent className="pt-6">
              <h3 className="font-serif text-xl font-bold mb-3">{t("about.impact")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("about.impact_text")}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="font-semibold">{t("about.impact_market_access")}</div>
                  <div className="text-xs text-muted-foreground">{t("about.impact_market_access_text")}</div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="font-semibold">{t("about.impact_waste")}</div>
                  <div className="text-xs text-muted-foreground">{t("about.impact_waste_text")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="about-values-heading">
          <h2 id="about-values-heading" className="font-serif text-2xl font-bold mb-4">{t("about.values")}</h2>
          <div className="grid md:grid-cols-4 gap-3">
            {values.map((value) => (
              <div key={value} className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold mb-1.5">{t(`about.value_${value}`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.value_${value}_text`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-xl border bg-primary/5 p-5 sm:p-6"
          aria-labelledby="about-farmer-access-heading"
          data-testid="section-about-free-selling"
        >
          <h2 id="about-farmer-access-heading" className="font-serif text-2xl font-bold mb-3">{t("about.farmer_access")}</h2>
          <p className="text-[15px] leading-relaxed text-foreground/85 mb-3">{t("about.farmer_access_text")}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("about.farmer_access_note")}</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-4">{t("about.get_in_touch")}</h2>
          <p className="text-[15px] text-foreground/85 mb-3">{t("about.get_in_touch_desc")}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/support" className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90" data-testid="link-about-support">
              {t("about.contact_support")}
            </Link>
            <Link href="/farmers-help" className="px-4 py-2 rounded-md border font-medium hover:bg-muted" data-testid="link-about-knowledge">
              {t("about.knowledge_hub_link")}
            </Link>
            <Link href="/government-schemes" className="px-4 py-2 rounded-md border font-medium hover:bg-muted" data-testid="link-about-schemes">
              {t("about.schemes_link")}
            </Link>
            <Link href="/logistics" className="px-4 py-2 rounded-md border font-medium hover:bg-muted" data-testid="link-about-logistics">
              {t("about.logistics_link")}
            </Link>
          </div>
        </section>

        <footer className="border-t pt-6 text-xs text-muted-foreground text-center">
          (c) {new Date().getFullYear()} AgriConnect. {t("about.footer")}
        </footer>
      </main>
    </div>
  );
}
