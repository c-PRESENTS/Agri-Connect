import { TopNavigation } from "@/components/top-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, Globe, Truck, ShieldCheck, Users, Leaf } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <header className="border-b bg-gradient-to-br from-primary/5 to-emerald-50 dark:from-primary/10 dark:to-emerald-950/20">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sprout className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("about.badge")}
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4" data-testid="text-about-heading">
            {t("about.headline")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t("about.description")}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-12">
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4">{t("about.mission")}</h2>
          <p className="text-[15px] leading-relaxed text-foreground/85">
            {t("about.mission_text")}
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Globe,
              title: t("about.global_reach"),
              text: t("about.global_reach_desc"),
            },
            {
              icon: Truck,
              title: t("about.live_logistics"),
              text: t("about.live_logistics_desc"),
            },
            {
              icon: ShieldCheck,
              title: t("about.secure"),
              text: t("about.secure_desc"),
            },
            {
              icon: Users,
              title: t("about.community"),
              text: t("about.community_desc"),
            },
            {
              icon: Leaf,
              title: t("about.knowledge_hub"),
              text: t("about.knowledge_hub_desc"),
            },
            {
              icon: Sprout,
              title: t("about.built_to_grow"),
              text: t("about.built_to_grow_desc"),
            },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <Icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold text-base mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-4">{t("about.how_it_works")}</h2>
          <ol className="space-y-3 list-decimal list-inside text-[15px] leading-relaxed text-foreground/85">
            <li>
              <strong>{t("about.sellers")}</strong> list their produce with photos, prices and stock counts —
              free to start.
            </li>
            <li>
              <strong>{t("about.buyers")}</strong> browse the live map, search by category, compare options,
              and add items to a cart.
            </li>
            <li>
              <strong>{t("about.stripe_checkout")}</strong> handles payment securely. Sellers never see card
              numbers.
            </li>
            <li>
              <strong>{t("about.orders")}</strong> flow into the seller&apos;s dashboard with live status
              updates from order placed through to delivered.
            </li>
            <li>
              <strong>{t("about.buyers")}</strong> can review sellers, track deliveries, and reorder favourites
              in one click.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-4">{t("about.get_in_touch")}</h2>
          <p className="text-[15px] text-foreground/85 mb-3">
            {t("about.get_in_touch_desc")}
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/support"
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
              data-testid="link-about-support"
            >
              {t("about.contact_support")}
            </Link>
            <a
              href="mailto:hello@agriconnect.app"
              className="px-4 py-2 rounded-md border font-medium hover:bg-muted"
              data-testid="link-about-email"
            >
              hello@agriconnect.app
            </a>
            <Link
              href="/farmers-help"
              className="px-4 py-2 rounded-md border font-medium hover:bg-muted"
              data-testid="link-about-knowledge"
            >
              {t("about.knowledge_hub_link")}
            </Link>
          </div>
        </section>

        <footer className="border-t pt-6 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} AgriConnect. {t("about.footer")}
        </footer>
      </main>
    </div>
  );
}
