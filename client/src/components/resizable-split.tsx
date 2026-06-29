import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

export interface ResizableSplitProps {
  left: ReactNode;
  right: ReactNode;
  /** Initial width of the right rail in pixels. */
  initialRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  storageKey?: string;
}

/**
 * Two-pane horizontal split with a visible, draggable divider in the middle.
 * - Left side flexes to fill remaining space.
 * - Right side has a controllable, persisted pixel width.
 * - On <lg screens the right pane is hidden so products take the full width.
 */
export function ResizableSplit({
  left,
  right,
  initialRightWidth = 380,
  minRightWidth = 280,
  maxRightWidth = 640,
  storageKey = "agri-rail-width",
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = useState<number>(() => {
    if (typeof window === "undefined") return initialRightWidth;
    const saved = window.localStorage.getItem(storageKey);
    const n = saved ? parseInt(saved, 10) : NaN;
    return Number.isFinite(n) ? Math.min(Math.max(n, minRightWidth), maxRightWidth) : initialRightWidth;
  });
  const [isDragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = Math.min(
        Math.max(rect.right - e.clientX, minRightWidth),
        Math.min(maxRightWidth, rect.width - 320)
      );
      setRightWidth(next);
    };
    const onUp = () => {
      setDragging(false);
      try {
        window.localStorage.setItem(storageKey, String(rightWidth));
      } catch {}
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, minRightWidth, maxRightWidth, rightWidth, storageKey]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden flex" data-testid="split-resizable">
      {/* LEFT pane */}
      <div className="flex-1 min-w-0 overflow-hidden">{left}</div>

      {/* DIVIDER — always visible, very clearly draggable */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={startDrag}
        title="Drag to resize"
        data-testid="handle-rail-resize"
        className={`hidden lg:flex flex-col items-center justify-center w-2.5 cursor-col-resize group shrink-0 border-l border-r bg-muted/40 hover:bg-primary/15 transition-colors relative z-20 ${
          isDragging ? "bg-primary/20" : ""
        }`}
      >
        <div
          className={`flex items-center justify-center h-14 w-6 -mx-2 rounded-full bg-background border shadow-md group-hover:border-primary group-hover:shadow-lg transition ${
            isDragging ? "border-primary shadow-lg" : ""
          }`}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
        </div>
      </div>

      {/* RIGHT pane */}
      <aside
        className="hidden lg:flex flex-col bg-muted/10 shrink-0 overflow-y-auto"
        style={{ width: rightWidth }}
        data-testid="rail-resizable-right"
      >
        <div className="p-3">{right}</div>
      </aside>
    </div>
  );
}
