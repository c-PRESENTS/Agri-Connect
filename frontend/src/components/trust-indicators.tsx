import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Truck, 
  RefreshCw, 
  CreditCard, 
  Award,
  CheckCircle,
  ArrowRight,
  Leaf
} from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import { Link } from "wouter";
import { COOKIE_SETTINGS_HASH } from "@/lib/cookie-consent";

const trustBadges = [
  {
    icon: Shield,
    title: "trust.secure_payments",
    description: "trust.secure_desc",
    titleFallback: "Clear Marketplace",
    descriptionFallback: "Transparent routes and support",
  },
  {
    icon: Truck,
    title: "trust.fast_delivery",
    description: "trust.fast_desc",
    titleFallback: "Delivery Access",
    descriptionFallback: "Logistics page and shipping tools",
  },
  {
    icon: RefreshCw,
    title: "trust.easy_returns",
    description: "trust.returns_desc",
    titleFallback: "Support Path",
    descriptionFallback: "Help and policy pages stay visible",
  },
  {
    icon: CreditCard,
    title: "trust.multiple_payments",
    description: "trust.payments_desc",
    titleFallback: "Fair Access",
    descriptionFallback: "Free-to-start selling direction",
  },
];

export const TrustIndicators = memo(function TrustIndicators() {
  const { t } = useTranslation();
  const communityLinks = [
    { label: "Farmer help point", href: "/farmers-help", testId: "link-community-farmer-help" },
    { label: "Government schemes", href: "/government-schemes", testId: "link-community-government-schemes" },
    { label: "Logistics visibility", href: "/logistics", testId: "link-community-logistics" },
    { label: "Share & Care", href: "/share-care", testId: "link-community-share-care" },
  ];
  return (
    <>
      <section
        className="py-12 sm:py-16 md:py-24 px-6 sm:px-8 bg-gradient-to-r from-amber-50/80 via-background to-amber-50/80 dark:from-amber-950/20 dark:via-background dark:to-amber-950/20 border-t-2 border-b-2 border-amber-200 dark:border-amber-800"
        style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}
      >
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {trustBadges.map((badge) => (
              <div
                key={badge.title}
                className="flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl border-2 border-amber-300/70 dark:border-amber-700/60 bg-card shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <div
                  className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-amber-500/20 border-2 border-amber-400/40 mb-5 transition-transform duration-300 group-hover:scale-110 shadow-md"
                >
                  <badge.icon className="h-10 w-10 sm:h-12 sm:w-12 text-amber-600 dark:text-amber-400 drop-shadow-xs" />
                </div>
                <h3 className="font-black text-lg sm:text-xl md:text-2xl mb-2 uppercase tracking-wider text-foreground">{t(badge.title, { defaultValue: badge.titleFallback })}</h3>
                <p className="text-sm sm:text-base md:text-lg font-bold text-foreground/85 leading-relaxed">{t(badge.description, { defaultValue: badge.descriptionFallback })}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-10 sm:py-16 md:py-24 px-4 bg-gradient-to-br from-primary via-green-600 to-emerald-700 text-white"
        style={{ contentVisibility: "auto", containIntrinsicSize: "520px" }}
      >
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <span className="text-white/90 font-black text-xs sm:text-sm uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/30 shadow-xs">
                Join Our Community
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black mt-3 sm:mt-4 mb-4 sm:mb-6 leading-tight drop-shadow-md">
                Ready to Start
                <br />
                Your Journey?
              </h2>
              <p className="text-white/95 text-base sm:text-xl font-bold mb-6 sm:mb-8 max-w-md leading-relaxed drop-shadow-xs">
                Whether you're a farmer looking to sell or a customer seeking fresh produce, 
                AgriConnect is your trusted marketplace.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-black uppercase tracking-wider bg-white text-primary hover:bg-white/90 shadow-xl border-0"
                >
                  <Link href="/farmers-help" data-testid="button-become-seller">
                    Become a Seller
                    <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-black uppercase tracking-wider border-2 border-white/40 text-white hover:bg-white/15 backdrop-blur-xs"
                >
                  <Link href="/about" data-testid="button-learn-about">
                    Learn About AgriConnect
                  </Link>
                </Button>
              </div>
            </div>
            
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
            >
              {communityLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={item.testId}
                  aria-label={`Open ${item.label}`}
                  className="group flex items-center gap-3.5 rounded-2xl border-2 border-white/30 bg-white/20 p-4 sm:p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:border-white/60 hover:bg-white/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-700 active:translate-y-0"
                >
                  <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0" />
                  <span className="min-w-0 flex-1 text-base sm:text-lg font-black uppercase tracking-wide">{item.label}</span>
                  <ArrowRight className="h-5 w-5 flex-shrink-0 text-white/80 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer
        className="py-12 sm:py-16 md:py-24 px-6 sm:px-8 bg-card border-t-2 border-border/60"
        style={{ contentVisibility: "auto", containIntrinsicSize: "480px" }}
      >
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-12 mb-10 sm:mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-primary to-green-600 flex items-center justify-center shadow-lg">
                  <Leaf className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <span className="font-black text-2xl sm:text-3xl tracking-tight text-foreground">AgriConnect</span>
              </div>
              <p className="text-foreground/85 text-sm sm:text-base font-bold mb-5 leading-relaxed max-w-sm">
                Connecting farmers directly with customers for fresher produce and fairer prices.
              </p>
              <div className="flex gap-3">
                {[SiFacebook, SiX, SiInstagram, FaLinkedinIn].map((Icon, i) => (
                  <Button key={i} variant="outline" size="icon" className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl border-2 border-border/80 hover:border-primary hover:bg-primary/10 shadow-xs transition-transform hover:scale-105">
                    <Icon className="h-5 w-5 text-foreground" />
                  </Button>
                ))}
              </div>
            </div>
            
            {[
              {
                title: t("trust.footer_products"),
                links: [
                  { label: "Fresh Vegetables", href: "/?category=daily-needs&subcategory=vegetables" },
                  { label: "Fruits", href: "/?category=daily-needs&subcategory=fruits" },
                  { label: "Dairy & Eggs", href: "/?category=daily-needs&subcategory=dairy" },
                  { label: "Organic Range", href: "/?category=daily-needs&section=Organic" },
                ],
              },
              {
                title: t("trust.footer_farmers"),
                links: [
                  { label: "Sell Your Produce", href: "/farmers-help" },
                  { label: "AgriTech", href: "/agritech" },
                  { label: "Government Schemes", href: "/government-schemes" },
                  { label: "Logistics", href: "/logistics" },
                ],
              },
              {
                title: t("trust.footer_support"),
                links: [
                  { label: "Help Centre", href: "/support" },
                  { label: "About AgriConnect", href: "/about" },
                  { label: "Delivery Info", href: "/logistics" },
                  { label: "Returns Policy", href: "/refund-policy" },
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-black text-base sm:text-lg uppercase tracking-wider text-foreground mb-4 sm:mb-5 pb-1 border-b-2 border-primary/20 inline-block">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm sm:text-base md:text-lg font-bold text-foreground/80 hover:text-primary transition-colors py-0.5 inline-block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-8 sm:pt-10 border-t-2 border-border/40 flex flex-col md:flex-row items-center justify-between gap-5">
            <p className="text-sm sm:text-base font-black text-foreground">
              (c) {new Date().getFullYear()} AgriConnect. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base font-bold text-foreground/80">
              <Link href="/about" className="hover:text-primary transition-colors" data-testid="link-footer-about">{t("trust.footer_about")}</Link>
              <Link href="/support" className="hover:text-primary transition-colors" data-testid="link-footer-support">{t("trust.footer_support")}</Link>
              <Link href="/farmers-help" className="hover:text-primary transition-colors" data-testid="link-footer-knowledge">{t("trust.footer_knowledge")}</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors" data-testid="link-footer-privacy">{t("trust.footer_privacy")}</Link>
              <Link href="/terms-of-service" className="hover:text-primary transition-colors" data-testid="link-footer-terms">{t("trust.footer_terms")}</Link>
              <Link href="/refund-policy" className="hover:text-primary transition-colors" data-testid="link-footer-refund">{t("trust.footer_refund")}</Link>
              <a href={COOKIE_SETTINGS_HASH} className="hover:text-primary transition-colors" data-testid="button-footer-cookie-settings">{t("trust.footer_cookie_settings")}</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
});
