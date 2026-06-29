import { TopNavigation } from "@/components/top-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, Globe, Truck, ShieldCheck, Users, Leaf } from "lucide-react";
import { Link } from "wouter";

export default function AboutPage() {
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
              About AgriConnect
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4" data-testid="text-about-heading">
            Connecting growers and buyers, one harvest at a time.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            AgriConnect is a marketplace and knowledge platform for the agricultural community —
            built for growers who care about quality and buyers who want to know where their food
            comes from.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-12">
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4">Our mission</h2>
          <p className="text-[15px] leading-relaxed text-foreground/85">
            We believe that the people who grow our food deserve fair pay, modern tools, and a
            direct line to the people who buy it. AgriConnect removes the friction between farm
            and fork — letting independent growers list produce, manage orders, accept secure
            payments, and reach buyers across their region without a middleman.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Globe,
              title: "Global reach, local roots",
              text: "Region-aware pricing, language and currency. Buyers see local sellers first; sellers reach customers worldwide when they want to.",
            },
            {
              icon: Truck,
              title: "Live logistics",
              text: "Real-time order tracking, milk-run pickups, and a built-in marketplace of trusted logistics partners.",
            },
            {
              icon: ShieldCheck,
              title: "Secure by design",
              text: "Replit Auth, Stripe payments and per-user data isolation. We never store your payment card details.",
            },
            {
              icon: Users,
              title: "Community-driven",
              text: "Share-and-care lets growers donate surplus produce. Government schemes and farmer support are built in.",
            },
            {
              icon: Leaf,
              title: "Knowledge Hub",
              text: "A curated, scholar-grade reference library covering agronomy, horticulture, post-harvest and market intelligence.",
            },
            {
              icon: Sprout,
              title: "Built to grow",
              text: "From a single market garden to a multi-farm cooperative — the platform scales with you.",
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
          <h2 className="font-serif text-2xl font-bold mb-4">How it works</h2>
          <ol className="space-y-3 list-decimal list-inside text-[15px] leading-relaxed text-foreground/85">
            <li>
              <strong>Sellers</strong> list their produce with photos, prices and stock counts —
              free to start.
            </li>
            <li>
              <strong>Buyers</strong> browse the live map, search by category, compare options,
              and add items to a cart.
            </li>
            <li>
              <strong>Stripe Checkout</strong> handles payment securely. Sellers never see card
              numbers.
            </li>
            <li>
              <strong>Orders</strong> flow into the seller&apos;s dashboard with live status
              updates from order placed through to delivered.
            </li>
            <li>
              <strong>Buyers</strong> can review sellers, track deliveries, and reorder favourites
              in one click.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-4">Get in touch</h2>
          <p className="text-[15px] text-foreground/85 mb-3">
            Questions, ideas, partnerships — we&apos;d love to hear from you.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/support"
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
              data-testid="link-about-support"
            >
              Contact support
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
              Knowledge Hub
            </Link>
          </div>
        </section>

        <footer className="border-t pt-6 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} AgriConnect. Building the agricultural marketplace of the
          future, together.
        </footer>
      </main>
    </div>
  );
}
