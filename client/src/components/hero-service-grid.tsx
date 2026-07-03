import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Map, Sprout, Cpu, Landmark, Truck, HeartHandshake,
  LayoutDashboard, Camera, Settings,
  ShoppingBasket, Wrench, Package, Star, Wheat, Store, Cog,
  Building2, Heart, Factory, Leaf, BadgeDollarSign,
  Pencil, X, ChevronLeft, ChevronRight, Check, RotateCcw, Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ALL_ITEMS = [
  { id: "seller",     path: "/seller",                    icon: BadgeDollarSign, label: "home.seller_hub",    color: "text-yellow-400",  public: true  },
  { id: "sell",       path: "/dashboard/photo-sell",      icon: Camera,          label: "home.sell_list",     color: "text-emerald-400", public: false },
  { id: "daily",      path: "/?category=daily-needs",      icon: ShoppingBasket,  label: "category.daily",     color: "text-green-400",   public: true  },
  { id: "map",        path: "/map",                        icon: Map,             label: "home.smart_map",     color: "text-sky-400",     public: true  },
  { id: "help",       path: "/farmers-help",               icon: Sprout,          label: "nav.help",           color: "text-lime-400",    public: true  },
  { id: "dash",       path: "/dashboard",                  icon: LayoutDashboard, label: "nav.dashboard",      color: "text-violet-400",  public: false },
  { id: "settings",   path: "/settings",                   icon: Settings,        label: "nav.settings",       color: "text-slate-300",   public: false },
  { id: "inputs",     path: "/?category=inputs-tools",     icon: Wrench,          label: "category.inputs",    color: "text-blue-400",    public: true  },
  { id: "processed",  path: "/?category=processed",        icon: Package,         label: "category.processed", color: "text-amber-400",   public: true  },
  { id: "specialty",  path: "/?category=specialty",        icon: Star,            label: "category.specialty", color: "text-yellow-400",  public: true  },
  { id: "other",      path: "/?category=other-agri",       icon: Wheat,           label: "category.other_agri",color: "text-yellow-300",  public: true  },
  { id: "super",      path: "/?category=supermarket",      icon: Store,           label: "home.supermarket",   color: "text-purple-400",  public: true  },
  { id: "services",   path: "/?category=services",         icon: Cog,             label: "category.services",  color: "text-gray-300",    public: true  },
  { id: "schemes",    path: "/government-schemes",         icon: Building2,       label: "home.govt_schemes",  color: "text-indigo-400",  public: true  },
  { id: "agritech",   path: "/agritech",                   icon: Cpu,             label: "home.agritech",      color: "text-cyan-400",    public: true  },
  { id: "dietary",    path: "/?category=dietary",          icon: Heart,           label: "category.dietary",   color: "text-pink-400",    public: true  },
  { id: "land",       path: "/land-leasing",               icon: Landmark,        label: "nav.land",           color: "text-emerald-300", public: true  },
  { id: "logistics",  path: "/logistics",                  icon: Truck,           label: "home.logistics",     color: "text-blue-300",    public: true  },
  { id: "share",      path: "/share-care",                 icon: HeartHandshake,  label: "nav.share",          color: "text-rose-400",    public: true  },
  { id: "commercial", path: "/?category=commercial-crops", icon: Factory,         label: "category.commercial",color: "text-slate-400",   public: true  },
  { id: "bio",        path: "/?category=bio-products",     icon: Leaf,            label: "category.bio",       color: "text-teal-400",    public: true  },
];

const LS_ORDER  = "agri-nav-order";
const LS_HIDDEN = "agri-nav-hidden";
const LS_EMOJIS = "agri-nav-emojis";
const LS_VER    = "agri-nav-ver";
const ITEMS_VER = "v5";

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

