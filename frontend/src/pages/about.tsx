import { TopNavigation } from "@/components/top-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, Globe, Truck, ShieldCheck, Users, Leaf } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

function preloadAboutDestinations() {
  void Promise.allSettled([
    import("@/pages/support"),
    import("@/pages/farmers-help"),
    import("@/pages/government-schemes"),
    import("@/pages/logistics"),
  ]);
}

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

  useEffect(() => {
    // These routes are the primary calls to action at the bottom of this page.
    // Warm their lazy chunks while the user reads About so navigation does not
    // sit behind the route-level loading boundary.
    const preloadTimer = window.setTimeout(preloadAboutDestinations, 0);
    return () => window.clearTimeout(preloadTimer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <header className="border-b-2 border-border/60 bg-gradient-to-br from-primary/10 via-background to-emerald-50 dark:from-primary/15 dark:via-background dark:to-emerald-950/30">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center shrink-0">
              <Sprout className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
              {t("about.badge")}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4 max-w-4xl" data-testid="text-about-heading">
            {t("about.headline")}
          </h1>
          <p className="text-base sm:text-lg font-bold text-foreground/80 max-w-4xl leading-relaxed">
            {t("about.description")}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-10 sm:space-y-14">
        <section className="grid md:grid-cols-3 gap-6" aria-labelledby="about-purpose-heading">
          <div className="border-2 border-border/80 rounded-2xl p-6 bg-card shadow-md">
            <h2 id="about-purpose-heading" className="text-2xl sm:text-3xl font-black text-foreground mb-3">{t("about.purpose")}</h2>
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground/90">{t("about.purpose_text")}</p>
          </div>
          <div className="border-2 border-border/80 rounded-2xl p-6 bg-card shadow-md">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">{t("about.vision")}</h2>
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground/90">{t("about.vision_text")}</p>
          </div>
          <div className="border-2 border-border/80 rounded-2xl p-6 bg-card shadow-md">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">{t("about.mission")}</h2>
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground/90">{t("about.mission_text")}</p>
          </div>
        </section>

        <section aria-labelledby="about-benefits-heading">
          <h2 id="about-benefits-heading" className="text-2xl sm:text-3xl font-black text-foreground mb-6">{t("about.benefits")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefitCards.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="border-2 border-border/80 rounded-2xl shadow-md hover:shadow-xl transition-all" data-testid={`card-about-${title}`}>
                <CardContent className="p-6">
                  <div className="p-3 rounded-xl bg-amber-400/10 w-fit mb-4">
                    <Icon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-foreground mb-2">{t(`about.${title}`)}</h3>
                  <p className="text-sm sm:text-base font-bold text-muted-foreground leading-relaxed">{t(`about.${text}`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-[1.1fr_0.9fr] gap-6" aria-labelledby="about-story-heading">
          <div className="border-2 border-border/80 rounded-2xl p-6 sm:p-8 bg-card shadow-md">
            <h2 id="about-story-heading" className="text-2xl sm:text-3xl font-black text-foreground mb-4">{t("about.story")}</h2>
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground/90 mb-4">{t("about.story_text")}</p>
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground/90">{t("about.story_text_secondary")}</p>
          </div>
          <Card className="border-2 border-border/80 rounded-2xl shadow-md bg-card" data-testid="card-about-impact">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-2xl font-black text-foreground mb-3">{t("about.impact")}</h3>
              <p className="text-base font-bold text-muted-foreground leading-relaxed mb-6">{t("about.impact_text")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border-2 border-border/70 bg-muted/40 p-4">
                  <div className="font-black text-base text-foreground">{t("about.impact_market_access")}</div>
                  <div className="text-sm font-bold text-muted-foreground mt-1">{t("about.impact_market_access_text")}</div>
                </div>
                <div className="rounded-xl border-2 border-border/70 bg-muted/40 p-4">
                  <div className="font-black text-base text-foreground">{t("about.impact_waste")}</div>
                  <div className="text-sm font-bold text-muted-foreground mt-1">{t("about.impact_waste_text")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="about-values-heading">
          <h2 id="about-values-heading" className="text-2xl sm:text-3xl font-black text-foreground mb-6">{t("about.values")}</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {values.map((value) => (
              <div key={value} className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-md">
                <h3 className="text-base sm:text-lg font-black text-foreground mb-2">{t(`about.value_${value}`)}</h3>
                <p className="text-sm sm:text-base font-bold text-muted-foreground leading-relaxed">{t(`about.value_${value}_text`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-2xl border-2 border-amber-400/40 bg-amber-400/10 p-6 sm:p-8 shadow-md"
          aria-labelledby="about-farmer-access-heading"
          data-testid="section-about-free-selling"
        >
          <h2 id="about-farmer-access-heading" className="text-2xl sm:text-3xl font-black text-foreground mb-3">{t("about.farmer_access")}</h2>
          <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground/90 mb-3">{t("about.farmer_access_text")}</p>
          <p className="text-sm sm:text-base font-bold text-muted-foreground leading-relaxed">{t("about.farmer_access_note")}</p>
        </section>

        <section className="border-2 border-border/80 rounded-2xl p-6 sm:p-8 bg-card shadow-md">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">{t("about.get_in_touch")}</h2>
          <p className="text-base sm:text-lg font-bold text-foreground/80 mb-6">{t("about.get_in_touch_desc")}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/support" className="h-13 px-6 inline-flex items-center justify-center rounded-xl bg-amber-400 text-black text-sm sm:text-base font-black uppercase tracking-wider shadow-md hover:bg-amber-500 transition-all" data-testid="link-about-support">
              {t("about.contact_support")}
            </Link>
            <Link href="/farmers-help" className="h-13 px-6 inline-flex items-center justify-center rounded-xl border-2 border-border/80 bg-background text-foreground text-sm sm:text-base font-black uppercase tracking-wider shadow-sm hover:bg-muted transition-all" data-testid="link-about-knowledge">
              {t("about.knowledge_hub_link")}
            </Link>
            <Link href="/government-schemes" className="h-13 px-6 inline-flex items-center justify-center rounded-xl border-2 border-border/80 bg-background text-foreground text-sm sm:text-base font-black uppercase tracking-wider shadow-sm hover:bg-muted transition-all" data-testid="link-about-schemes">
              {t("about.schemes_link")}
            </Link>
            <Link href="/logistics" className="h-13 px-6 inline-flex items-center justify-center rounded-xl border-2 border-border/80 bg-background text-foreground text-sm sm:text-base font-black uppercase tracking-wider shadow-sm hover:bg-muted transition-all" data-testid="link-about-logistics">
              {t("about.logistics_link")}
            </Link>
          </div>
        </section>

        <footer className="border-t-2 border-border/60 pt-8 pb-4 text-base font-bold text-muted-foreground text-center">
          (c) {new Date().getFullYear()} AgriConnect. {t("about.footer")}
        </footer>
      </main>
    </div>
  );
}
