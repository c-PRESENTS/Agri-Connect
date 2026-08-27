import React from "react";
import { Sparkles } from "lucide-react";

export function AgriEmblemIcon({
  className = "h-5 w-5",
  variant = "emerald",
}: {
  className?: string;
  variant?: "emerald" | "lime" | "gold" | "white";
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="agri-leaf-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a3e635" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="agri-gold-grad" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="agri-ring-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Subtle Outer Orbital Ring */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="url(#agri-ring-grad)"
        strokeWidth="1.2"
        strokeDasharray="2 2"
        className="opacity-70"
      />

      {/* Intertwined Sovereign Harvest Wheat & Sprout Leaves */}
      {/* Left Sprout Leaf */}
      <path
        d="M16 26C16 26 8 22 8 13.5C8 9 11.5 5.5 16 5C16 10 13 14 16 26Z"
        fill="url(#agri-leaf-grad)"
        opacity="0.95"
      />

      {/* Right Golden Sprout / Wheat Kernel */}
      <path
        d="M16 26C16 26 24 22 24 13.5C24 9 20.5 5.5 16 5C16 11 19 15 16 26Z"
        fill={variant === "gold" ? "url(#agri-gold-grad)" : "url(#agri-leaf-grad)"}
      />

      {/* Center Harvest Stem Line */}
      <path
        d="M16 6V27"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Golden Sunlight Seed Crown */}
      <circle cx="16" cy="5" r="2" fill="#fde047" />
      <path d="M13 10L16 7L19 10" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15L16 12L20 15" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AgriBrandLogo({
  size = "md",
  theme = "dark",
  showTagline = true,
  onClick,
}: {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light" | "emerald";
  showTagline?: boolean;
  onClick?: () => void;
}) {
  const sizeStyles = {
    sm: { box: "h-7 w-7", icon: "h-4 w-4", title: "text-xs", subtitle: "text-[8px]" },
    md: { box: "h-9 w-9", icon: "h-5 w-5", title: "text-sm font-black", subtitle: "text-[9px]" },
    lg: { box: "h-11 w-11", icon: "h-6 w-6", title: "text-base font-black", subtitle: "text-[10px]" },
  }[size];

  const themeStyles = {
    dark: {
      text: "text-white",
      subtext: "text-emerald-200/80",
      boxBg: "bg-gradient-to-br from-[#064238] via-[#094d42] to-[#12584c] border border-lime-400/30 shadow-md shadow-emerald-950/20",
    },
    light: {
      text: "text-slate-900",
      subtext: "text-emerald-700 font-bold",
      boxBg: "bg-gradient-to-br from-emerald-50 via-lime-50 to-emerald-100 border border-emerald-200 shadow-sm",
    },
    emerald: {
      text: "text-[#053f36]",
      subtext: "text-emerald-600 font-bold",
      boxBg: "bg-gradient-to-br from-[#042f28] to-[#0d604e] border border-lime-400/40 shadow-sm",
    },
  }[theme];

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2.5 select-none ${onClick ? "cursor-pointer transition hover:opacity-90" : ""}`}
    >
      {/* Insignia Emblem Badge */}
      <div className={`relative flex ${sizeStyles.box} shrink-0 items-center justify-center rounded-xl ${themeStyles.boxBg}`}>
        <AgriEmblemIcon className={sizeStyles.icon} />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-lime-400 ring-2 ring-[#053f36]" />
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`tracking-tight ${sizeStyles.title} ${themeStyles.text}`}>
            AgriConnect
          </span>
          <span className="rounded bg-lime-400/20 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-lime-400 border border-lime-400/30">
            PRO
          </span>
        </div>
        {showTagline && (
          <p className={`mt-0.5 tracking-wide leading-none ${sizeStyles.subtitle} ${themeStyles.subtext}`}>
            Agricultural Trade Network
          </p>
        )}
      </div>
    </div>
  );
}

export function AgriControlCentreBadge({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2.5 rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-1.5 shadow-xs transition hover:border-emerald-500/30 hover:bg-emerald-50/40 ${
        onClick ? "cursor-pointer" : ""
      }`}
      title="AgriConnect Organisation Control Centre"
    >
      {/* Luxury Agrarian Insignia Seal */}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#053f36] via-[#084d41] to-[#0d604e] shadow-sm shadow-emerald-950/20 border border-lime-400/30">
        <AgriEmblemIcon className="h-4.5 w-4.5" />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-lime-400 ring-1 ring-white" />
      </div>

      {/* Clean Premium Typography */}
      <div className="leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-[#053f36] tracking-tight">
            Organisation Control Centre
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wider text-emerald-800 border border-emerald-200">
            Authoritative
          </span>
        </div>
        <p className="text-[9px] font-bold text-slate-500 tracking-wide">
          Enterprise Agrarian Super-Admin Suite
        </p>
      </div>
    </div>
  );
}
