import { useState, useRef, useEffect, useCallback, memo, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Plus, MoreVertical, Pencil, Trash2, Globe, Check,
  X, RefreshCw, ChevronLeft, ChevronRight, ExternalLink,
  Crown, Sun, CloudRain, Shield, Sprout, Leaf, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Bookmark {
  id: string;
  name: string;
  url: string;
  color: string;
  iconType?: "gov" | "tnau" | "bbc" | "weather" | "brave" | "agri";
}

const LS_KEY = "agri-user-bookmarks-v3";
const LOCAL_BOOKMARK_FALLBACK_ICON = "/favicon-32x32.png";
const LOCAL_BOOKMARK_ICONS: Record<string, string> = {
  "agrimarket.gov.in": LOCAL_BOOKMARK_FALLBACK_ICON,
  "www.agrimarket.gov.in": LOCAL_BOOKMARK_FALLBACK_ICON,
};
const AGRICONNECT_HOSTS = new Set([
  "agriconnect.group",
  "www.agriconnect.group",
  "agri-connect-group-02we.onrender.com",
]);
const AGRICONNECT_RENDER_HOST_PATTERN =
  /^agri-connect(?:-group)?-[a-z0-9]+\.onrender\.com$/;

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: "gov-uk",    name: "Gov.UK",    url: "https://www.gov.uk",            color: "bg-[#0ea5e9]", iconType: "gov"     },
  { id: "gds",       name: "GDS",       url: "https://www.gov.uk/design-principles", color: "bg-[#64748b]", iconType: "gov" },
  { id: "fao",       name: "FAO",       url: "https://www.fao.org",           color: "bg-[#0284c7]", iconType: "agri"    },
  { id: "bbc-food",  name: "BBC Food",  url: "https://www.bbc.co.uk/food",    color: "bg-[#16a34a]", iconType: "bbc"     },
  { id: "brave",     name: "Brave",     url: "https://search.brave.com",      color: "bg-[#ea580c]", iconType: "brave"   },
  { id: "agri-site", name: "Agri Mkt",  url: "https://agrimarket.gov.in",     color: "bg-[#eab308]", iconType: "agri"    },
  { id: "gov-uk-2",  name: "Gov.UK",    url: "https://www.gov.uk",            color: "bg-[#0ea5e9]", iconType: "gov"     },
  { id: "gds-2",     name: "GDS",       url: "https://www.gov.uk",            color: "bg-[#475569]", iconType: "gov"     },
  { id: "tnau",      name: "TNAU",      url: "https://agritech.tnau.ac.in",   color: "bg-[#059669]", iconType: "tnau"    },
  { id: "weather",   name: "Weather",   url: "https://wttr.in/?format=html",  color: "bg-[#2563eb]", iconType: "weather" },
  { id: "bbc-food-2",name: "BBC Food",  url: "https://www.bbc.co.uk/food",    color: "bg-[#db2777]", iconType: "bbc"     },
  { id: "logistics", name: "Logistics", url: "/logistics",                    color: "bg-[#4f46e5]", iconType: "agri"    },
  { id: "brave-2",   name: "Brave",     url: "https://search.brave.com",      color: "bg-[#d97706]", iconType: "brave"   },
  { id: "bbc-food-3",name: "BBC Food",  url: "https://www.bbc.co.uk/food",    color: "bg-[#e11d48]", iconType: "bbc"     },
  { id: "weather-2", name: "Weather",   url: "https://wttr.in/?format=html",  color: "bg-[#3b82f6]", iconType: "weather" },
  { id: "agri-mkt-2",name: "Agri Mkt",  url: "https://agrimarket.gov.in",     color: "bg-[#ca8a04]", iconType: "agri"    },
];

const INLINE_PREVIEW_HOSTS = new Set([
  "gov.uk",
  "www.gov.uk",
  "agritech.tnau.ac.in",
  "bbc.co.uk",
  "www.bbc.co.uk",
  "wttr.in",
]);

