import { regionalMarketplaceRepository } from "../repositories/regional-marketplace-repository";

class OpportunityMonitor {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  start(): void {
    if (this.timer || process.env.OPPORTUNITY_MONITOR_ENABLED === "false") return;
    const minutes = Math.min(1_440, Math.max(5, Number(process.env.OPPORTUNITY_SCAN_INTERVAL_MINUTES || 15)));
    this.timer = setInterval(() => void this.run(), minutes * 60_000);
    this.timer.unref?.();
    setTimeout(() => void this.run(), 15_000).unref?.();
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await regionalMarketplaceRepository.scanOpportunities();
    } catch (error) {
      console.error("Regional opportunity scan failed", error);
    } finally {
      this.running = false;
    }
  }
}

export const opportunityMonitor = new OpportunityMonitor();
