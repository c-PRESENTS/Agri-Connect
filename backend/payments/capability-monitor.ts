import { paymentOperationsRepository } from "../repositories/payment-operations-repository";

export class CapabilityMonitor {
  async inspectProvider(provider: string, at = new Date()): Promise<"active" | "suspended"> {
    const config = await paymentOperationsRepository.getProviderConfig(provider);
    if (!config) return "suspended";
    const capabilities = await paymentOperationsRepository.getCurrentProviderCapabilities(provider, at);
    if (!capabilities || (config.expiresAt && config.expiresAt <= at)) {
      await paymentOperationsRepository.suspendProvider(provider, "capability_or_approval_stale");
      return "suspended";
    }
    return config.status === "active" || config.status === "sandbox_ready" ? "active" : "suspended";
  }

  async inspectConfiguredProviders(at = new Date()): Promise<void> {
    const providers = await paymentOperationsRepository.listProviderConfigs();
    for (const provider of providers) {
      await this.inspectProvider(provider.provider, at);
    }
  }

  start(intervalMinutes: number): () => void {
    const timer = setInterval(() => {
      this.inspectConfiguredProviders().catch((error) => {
        console.error("[payments] capability monitor failed", error instanceof Error ? error.message : error);
      });
    }, intervalMinutes * 60_000);
    timer.unref();
    return () => clearInterval(timer);
  }
}

export const capabilityMonitor = new CapabilityMonitor();
