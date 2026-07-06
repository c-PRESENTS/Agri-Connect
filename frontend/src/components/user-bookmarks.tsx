import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Plus, MoreVertical, Pencil, Trash2, Globe, Check,
  X, RefreshCw, ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Bookmark {
  id: string;
  name: string;
  url: string;
  color: string;
}

const LS_KEY = "agri-user-bookmarks";
const COLORS = [
  "bg-sky-500","bg-violet-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-blue-500","bg-green-500","bg-orange-500",
];

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: "gov-uk",    name: "GOV.UK",        url: "https://www.gov.uk",            color: "bg-sky-500"     },
  { id: "tnau",      name: "TNAU Agritech", url: "https://agritech.tnau.ac.in",   color: "bg-emerald-500" },
  { id: "bbc-food",  name: "BBC Food",      url: "https://www.bbc.co.uk/food",    color: "bg-rose-500"    },
  { id: "weather",   name: "Weather",       url: "https://wttr.in/?format=html",  color: "bg-blue-500"    },
  { id: "brave",     name: "Brave Search",  url: "https://search.brave.com",      color: "bg-orange-500"  },
  { id: "markets",   name: "Agri Markets",  url: "https://www.agrimarket.gov.in", color: "bg-amber-500"   },
];

function readBookmarks(): Bookmark[] {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? JSON.parse(v) : DEFAULT_BOOKMARKS;
  } catch { return DEFAULT_BOOKMARKS; }
}
function saveBookmarks(b: Bookmark[]) { localStorage.setItem(LS_KEY, JSON.stringify(b)); }

function getFavicon(url: string) {
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
  } catch { return ""; }
}
function getInitial(name: string) { return (name || "?").charAt(0).toUpperCase(); }
function normalizeUrl(url: string) {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://") ? url : "https://" + url;
}
function isInternalPath(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}

