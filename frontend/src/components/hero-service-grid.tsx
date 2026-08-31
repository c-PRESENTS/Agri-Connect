import { useState, useEffect, memo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Map, Sprout, Cpu, Landmark, Truck, HeartHandshake,
  LayoutDashboard, Camera, Settings,
  ShoppingBasket, Wrench, Package, Star, Wheat, Store, Cog,
  Building2, Heart, Factory, Leaf, BadgeDollarSign,
  Pencil, X, ChevronLeft, ChevronRight, Check, RotateCcw, Plus,
  Mountain,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const SERVICE_LOGOS: Record<string, string> = {
  agritech: "/category-logos/agritech.svg",
  map: "/category-logos/smart-map.svg",
  land: "/category-logos/land-leasing.svg",
  logistics: "/category-logos/logistics.svg",
  share: "/category-logos/share-care.svg",
  schemes: "/category-logos/government.svg",
  dash: "/category-logos/dashboard.svg",
  sell: "/category-logos/photo-sell.svg",
  settings: "/category-logos/settings.svg",
  seller: "/category-logos/photo-sell.svg",
  daily: "/category-logos/daily-needs.svg",
  inputs: "/category-logos/inputs-tools.svg",
  processed: "/category-logos/processed.svg",
  specialty: "/category-logos/specialty.svg",
  other: "/category-logos/other-agri.svg",
  super: "/category-logos/supermarket.svg",
  dietary: "/category-logos/dietary.svg",
  commercial: "/category-logos/commercial-crops.svg",
  bio: "/category-logos/bio-products.svg",
  services: "/category-logos/services.svg",
  help: "/category-logos/farmers-help.svg",
};

export interface QuickAccessItem {
  id: string;
  path: string;
  icon: any;
  label: string;
  fallbackLabel: string;
  color: string;
  public: boolean;
  category?: string;
  badge?: string;
  badgeType?: "moisture-reading" | "moisture-pct" | "trend" | "signal";
  hasSparkline?: boolean;
  hasAmberSparkline?: boolean;
}

const ALL_ITEMS: QuickAccessItem[] = [
  // ── Row 1 (10 items exact) ──
  { id: "agritech",   path: "/agritech",                   icon: Cpu,             label: "home.agritech",      fallbackLabel: "AgriTech",         color: "text-emerald-400", public: true  },
  { id: "map",        path: "/map",                        icon: Map,             label: "home.smart_map",     fallbackLabel: "Smart Map",        color: "text-sky-400",     public: true  },
  { id: "land",       path: "/land-leasing",               icon: Landmark,        label: "nav.land",           fallbackLabel: "Land",             color: "text-cyan-300",    public: true, badge: "Moisture Reading", badgeType: "moisture-reading" },
  { id: "logistics",  path: "/logistics",                  icon: Truck,           label: "home.logistics",     fallbackLabel: "Logistics",        color: "text-emerald-300", public: true, badge: "Moisture 29.6%", badgeType: "moisture-pct" },
  { id: "share",      path: "/share-care",                 icon: HeartHandshake,  label: "nav.share",          fallbackLabel: "Share",            color: "text-rose-400",    public: true  },
  { id: "logistics-trend", path: "/logistics",             icon: Truck,           label: "home.logistics",     fallbackLabel: "Logistics",        color: "text-emerald-400", public: true, hasSparkline: true, badge: "Trend", badgeType: "trend" },
  { id: "schemes",    path: "/government-schemes",         icon: Building2,       label: "home.govt_schemes",  fallbackLabel: "Govt Schemes",     color: "text-indigo-400",  public: true  },
  { id: "dash",       path: "/dashboard",                  icon: LayoutDashboard, label: "nav.dashboard",      fallbackLabel: "Dashboard",        color: "text-violet-400",  public: true  },
  { id: "sell",       path: "/dashboard/photo-sell",       icon: Camera,          label: "home.sell_list",     fallbackLabel: "Sell / List",      color: "text-amber-400",   public: true  },
  { id: "settings",   path: "/settings",                   icon: Settings,        label: "nav.settings",       fallbackLabel: "Account Settings", color: "text-slate-300",   public: true  },

  // ── Row 2 (10 items exact) ──
  { id: "seller",     path: "/seller",                     icon: BadgeDollarSign, label: "home.seller_hub",    fallbackLabel: "Seller Hub",       color: "text-amber-400",   public: true, badgeType: "signal"  },
  { id: "daily",      path: "/?category=daily-needs",      icon: ShoppingBasket,  label: "category.daily",     fallbackLabel: "Daily",            color: "text-orange-400",  public: true, category: "daily-needs", badgeType: "signal" },
  { id: "inputs",     path: "/?category=inputs-tools",     icon: Wrench,          label: "category.inputs",    fallbackLabel: "Inputs",           color: "text-blue-400",    public: true, category: "inputs-tools", badgeType: "signal" },
  { id: "commercial", path: "/?category=commercial-crops", icon: Factory,         label: "category.commercial",fallbackLabel: "Commercial",       color: "text-red-400",     public: true, category: "commercial-crops" },
  { id: "trend-hub",  path: "/dashboard",                  icon: Mountain,        label: "nav.dashboard",      fallbackLabel: "Trend",            color: "text-amber-400",   public: true, hasAmberSparkline: true, badge: "Trend", badgeType: "trend" },
  { id: "other",      path: "/?category=other-agri",       icon: Wheat,           label: "category.other_agri",fallbackLabel: "Other Agri",       color: "text-yellow-400",  public: true, category: "other-agri" },
  { id: "super",      path: "/?category=supermarket",      icon: Store,           label: "home.supermarket",   fallbackLabel: "Supermarket",      color: "text-purple-400",  public: true, category: "supermarket" },
  { id: "dietary",    path: "/?category=dietary",          icon: Heart,           label: "category.dietary",   fallbackLabel: "Dietary",          color: "text-pink-400",    public: true, category: "dietary" },
  { id: "specialty",  path: "/?category=specialty",        icon: Star,            label: "category.specialty", fallbackLabel: "Specialty",        color: "text-emerald-400", public: true, category: "specialty" },
  { id: "bio",        path: "/?category=bio-products",     icon: Leaf,            label: "category.bio",       fallbackLabel: "Bio",              color: "text-teal-400",    public: true, category: "bio-products" },

  // ── Row 3 (1 item) ──
  { id: "services",   path: "/?category=services",         icon: Cog,             label: "category.services",  fallbackLabel: "Services",         color: "text-slate-300",   public: true, category: "services" },
];

const LS_ORDER  = "agri-nav-order";
const LS_HIDDEN = "agri-nav-hidden";
const LS_EMOJIS = "agri-nav-emojis";
const LS_VER    = "agri-nav-ver";
const ITEMS_VER = "v11";

if (typeof localStorage !== "undefined" && localStorage.getItem(LS_VER) !== ITEMS_VER) {
  localStorage.removeItem(LS_ORDER);
  localStorage.removeItem(LS_HIDDEN);
  localStorage.setItem(LS_VER, ITEMS_VER);
}

function readOrder():  string[] | null  { try { return JSON.parse(localStorage.getItem(LS_ORDER)  || "null"); } catch { return null; } }
function readHidden(): string[]         { try { return JSON.parse(localStorage.getItem(LS_HIDDEN) || "[]");   } catch { return []; }   }
function readEmojis(): Record<string, string> { try { return JSON.parse(localStorage.getItem(LS_EMOJIS) || "{}"); } catch { return {}; } }
function persist(o: string[], h: Set<string>, e: Record<string, string>) {
  localStorage.setItem(LS_ORDER,  JSON.stringify(o));
  localStorage.setItem(LS_HIDDEN, JSON.stringify(Array.from(h)));
  localStorage.setItem(LS_EMOJIS, JSON.stringify(e));
}

export const HeroServiceGrid = memo(function HeroServiceGrid() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const visibleAll = ALL_ITEMS.filter(s => s.public || isAuthenticated);

  const [order,  setOrderState]  = useState<string[]>(() => readOrder() || visibleAll.map(s => s.id));
  const [hidden, setHiddenState] = useState<Set<string>>(() => new Set(readHidden()));
  const [emojis, setEmojisState] = useState<Record<string, string>>(() => readEmojis());
  const [editMode,      setEditMode]      = useState(false);
  const [editingEmoji,  setEditingEmoji]  = useState<string | null>(null);
  const [emojiInput,    setEmojiInput]    = useState("");

  useEffect(() => {
    const saved  = readOrder();
    const newIds = visibleAll.map(s => s.id).filter(id => !saved?.includes(id));
    const merged = saved
      ? [...saved.filter(id => visibleAll.some(s => s.id === id)), ...newIds]
      : visibleAll.map(s => s.id);
    setOrderState(merged);
  }, [isAuthenticated]);

  const save = (o: string[], h: Set<string>, e: Record<string, string>) => {
    persist(o, h, e);
    setOrderState([...o]);
    setHiddenState(new Set(h));
    setEmojisState({ ...e });
    window.dispatchEvent(new Event("agri-nav-changed"));
  };

  const moveLeft  = (id: string) => { const i = order.indexOf(id); if (i <= 0) return; const n = [...order]; [n[i-1], n[i]] = [n[i], n[i-1]]; save(n, hidden, emojis); };
  const moveRight = (id: string) => { const i = order.indexOf(id); if (i >= order.length - 1) return; const n = [...order]; [n[i], n[i+1]] = [n[i+1], n[i]]; save(n, hidden, emojis); };
  const remove    = (id: string) => { const nh = new Set(hidden); nh.add(id);    save(order, nh, emojis); };
  const restore   = (id: string) => { const nh = new Set(hidden); nh.delete(id); save(order, nh, emojis); };
  const reset     = () => save(visibleAll.map(s => s.id), new Set(), {});

  const startEmojiEdit = (id: string) => { setEditingEmoji(id); setEmojiInput(emojis[id] || ""); };
  const commitEmoji    = (id: string) => {
    const ne = { ...emojis };
    if (emojiInput.trim()) ne[id] = emojiInput.trim().slice(0, 2); else delete ne[id];
    save(order, hidden, ne); setEditingEmoji(null); setEmojiInput("");
  };

  const visibleItems = order
    .map(id => visibleAll.find(s => s.id === id))
    .filter((s): s is typeof visibleAll[0] => !!s && !hidden.has(s.id));
  const hiddenItems = visibleAll.filter(s => hidden.has(s.id));

  return (
    <div className="w-full bg-[#081f1d]/90 backdrop-blur-md border border-emerald-700/50 rounded-2xl p-3.5 sm:p-5 shadow-2xl relative z-10">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
          {t("home.quick_access", { defaultValue: "QUICK ACCESS" })}
        </span>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 border border-white/20 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("nav.reset")}
            </button>
          )}
          <button
            onClick={() => { setEditMode(v => !v); setEditingEmoji(null); }}
            data-testid="hero-services-edit"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all shadow-xs cursor-pointer ${
              editMode
                ? "bg-amber-400 text-black border-amber-400 shadow-amber-400/30"
                : "bg-[#0c2927] text-emerald-300 border-emerald-600/60 hover:bg-[#123835] hover:border-emerald-400"
            }`}
          >
            {editMode ? (
              <><Check className="h-4 w-4" /> {t("nav.done")}</>
            ) : (
              <><Pencil className="h-4 w-4" /> Edit</>
            )}
          </button>
        </div>
      </div>

      {/* 10-Column Grid with Extra Large Hero Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          const customEmoji = emojis[item.id];
          const isEditingThis = editingEmoji === item.id;
          const logoSrc = SERVICE_LOGOS[item.id] || ((item as any).category ? SERVICE_LOGOS[(item as any).category] : undefined);

          return (
            <div key={item.id} className="relative group min-w-0">
              <button
                onClick={() => {
                  if (editMode) return;
                  if ((item as any).category) {
                    setLocation(item.path);
                    window.dispatchEvent(new CustomEvent("agri-subcategory-open", { detail: (item as any).category }));
                  } else {
                    setLocation(item.path);
                  }
                }}
                data-testid={`nav-${item.id}`}
                className={`relative w-full h-[82px] sm:h-[88px] lg:h-[92px] flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-150 p-2 sm:p-2.5 shadow-lg cursor-pointer group-hover:-translate-y-1 group-hover:shadow-emerald-500/20 ${
                  editMode
                    ? "bg-[#0c2e2a] border-2 border-amber-400 text-white shadow-amber-400/20"
                    : "bg-[#0a2321] hover:bg-[#103330] border-emerald-700/60 hover:border-emerald-400 text-white active:scale-95 ring-1 ring-emerald-500/20"
                }`}
              >
                {/* Top-right badge (e.g. Moisture Reading, Moisture 29.6%, Trend, or Signal Bars) */}
                {item.badgeType === "moisture-reading" && (
                  <span className="absolute top-1.5 right-1.5 text-[8.5px] font-black text-cyan-300 bg-[#061e1c] px-1.5 py-0.5 rounded border border-cyan-500/50 leading-none shadow-xs">
                    Moisture
                  </span>
                )}

                {item.badgeType === "moisture-pct" && (
                  <span className="absolute top-1.5 right-1.5 text-[8.5px] font-black text-emerald-300 bg-[#061e1c] px-1.5 py-0.5 rounded border border-emerald-500/50 leading-none shadow-xs">
                    29.6%
                  </span>
                )}

                {item.badgeType === "trend" && (
                  <span className="absolute top-1.5 right-2 text-[8.5px] font-black text-amber-300 uppercase tracking-wider leading-none shadow-xs">
                    Trend
                  </span>
                )}

                {item.badgeType === "signal" && (
                  <div className="absolute top-1.5 right-2 flex items-end gap-0.5 h-3">
                    <div className="w-0.5 h-1.5 bg-emerald-400 rounded-full" />
                    <div className="w-0.5 h-2 bg-emerald-400 rounded-full" />
                    <div className="w-0.5 h-3 bg-emerald-400 rounded-full" />
                  </div>
                )}

                {/* Top-right sparkline wave (for Logistics & Trend) */}
                {item.hasSparkline && (
                  <svg
                    className="absolute top-2.5 right-2 w-7 h-3.5 text-emerald-400"
                    viewBox="0 0 24 10"
                    fill="none"
                  >
                    <path
                      d="M1 8C5 8 8 2 13 2C18 2 20 1 23 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {item.hasAmberSparkline && (
                  <svg
                    className="absolute top-2.5 right-2 w-7 h-3.5 text-amber-400"
                    viewBox="0 0 24 10"
                    fill="none"
                  >
                    <path
                      d="M1 8C5 8 8 2 13 2C18 2 20 1 23 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {/* Large Icon or App Logo */}
                {customEmoji ? (
                  <span className="text-2xl sm:text-3xl leading-none drop-shadow-md shrink-0">{customEmoji}</span>
                ) : logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-lg drop-shadow-md shrink-0 transition-transform group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <Icon className={`h-8 w-8 sm:h-9 sm:w-9 drop-shadow-md shrink-0 transition-transform group-hover:scale-110 ${item.color}`} />
                )}

                {/* Text Label */}
                <span className="text-xs sm:text-[13px] font-black text-white text-center leading-tight w-full truncate drop-shadow px-0.5 tracking-tight">
                  {t(item.label, { defaultValue: item.fallbackLabel })}
                </span>
              </button>

              {/* Edit Mode Controls - High contrast & crystal clear */}
              {editMode && (
                <div className="absolute inset-0 rounded-[11px] pointer-events-none z-20">
                  <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => moveLeft(item.id)}
                      disabled={idx === 0}
                      className="w-4.5 h-4.5 rounded bg-black/90 border border-white/80 text-white flex items-center justify-center hover:bg-emerald-600 disabled:opacity-20 shadow-md transition-all cursor-pointer"
                      title="Move Left"
                    >
                      <ChevronLeft className="h-3 w-3 stroke-[3]" />
                    </button>
                  </div>

                  <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => startEmojiEdit(item.id)}
                      className="w-4.5 h-4.5 rounded bg-amber-400 border border-black/60 text-black flex items-center justify-center hover:bg-amber-300 shadow-md transition-all cursor-pointer"
                      title="Customize Icon"
                    >
                      <Pencil className="h-2.5 w-2.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="w-4.5 h-4.5 rounded bg-red-600 border border-white/90 text-white flex items-center justify-center hover:bg-red-500 shadow-md transition-all cursor-pointer"
                      title="Hide Shortcut"
                    >
                      <X className="h-3 w-3 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRight(item.id)}
                      disabled={idx === visibleItems.length - 1}
                      className="w-4.5 h-4.5 rounded bg-black/90 border border-white/80 text-white flex items-center justify-center hover:bg-emerald-600 disabled:opacity-20 shadow-md transition-all cursor-pointer"
                      title="Move Right"
                    >
                      <ChevronRight className="h-3 w-3 stroke-[3]" />
                    </button>
                  </div>

                  {isEditingThis && (
                    <div className="absolute inset-x-1 bottom-1 flex items-center gap-0.5 z-30 pointer-events-auto">
                      <input
                        autoFocus
                        value={emojiInput}
                        onChange={e => setEmojiInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") commitEmoji(item.id);
                          if (e.key === "Escape") setEditingEmoji(null);
                        }}
                        placeholder="emoji"
                        className="w-full text-[9px] text-center bg-black border border-amber-400 rounded px-1 py-0.5 text-white font-bold outline-none placeholder:text-white/60"
                      />
                      <button
                        type="button"
                        onClick={() => commitEmoji(item.id)}
                        className="w-4.5 h-4.5 rounded bg-emerald-500 text-black flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden Items in Edit Mode */}
      {editMode && hiddenItems.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-emerald-800/40">
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1.5">
            {t("nav.hidden")} — {t("home.restore_all")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hiddenItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => restore(item.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-dashed border-white/20 text-white/50 hover:text-white hover:bg-white/10 transition-all text-[9px] font-bold cursor-pointer"
                >
                  <Plus className="h-2.5 w-2.5" />
                  <Icon className="h-2.5 w-2.5" />
                  {t(item.label, { defaultValue: item.fallbackLabel })}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
