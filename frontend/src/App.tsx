import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppContent } from "@/app/app-content";
import "@/i18n/index";
import { CurrencyProvider } from "@/contexts/currency-context";
import { LiveLocationProvider } from "@/contexts/live-location-context";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="agriconnect-theme">
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <LiveLocationProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </LiveLocationProvider>
        </CurrencyProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
