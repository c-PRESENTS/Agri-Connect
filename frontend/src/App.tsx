import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppContent } from "@/app/app-content";
import "@/i18n/index";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="agriconnect-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
