import { memo } from "react";
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
  demoFields?: string[];
  updatedAt: string;
}

const statisticNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export const FeatureShowcase = memo(function FeatureShowcase() {
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
    <section
      className="py-8 sm:py-14 px-3 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-muted/20 to-background"
      style={{ contentVisibility: "auto", containIntrinsicSize: "850px" }}
    >
      <div className="w-full max-w-[1700px] mx-auto">

        {/* Heading */}
        <div className="text-center mb-9 sm:mb-12">
          <span className="text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-4 py-1.5 rounded-full border-2 border-amber-400 dark:border-amber-700 font-black text-xs sm:text-sm uppercase tracking-widest inline-block shadow-2xs">
            {t("features.section_title")}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mt-3 sm:mt-4 mb-2.5 tracking-tight leading-tight">
            {t("features.powerful_features")}{" "}
            <span className="bg-gradient-to-r from-primary via-green-500 to-emerald-500 bg-clip-text text-transparent">
              {t("features.modern_agriculture")}
            </span>
          </h2>
          <p className="text-foreground/90 text-sm sm:text-base md:text-lg font-bold max-w-3xl mx-auto leading-relaxed">
            {t("features.section_subtitle")}
          </p>
        </div>

        {/* Feature grid — 4 cols desktop, 2 tablet, compact & sleek */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5 mb-9 sm:mb-12">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl border-2 border-border/80 bg-card hover:border-primary/80 hover:bg-card/95 shadow-2xs hover:shadow-md transition-all duration-300 group"
            >
              <div className={`flex-shrink-0 h-11 w-11 sm:h-13 sm:w-13 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300`}>
                <f.icon className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5 text-white drop-shadow-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm sm:text-base md:text-lg font-black leading-tight text-foreground group-hover:text-primary transition-colors uppercase tracking-wide mb-1.5">
                  {t(f.title)}
                </div>
                <div className="text-xs sm:text-sm md:text-base font-bold text-foreground/80 leading-relaxed">
                  {t(f.description)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="grid md:grid-cols-3 gap-4 sm:gap-5 mb-9 sm:mb-12"
          data-testid="section-farmer-access-messaging"
        >
          {[
            { title: "features.free_start_title", text: "features.free_start_desc", icon: Heart },
            { title: "features.zero_barrier_title", text: "features.zero_barrier_desc", icon: Zap },
            { title: "features.transparent_policy_title", text: "features.transparent_policy_desc", icon: Clock },
          ].map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5.5 flex items-start gap-4 shadow-2xs">
              <div className="h-11 w-11 sm:h-13 sm:w-13 rounded-2xl bg-background border-2 border-amber-400 dark:border-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Icon className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-foreground leading-tight mb-1.5 uppercase tracking-wide">{t(title)}</h3>
                <p className="text-xs sm:text-sm md:text-base text-foreground/85 leading-relaxed font-bold">{t(text)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live platform statistics */}
        <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-r from-emerald-50 via-emerald-50/40 to-background dark:from-emerald-950/40 dark:via-card/60 dark:to-card px-5 sm:px-7 py-4.5 sm:py-5 shadow-sm">
          <div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">
              {t("platform_stats.title", "Live platform statistics")}
            </h3>
            <p className="mt-1 text-sm sm:text-base md:text-lg font-bold text-slate-700 dark:text-slate-300">
              {statsUnavailable
                ? t("platform_stats.unavailable", "Statistics are temporarily unavailable")
                : t("platform_stats.subtitle", "Marketplace totals refresh automatically")}
            </p>
          </div>
          {!statsUnavailable && (
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500 bg-emerald-100/90 dark:bg-emerald-950/90 px-4 py-1.5 text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200 shadow-2xs">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              {t("platform_stats.live", "Live")}
            </span>
          )}
        </div>
        <div
          className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6"
          aria-live="polite"
          data-testid="platform-statistics"
        >
          {stats.map((s) => (
            <div
              key={s.id}
              className="group flex min-h-32 sm:min-h-36 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-primary/30 bg-card p-3.5 sm:p-5 text-center shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
              data-testid={`platform-stat-${s.id}`}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-emerald-500/20 ring-1 ring-primary/20 shadow-2xs transition-transform group-hover:scale-105">
                <s.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-2xl sm:text-3xl lg:text-4xl font-black leading-none tracking-tight text-transparent">
                  {s.value === undefined ? "—" : statisticNumber.format(s.value)}
                </div>
                <div className="mt-2 truncate text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
});
