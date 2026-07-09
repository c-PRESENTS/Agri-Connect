import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "frontend", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "frontend", "src", "assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "frontend"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const normalizedId = id.replace(/\\/g, "/");

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          if (normalizedId.includes("/node_modules/@radix-ui/")) {
            return "vendor-radix";
          }

          if (normalizedId.includes("/node_modules/lucide-react/")) {
            return "vendor-lucide";
          }

          if (normalizedId.includes("/node_modules/react-icons/")) {
            if (normalizedId.includes("/node_modules/react-icons/si/")) {
              return "vendor-icons-simple";
            }

            if (normalizedId.includes("/node_modules/react-icons/fa/")) {
              return "vendor-icons-fa";
            }

            return "vendor-react-icons";
          }

          if (
            normalizedId.includes("/node_modules/cmdk/") ||
            normalizedId.includes("/node_modules/vaul/") ||
            normalizedId.includes("/node_modules/embla-carousel-react/") ||
            normalizedId.includes("/node_modules/input-otp/") ||
            normalizedId.includes("/node_modules/react-day-picker/") ||
            normalizedId.includes("/node_modules/react-resizable-panels/")
          ) {
            return "vendor-interactions";
          }

          if (
            normalizedId.includes("/node_modules/class-variance-authority/") ||
            normalizedId.includes("/node_modules/clsx/") ||
            normalizedId.includes("/node_modules/tailwind-merge/")
          ) {
            return "vendor-ui-utils";
          }

          if (
            normalizedId.includes("/node_modules/wouter/")
          ) {
            return "vendor-router";
          }

          if (
            normalizedId.includes("/node_modules/leaflet/") ||
            normalizedId.includes("/node_modules/react-leaflet/")
          ) {
            return "vendor-maps";
          }

          if (normalizedId.includes("/node_modules/framer-motion/")) {
            return "vendor-motion";
          }

          if (normalizedId.includes("/node_modules/recharts/")) {
            return "vendor-charts";
          }

          if (
            normalizedId.includes("/node_modules/i18next/") ||
            normalizedId.includes("/node_modules/react-i18next/") ||
            normalizedId.includes("/node_modules/i18next-browser-languagedetector/")
          ) {
            return "vendor-i18n";
          }

          if (normalizedId.includes("/node_modules/@tanstack/react-query/")) {
            return "vendor-query";
          }

          if (
            normalizedId.includes("/node_modules/stripe/") ||
            normalizedId.includes("/node_modules/@stripe/")
          ) {
            return "vendor-payments";
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
