import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Camera, Mic, MapPin, Shield, Truck, Building2, Globe, TrendingUp,
  Zap, Heart, Clock, Users, PackageOpen, Gift, ShoppingBag, GraduationCap, Wrench
} from "lucide-react";

const features = [
  { icon: Camera,    title: "features.photo_sell",       description: "features.photo_sell_desc",         color: "from-violet-500 to-purple-600" },
  { icon: Mic,       title: "features.voice_commands",   description: "features.voice_commands_desc",     color: "from-blue-500 to-cyan-600"    },
  { icon: MapPin,    title: "features.local_discovery",  description: "features.local_discovery_desc",    color: "from-green-500 to-emerald-600" },
  { icon: Building2, title: "features.govt_schemes",     description: "features.govt_schemes_desc",       color: "from-orange-500 to-red-500"   },
  { icon: Truck,     title: "features.fast_delivery",    description: "features.fast_delivery_desc",      color: "from-teal-500 to-green-600"   },
  { icon: Shield,    title: "features.secure_payments",  description: "features.secure_payments_desc",    color: "from-indigo-500 to-blue-600"  },
  { icon: Globe,     title: "features.multi_currency",   description: "features.multi_currency_desc",     color: "from-pink-500 to-rose-600"    },
  { icon: TrendingUp,title: "features.demand_alerts",    description: "features.demand_alerts_desc",      color: "from-amber-500 to-orange-600" },
];

interface PlatformStatistics {
  farmers: number;
  products: number;
  freeItems: number;
  buyers: number;
  students: number;
  services: number;
  demoFields: Array<"farmers" | "buyers" | "students">;
  updatedAt: string;
}

const statisticNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function FeatureShowcase() {
  const { t } = useTranslation();
  const { data: platformStats, isError: statsUnavailable } = useQuery<PlatformStatistics>({
    queryKey: ["/api/platform/stats"],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const stats = [
    { id: "farmers", value: platformStats?.farmers, label: t("home.farmers", "Farmers"), icon: Users },
    { id: "products", value: platformStats?.products, label: t("home.products", "Products"), icon: PackageOpen },
    { id: "freeItems", value: platformStats?.freeItems, label: t("home.free_items", "Free Items"), icon: Gift },
    { id: "buyers", value: platformStats?.buyers, label: t("platform_stats.buyers", "Buyers"), icon: ShoppingBag },
    { id: "students", value: platformStats?.students, label: t("platform_stats.students", "Students"), icon: GraduationCap },
    { id: "services", value: platformStats?.services, label: t("platform_stats.services", "Services"), icon: Wrench },
  ];
  return (
    <section className="py-8 px-4 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto max-w-5xl">

        {/* Heading */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-primary font-semibold text-xs uppercase tracking-widest">
            {t("features.section_title")}
          </span>
          <h2 className="text-xl md:text-2xl font-bold mt-1 mb-1">
            {t("features.powerful_features")}{" "}
            <span className="bg-gradient-to-r from-primary via-green-500 to-emerald-500 bg-clip-text text-transparent">
              {t("features.modern_agriculture")}
            </span>
          </h2>
          <p className="text-muted-foreground text-xs max-w-lg mx-auto">
            {t("features.section_subtitle")}
          </p>
        </motion.div>

        {/* Feature grid — 4 cols desktop, 2 tablet, all visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2.5 p-3 rounded-xl border border-border/30 bg-card hover:border-primary/30 hover:bg-card/95 transition-all duration-200 group"
            >
              <div className={`flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                <f.icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                  {t(f.title)}
                </div>
                <div className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                  {t(f.description)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="grid md:grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          data-testid="section-farmer-access-messaging"
        >
          {[
            { title: "features.free_start_title", text: "features.free_start_desc", icon: Heart },
            { title: "features.zero_barrier_title", text: "features.zero_barrier_desc", icon: Zap },
            { title: "features.transparent_policy_title", text: "features.transparent_policy_desc", icon: Clock },
          ].map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-xl border border-primary/15 bg-primary/5 p-3 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-background border border-primary/15 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-foreground leading-tight mb-1">{t(title)}</h3>
                <p className="text-[11px] text-muted-foreground leading-snug">{t(text)}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Live platform statistics */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-emerald-500/5 to-background px-5 py-4 shadow-sm">
          <div>
            <h3 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {t("platform_stats.title", "Live platform statistics")}
            </h3>
            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
              {statsUnavailable
                ? t("platform_stats.unavailable", "Statistics are temporarily unavailable")
                : t("platform_stats.subtitle", "Marketplace totals refresh automatically")}
            </p>
          </div>
          {!statsUnavailable && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {t("platform_stats.live", "Live")}
            </span>
          )}
        </div>
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          aria-live="polite"
          data-testid="platform-statistics"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-card p-4 text-center shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              data-testid={`platform-stat-${s.id}`}
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/15 ring-1 ring-primary/15 transition-transform group-hover:scale-105">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-2xl font-black leading-none tracking-tight text-transparent sm:text-3xl">
                  {s.value === undefined ? "—" : statisticNumber.format(s.value)}
                </div>
                <div className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-foreground/75 sm:text-sm">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
