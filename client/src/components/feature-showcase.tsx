import { motion } from "framer-motion";
import {
  Camera, Mic, MapPin, Shield, Truck, Building2, Globe, TrendingUp,
  Zap, Heart, Clock
} from "lucide-react";

const features = [
  { icon: Camera,    title: "Photo-Sell AI",       description: "Snap & list instantly with AI detection",         color: "from-violet-500 to-purple-600" },
  { icon: Mic,       title: "Voice Commands",       description: "Hands-free navigation for busy farmers",          color: "from-blue-500 to-cyan-600"    },
  { icon: MapPin,    title: "Local Discovery",      description: "Interactive maps with radius farmer search",       color: "from-green-500 to-emerald-600" },
  { icon: Building2, title: "Government Schemes",   description: "Subsidies, insurance & financial aid",            color: "from-orange-500 to-red-500"   },
  { icon: Truck,     title: "Fast Delivery",        description: "Same-day & next-day delivery across UK",          color: "from-teal-500 to-green-600"   },
  { icon: Shield,    title: "Secure Payments",      description: "Cards, bank transfer, COD & more",                color: "from-indigo-500 to-blue-600"  },
  { icon: Globe,     title: "Multi-Currency",        description: "75+ countries, 15+ currencies supported",        color: "from-pink-500 to-rose-600"    },
  { icon: TrendingUp,title: "Demand Alerts",        description: "Real-time buyer demand in your area",             color: "from-amber-500 to-orange-600" },
];

const stats = [
  { value: "500+",   label: "Products",  icon: Zap        },
  { value: "2,500+", label: "Farmers",   icon: Heart      },
  { value: "50K+",   label: "Customers", icon: TrendingUp },
  { value: "24/7",   label: "Support",   icon: Clock      },
];

export function FeatureShowcase() {
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
            Why Choose AgriConnect
          </span>
          <h2 className="text-xl md:text-2xl font-bold mt-1 mb-1">
            Powerful Features for{" "}
            <span className="bg-gradient-to-r from-primary via-green-500 to-emerald-500 bg-clip-text text-transparent">
              Modern Agriculture
            </span>
          </h2>
          <p className="text-muted-foreground text-xs max-w-lg mx-auto">
            Everything you need to buy, sell, and manage agricultural products in one platform
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
              className="flex items-start gap-2.5 p-3 rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:bg-card/90 transition-all duration-200 group"
            >
              <div className={`flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                <f.icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                  {f.title}
                </div>
                <div className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                  {f.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats strip */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent leading-tight">
                  {s.value}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