export function HeroServiceGrid() {
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
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-0.5">
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{t("home.quick_access")}</span>
        <div className="flex items-center gap-1.5">
          {editMode && (
            <button
              onClick={reset}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-white/50 hover:text-white/80 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
            >
              <RotateCcw className="h-2.5 w-2.5" /> {t("nav.reset")}
            </button>
          )}
          <button
            onClick={() => { setEditMode(v => !v); setEditingEmoji(null); }}
            data-testid="hero-services-edit"
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-bold border transition-all shadow-sm ${
              editMode
                ? "bg-primary text-primary-foreground border-primary shadow-primary/30"
                : "bg-white/10 text-white/80 border-white/20 hover:bg-white/18 hover:border-white/35 hover:text-white"
            }`}
          >
            {editMode
              ? <><Check className="h-3 w-3" /> {t("nav.done")}</>
              : <><Pencil className="h-3 w-3" /> {t("nav.edit")}</>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-1.5 sm:gap-1.5">
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          const customEmoji = emojis[item.id];
          const isEditingThis = editingEmoji === item.id;
          return (
            <div key={item.id} className="relative group min-w-0">
              <button
                onClick={() => { if (!editMode) setLocation(item.path); }}
                data-testid={`nav-${item.id}`}
                className={`w-full h-[58px] sm:h-[64px] flex flex-col items-center justify-center gap-1 rounded-lg sm:rounded-xl border transition-all duration-150 py-1.5 sm:py-2 px-0.5 bg-white/[0.07] ${
                  editMode
                    ? "border-white/10 cursor-default"
                    : "border-white/10 hover:border-white/30 hover:bg-white/[0.12] hover:scale-[1.05] active:scale-95 cursor-pointer"
                }`}
              >
                {customEmoji
                  ? <span className="text-base sm:text-base leading-none drop-shadow flex-shrink-0">{customEmoji}</span>
                  : <Icon className={`h-[18px] w-[18px] sm:h-[17px] sm:w-[17px] drop-shadow flex-shrink-0 ${item.color}`} />
                }
                <span className="text-[9px] sm:text-[8px] font-bold text-white/85 text-center leading-[1.1] w-full truncate drop-shadow px-0.5">
                  {t(item.label)}
                </span>
              </button>

              {editMode && (
                <div className="absolute inset-0 flex flex-col rounded-lg sm:rounded-xl overflow-hidden z-20">
                  <div className="flex items-center justify-between px-0.5 pt-0.5 gap-0.5">
                    <button onClick={() => moveLeft(item.id)} disabled={idx === 0}
                      className="w-4 h-4 rounded flex items-center justify-center bg-black/60 text-white/70 hover:text-white disabled:opacity-20 transition-all">
                      <ChevronLeft className="h-2.5 w-2.5" />
                    </button>
                    <button onClick={() => remove(item.id)}
                      className="w-4 h-4 rounded flex items-center justify-center bg-red-500/80 text-white hover:bg-red-500 transition-all">
                      <X className="h-2.5 w-2.5" />
                    </button>
                    <button onClick={() => moveRight(item.id)} disabled={idx === visibleItems.length - 1}
                      className="w-4 h-4 rounded flex items-center justify-center bg-black/60 text-white/70 hover:text-white disabled:opacity-20 transition-all">
                      <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="flex-1 flex items-end justify-center pb-0.5">
                    {isEditingThis ? (
                      <div className="flex items-center gap-0.5 px-0.5 w-full">
                        <input autoFocus value={emojiInput} onChange={e => setEmojiInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") commitEmoji(item.id); if (e.key === "Escape") setEditingEmoji(null); }}
                          placeholder="emoji"
                          className="w-full text-[8px] text-center bg-black/70 border border-white/30 rounded px-1 py-0.5 text-white outline-none placeholder:text-white/30"
                        />
                        <button onClick={() => commitEmoji(item.id)} className="w-4 h-4 rounded bg-primary/80 flex items-center justify-center flex-shrink-0">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEmojiEdit(item.id)}
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/50 text-white/60 hover:text-white hover:bg-black/70 transition-all text-[7px] font-bold">
                        <Pencil className="h-1.5 w-1.5" /> ico
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editMode && hiddenItems.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-white/10">
          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1.5">{t("nav.hidden")} — {t("home.restore_all")}</p>
          <div className="flex flex-wrap gap-1">
            {hiddenItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => restore(item.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-dashed border-white/15 text-white/35 hover:text-white/70 hover:bg-white/10 transition-all text-[8px] font-bold">
                  <Plus className="h-2 w-2" /><Icon className="h-2 w-2" />{item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