export function UserBookmarks() {
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
        color: COLORS[bookmarks.length % COLORS.length],
      };
      persist([...bookmarks, nb]);
    }
    setDialogOpen(false);
  };

  const deleteBookmark = (id: string) => persist(bookmarks.filter(b => b.id !== id));

  const toProxyUrl = (raw: string) =>
    `/api/proxy?url=${encodeURIComponent(raw)}`;

  const openPanel = (b: Bookmark) => {
    const url = normalizeUrl(b.url);
    if (!url) return;
    if (isInternalPath(b.url)) {
      setWouterLocation(b.url);
      return;
    }
    setPanel({ open: true, url, title: b.name, favicon: getFavicon(b.url) });
    setIframeKey(k => k + 1);
  };

  const closePanel    = () => setPanel(p => ({ ...p, open: false }));
  const refreshIframe = () => setIframeKey(k => k + 1);
  const navBack       = () => { try { iframeRef.current?.contentWindow?.history.back();    } catch {} };
  const navForward    = () => { try { iframeRef.current?.contentWindow?.history.forward(); } catch {} };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{t("home.my_sites")}</span>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
            data-testid="bookmark-add-btn"
          >
            <Plus className="h-2.5 w-2.5" /> {t("home.add_site")}
          </button>
        </div>

        <div className="flex gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap">
          {bookmarks.map(b => {
            const favicon = getFavicon(b.url);
            const isActive = panel.open && panel.url === normalizeUrl(b.url);
            return (
              <div key={b.id} className="relative group shrink-0">
                <button
                  onClick={() => openPanel(b)}
                  data-testid={`bookmark-${b.id}`}
                  className={`flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-md sm:rounded-lg transition-all duration-150 w-12 sm:w-14 ${
                    isActive
                      ? "bg-white/10 scale-[1.05]"
                      : "hover:bg-white/8 active:scale-95"
                  }`}
                >
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center overflow-hidden ${b.color} shadow-sm`}>
                    {favicon
                      ? <img src={favicon} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <span className="text-xs sm:text-sm font-black text-white">{getInitial(b.name)}</span>
                    }
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-medium text-white/60 text-center leading-none w-full truncate">
                    {b.name}
                  </span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      data-testid={`bookmark-opts-${b.id}`}
                    >
                      <MoreVertical className="h-2.5 w-2.5 text-white/70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => openEdit(b)} className="text-xs gap-2">
                      <Pencil className="h-3 w-3" /> {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openPanel(b)} className="text-xs gap-2">
                      <Globe className="h-3 w-3" /> Open site
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteBookmark(b.id)} className="text-xs gap-2 text-destructive">
                      <Trash2 className="h-3 w-3" /> {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          <button
            onClick={openAdd}
            data-testid="bookmark-add-new"
            className="flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-dashed border-white/20 bg-white/3 hover:border-white/40 hover:bg-white/8 transition-all min-w-[52px] sm:min-w-[60px] shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border border-dashed border-white/30 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/50" />
            </div>
            <span className="text-[7px] sm:text-[8px] font-bold text-white/40">{t("home.add_site")}</span>
          </button>
        </div>

        {/* ── Inline mini-browser panel ── */}
        {panel.open && (
          <div
            className="mt-2 rounded-xl overflow-hidden border border-white/15 shadow-2xl flex flex-col"
            style={{ height: panelHeight, minHeight: 220 }}
            data-testid="browser-panel"
          >
            {/* Title bar / traffic lights */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/95 border-b border-white/10 shrink-0">
              {/* macOS traffic-light dots */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={closePanel}
                  className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors border border-black/20"
                  title={t("common.close")}
                  data-testid="browser-close"
                />
                <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/20" />
                <div className="w-3 h-3 rounded-full bg-[#28c840] border border-black/20" />
              </div>

              {/* Nav buttons */}
              <button
                onClick={navBack}
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
                title={t("nav.go_back")}
                data-testid="browser-back"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={navForward}
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
                title={t("nav.go_forward")}
                data-testid="browser-forward"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={refreshIframe}
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
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
                className="p-1 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors shrink-0"
                title="Open in browser"
                data-testid="browser-open-external"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            {/* Tab strip */}
            <div className="flex items-center px-2 py-1 bg-zinc-900/95 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-t-md bg-zinc-700/60 border border-white/10 border-b-0 text-[10px] text-white/70 max-w-[180px]">
                {panel.favicon
                  ? <img src={panel.favicon} alt="" className="w-3 h-3 object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  : <Globe className="h-2.5 w-2.5 text-white/40 shrink-0" />
                }
                <span className="truncate">{panel.title}</span>
                <button
                  onClick={closePanel}
                  className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors shrink-0"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            {/* iframe */}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={toProxyUrl(panel.url)}
              title={panel.title}
              className="w-full flex-1 bg-white"
              style={{ border: "none", display: "block", minHeight: 0 }}
              data-testid="browser-iframe"
            />

            {/* ── Resize handle ── */}
            <div
              onMouseDown={startResize}
              className="relative h-10 w-full shrink-0 flex flex-col items-center justify-center gap-1.5 cursor-ns-resize select-none group"
              style={{ background: "linear-gradient(180deg, #14532d 0%, #166534 60%, #15803d 100%)", boxShadow: "0 -2px 10px rgba(34,197,94,0.25)" }}
              data-testid="browser-resize-handle"
            >
              {/* top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-green-400/60 group-hover:bg-green-300 transition-colors" />

              {/* grip bar */}
              <div className="flex gap-[4px] items-center">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-100 group-hover:scale-[1.4] group-hover:bg-green-200"
                    style={{
                      width: i === 0 || i === 11 ? 3 : 4,
                      height: i === 0 || i === 11 ? 3 : 4,
                      background: "rgba(187,247,208,0.7)",
                    }}
                  />
                ))}
              </div>

              {/* label row */}
              <div className="flex items-center gap-2">
                <div className="h-[1.5px] w-12 rounded-full bg-green-300/50 group-hover:bg-green-200/90 transition-colors" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-green-200/80 group-hover:text-white transition-colors leading-none drop-shadow">
                  {t("map.drag_to_resize")}
                </span>
                <div className="h-[1.5px] w-12 rounded-full bg-green-300/50 group-hover:bg-green-200/90 transition-colors" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? t("nav.edit") + " Site" : t("home.add_site")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bm-name" className="text-xs">Name</Label>
              <Input
                id="bm-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="BBC Food"
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
              {editing ? t("common.save") : t("home.add_site")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