function readBookmarks(): Bookmark[] {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? JSON.parse(v) : DEFAULT_BOOKMARKS;
  } catch { return DEFAULT_BOOKMARKS; }
}
function saveBookmarks(b: Bookmark[]) { localStorage.setItem(LS_KEY, JSON.stringify(b)); }

function isAgriConnectHost(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === window.location.hostname.toLowerCase() ||
    AGRICONNECT_HOSTS.has(normalizedHostname) ||
    AGRICONNECT_RENDER_HOST_PATTERN.test(normalizedHostname)
  );
}

function getFavicon(url: string) {
  try {
    const u = new URL(normalizeUrl(url));
    if (isAgriConnectHost(u.hostname)) {
      return LOCAL_BOOKMARK_FALLBACK_ICON;
    }
    return LOCAL_BOOKMARK_ICONS[u.hostname] ?? `${u.origin}/favicon.ico`;
  } catch { return ""; }
}
function getInitial(name: string) { return (name || "?").charAt(0).toUpperCase(); }
function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (isInternalPath(trimmed)) return trimmed;

  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : "https://" + trimmed;
  try {
    const parsed = new URL(withProtocol);
    if (LOCAL_BOOKMARK_ICONS[parsed.hostname]) parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return withProtocol;
  }
}
function isInternalPath(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}
function canUseInlinePreview(url: string) {
  try {
    return INLINE_PREVIEW_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isFirstPartyAgriConnectUrl(url: string) {
  try {
    const hostname = new URL(normalizeUrl(url)).hostname.toLowerCase();
    return isAgriConnectHost(hostname);
  } catch {
    return false;
  }
}
function handleFaviconError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true" || image.src.endsWith(LOCAL_BOOKMARK_FALLBACK_ICON)) {
    image.style.display = "none";
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = LOCAL_BOOKMARK_FALLBACK_ICON;
}

export const UserBookmarks = memo(function UserBookmarks() {
  const { t } = useTranslation();
  const [, setWouterLocation] = useLocation();
  const [bookmarks,  setBookmarks]  = useState<Bookmark[]>(readBookmarks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,    setEditing]    = useState<Bookmark | null>(null);
  const [form,       setForm]       = useState({ name: "", url: "" });

  const [panel, setPanel] = useState<{ open: boolean; url: string; title: string; favicon: string }>({
    open: false, url: "", title: "", favicon: "",
  });
  const [iframeKey,    setIframeKey]    = useState(0);
  const [panelHeight,  setPanelHeight]  = useState(() => Math.min(Math.floor(window.innerHeight * 0.78), 820));
  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const resizing    = useRef(false);
  const resizeStart = useRef({ y: 0, h: 0 });

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing.current) return;
    const dy = e.clientY - resizeStart.current.y;
    setPanelHeight(Math.max(220, resizeStart.current.h + dy));
  }, []);
  const onResizeUp = useCallback(() => { resizing.current = false; document.body.style.cursor = ""; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup",   onResizeUp);
    return () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup",   onResizeUp);
    };
  }, [onResizeMove, onResizeUp]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { y: e.clientY, h: panelHeight };
    document.body.style.cursor = "ns-resize";
  };

  const persist = (next: Bookmark[]) => { setBookmarks(next); saveBookmarks(next); };

  const openAdd  = () => { setEditing(null); setForm({ name: "", url: "" }); setDialogOpen(true); };
  const openEdit = (b: Bookmark) => { setEditing(b); setForm({ name: b.name, url: b.url }); setDialogOpen(true); };

  const saveDialog = () => {
    if (!form.name.trim()) return;
    const url = normalizeUrl(form.url);
    if (editing) {
      persist(bookmarks.map(b => b.id === editing.id ? { ...b, name: form.name.trim(), url } : b));
    } else {
      const nb: Bookmark = {
        id: Date.now().toString(),
        name: form.name.trim(),
        url,
        color: "bg-[#0284c7]",
      };
      persist([...bookmarks, nb]);
    }
    setDialogOpen(false);
  };

  const deleteBookmark = (id: string) => persist(bookmarks.filter(b => b.id !== id));

  const toProxyUrl = (raw: string) =>
    `/api/proxy?url=${encodeURIComponent(raw)}`;
  const toEmbeddedUrl = (raw: string) =>
    isFirstPartyAgriConnectUrl(raw) ? "/?embedded=1" : toProxyUrl(raw);

  const openPanel = (b: Bookmark) => {
    const url = normalizeUrl(b.url);
    if (!url) return;
    if (isInternalPath(b.url)) {
      setWouterLocation(b.url);
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    if (parsed.origin === window.location.origin) {
      setWouterLocation(`${parsed.pathname}${parsed.search}${parsed.hash}`);
      return;
    }

    if (!canUseInlinePreview(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setPanel({ open: true, url, title: b.name, favicon: getFavicon(b.url) });
    setIframeKey(k => k + 1);
  };

  const closePanel    = () => setPanel(p => ({ ...p, open: false }));
  const refreshIframe = () => setIframeKey(k => k + 1);
  const navBack       = () => { try { iframeRef.current?.contentWindow?.history.back();    } catch {} };
  const navForward    = () => { try { iframeRef.current?.contentWindow?.history.forward(); } catch {} };

  const renderIcon = (b: Bookmark) => {
    if (b.iconType === "gov") {
      return (
        <div className="flex flex-col items-center justify-center text-white">
          <Crown className="w-5 h-5 drop-shadow-xs" />
        </div>
      );
    }
    if (b.iconType === "tnau") {
      return (
        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shadow-2xs">
          <div className="w-full h-full rounded-full border border-emerald-600 flex items-center justify-center bg-emerald-50">
            <span className="text-[7px] font-black text-emerald-800 leading-none">TN</span>
          </div>
        </div>
      );
    }
    if (b.iconType === "bbc") {
      return (
        <div className="flex items-center gap-0.5 text-white">
          <div className="w-1.5 h-1.5 bg-white rounded-2xs" />
          <div className="w-1.5 h-1.5 bg-white rounded-2xs" />
          <div className="w-1.5 h-1.5 bg-white rounded-2xs" />
        </div>
      );
    }
    if (b.iconType === "weather") {
      return (
        <div className="flex flex-col items-center justify-center text-yellow-300">
          <CloudRain className="w-5 h-5 text-white" />
        </div>
      );
    }
    if (b.iconType === "brave") {
      return (
        <div className="w-6 h-6 rounded-md bg-emerald-950 flex items-center justify-center p-1">
          <Leaf className="w-4 h-4 text-emerald-400" />
        </div>
      );
    }
    if (b.iconType === "agri") {
      return (
        <div className="w-6 h-6 rounded-md bg-emerald-950 flex items-center justify-center p-1">
          <Sprout className="w-4 h-4 text-emerald-400" />
        </div>
      );
    }

    const favicon = getFavicon(b.url);
    if (favicon) {
      return (
        <img
          src={favicon}
          alt=""
          className="w-5 h-5 object-contain rounded-xs"
          loading="lazy"
          onError={handleFaviconError}
        />
      );
    }

    return <span className="text-sm font-black text-white">{getInitial(b.name)}</span>;
  };

  const [editMode, setEditMode] = useState(false);

  const moveLeft = (id: string) => {
    const idx = bookmarks.findIndex(b => b.id === id);
    if (idx <= 0) return;
    const next = [...bookmarks];
    const temp = next[idx - 1];
    next[idx - 1] = next[idx];
    next[idx] = temp;
    persist(next);
  };

  const moveRight = (id: string) => {
    const idx = bookmarks.findIndex(b => b.id === id);
    if (idx < 0 || idx >= bookmarks.length - 1) return;
    const next = [...bookmarks];
    const temp = next[idx + 1];
    next[idx + 1] = next[idx];
    next[idx] = temp;
    persist(next);
  };

  const resetDefaults = () => {
    persist(DEFAULT_BOOKMARKS);
    setEditMode(false);
  };

  return (
    <>
      <div className="w-full bg-[#081716]/78 backdrop-blur-md border border-slate-400/20 rounded-[18px] p-2.5 sm:p-3.5 shadow-[inset_0_1px_rgba(255,255,255,0.06),0_14px_30px_rgba(0,0,0,0.24)] relative z-10">
        {/* Header with MY SITES and Right Controls matching Quick Access */}
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs sm:text-sm font-black uppercase tracking-[0.14em] text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            {t("home.my_sites", { defaultValue: "MY SITES" })}
          </span>

          <div className="flex items-center gap-2">
            {editMode && (
              <button
                onClick={resetDefaults}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-[#0a2321] border border-emerald-700/40 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs"
                title="Reset to default sites"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}


            <button
              onClick={() => setEditMode(m => !m)}
              data-testid="my-sites-edit"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border transition-all shadow-xs cursor-pointer ${
                editMode
                  ? "bg-amber-400 text-amber-950 border-amber-400 shadow-amber-400/30"
                  : "bg-[#0c2927] text-emerald-300 border-emerald-600/60 hover:bg-[#123835] hover:border-emerald-400"
              }`}
            >
              {editMode ? (
                <><Check className="h-3.5 w-3.5 stroke-[2.5]" /> {t("nav.done", { defaultValue: "Done" })}</>
              ) : (
                <><Pencil className="h-3.5 w-3.5" /> Edit</>
              )}
            </button>
          </div>
        </div>

        {/* 10-Column Responsive Grid matching Quick Access */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-1.5">
          {bookmarks.map((b, idx) => {
            const isActive = panel.open && panel.url === normalizeUrl(b.url);

            return (
              <div key={b.id + idx} className="relative group min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (editMode) {
                      openEdit(b);
                    } else {
                      openPanel(b);
                    }
                  }}
                  data-testid={`bookmark-${b.id}`}
                  className={`relative w-full h-[52px] sm:h-[55px] flex flex-col items-center justify-center gap-0.5 rounded-[11px] border transition-all duration-150 py-1 px-1.5 shadow-md cursor-pointer group-hover:-translate-y-0.5 ${
                    editMode
                      ? "bg-[#0c2e2a] border-2 border-amber-400 text-white shadow-amber-400/20"
                      : isActive
                      ? "ring-2 ring-emerald-400 bg-[#123835] border-emerald-400 text-white"
                      : "bg-[#0a2321] hover:bg-[#103330] border-emerald-700/50 hover:border-emerald-400/90 text-white active:scale-95"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center overflow-hidden shrink-0 shadow-xs"
                  >
                    {renderIcon(b)}
                  </div>
                  <span className="text-[10.5px] sm:text-xs font-black text-white text-center leading-tight w-full truncate drop-shadow px-0.5">
                    {b.name}
                  </span>
                </button>

                {/* Edit Mode Controls - High contrast & crystal clear */}
                {editMode && (
                  <div className="absolute inset-0 rounded-[11px] pointer-events-none z-20">
                    <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveLeft(b.id); }}
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
                        onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                        className="w-4.5 h-4.5 rounded bg-amber-400 border border-black/60 text-black flex items-center justify-center hover:bg-amber-300 shadow-md transition-all cursor-pointer"
                        title="Edit Site Name & URL"
                      >
                        <Pencil className="h-2.5 w-2.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteBookmark(b.id); }}
                        className="w-4.5 h-4.5 rounded bg-red-600 border border-white/90 text-white flex items-center justify-center hover:bg-red-500 shadow-md transition-all cursor-pointer"
                        title="Delete Site"
                      >
                        <X className="h-3 w-3 stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveRight(b.id); }}
                        disabled={idx === bookmarks.length - 1}
                        className="w-4.5 h-4.5 rounded bg-black/90 border border-white/80 text-white flex items-center justify-center hover:bg-emerald-600 disabled:opacity-20 shadow-md transition-all cursor-pointer"
                        title="Move Right"
                      >
                        <ChevronRight className="h-3 w-3 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Site Tile (Card) */}
          <button
            type="button"
            onClick={openAdd}
            data-testid="bookmark-add-new"
            className="w-full h-[52px] sm:h-[55px] flex flex-col items-center justify-center gap-0.5 rounded-[11px] border border-dashed border-emerald-400/70 bg-[#061917]/90 hover:bg-[#0a2724] hover:border-emerald-300 transition-all text-white py-1 px-1.5 shadow-xs cursor-pointer group hover:-translate-y-0.5 active:scale-95"
          >
            <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform stroke-[2.5]" />
            <span className="text-[10.5px] sm:text-xs font-black text-white text-center leading-tight">
              Add Site
            </span>
          </button>
        </div>

        {/* ── Inline mini-browser panel ── */}
        {panel.open && (
          <div
            className="mt-3 rounded-xl overflow-hidden border border-white/20 shadow-2xl flex flex-col"
            style={{ height: panelHeight, minHeight: 220 }}
            data-testid="browser-panel"
          >
            {/* Title bar / traffic lights */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/95 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={closePanel}
                  className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors border border-black/20 cursor-pointer"
                  title={t("common.close")}
                  data-testid="browser-close"
                />
                <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/20" />
                <div className="w-3 h-3 rounded-full bg-[#28c840] border border-black/20" />
              </div>

              {/* Nav buttons */}
              <button
                onClick={navBack}
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
                title={t("nav.go_back")}
                data-testid="browser-back"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={navForward}
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
                title={t("nav.go_forward")}
                data-testid="browser-forward"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={refreshIframe}
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
                title="Refresh"
                data-testid="browser-refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </button>

              {/* URL bar */}
              <div className="flex-1 flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-zinc-700/70 border border-white/10 text-[10px] text-white/60 truncate mx-1 min-w-0">
                <Globe className="h-2.5 w-2.5 shrink-0 text-white/40" />
                <span className="truncate">{panel.url}</span>
              </div>

              {/* Open externally */}
              <button
                onClick={() => window.open(panel.url, "_blank", "noopener,noreferrer")}
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Open in browser"
                data-testid="browser-open-external"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            {/* Tab strip */}
            <div className="flex items-center px-2 py-1 bg-zinc-900/95 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-t-md bg-zinc-700/60 border border-white/10 border-b-0 text-[10px] text-white/70 max-w-[180px]">
                {panel.favicon ? (
                  <img src={panel.favicon} alt="" className="w-3 h-3 object-contain" loading="lazy" onError={handleFaviconError} />
                ) : (
                  <Globe className="h-2.5 w-2.5 text-white/40 shrink-0" />
                )}
                <span className="truncate">{panel.title}</span>
                <button
                  onClick={closePanel}
                  className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            {/* iframe */}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={toEmbeddedUrl(panel.url)}
              title={panel.title}
              className="w-full flex-1 bg-white"
              style={{ border: "none", display: "block", minHeight: 0 }}
              data-testid="browser-iframe"
            />

            {/* Resize handle */}
            <div
              onMouseDown={startResize}
              className="relative h-9 w-full shrink-0 flex flex-col items-center justify-center gap-1 cursor-ns-resize select-none group bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 border-t border-emerald-500/40"
              data-testid="browser-resize-handle"
            >
              <div className="h-1 w-10 rounded-full bg-emerald-300/60 group-hover:bg-emerald-200 transition-colors" />
              <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-200/80 leading-none">
                {t("map.drag_to_resize", { defaultValue: "DRAG TO RESIZE" })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? t("nav.edit") + " Site" : "Add Site"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the bookmark name or destination."
                : "Add a website or an AgriConnect page to your sites."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bm-name" className="text-xs">Name</Label>
              <Input
                id="bm-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="GOV.UK"
                className="h-8 text-sm"
                data-testid="input-bookmark-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bm-url" className="text-xs">URL</Label>
              <Input
                id="bm-url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com or /page"
                className="h-8 text-sm"
                data-testid="input-bookmark-url"
                onKeyDown={e => { if (e.key === "Enter") saveDialog(); }}
              />
              <p className="text-[10px] text-muted-foreground">
                Use a full URL (https://…) for external sites, or a path (/map) for AgriConnect pages.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={saveDialog} disabled={!form.name.trim()} data-testid="button-bookmark-save">
              <Check className="h-3.5 w-3.5 mr-1" />
              {editing ? t("common.save") : "Add site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
