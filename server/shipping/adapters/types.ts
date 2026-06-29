import type { Shipment } from "@shared/schema";

export interface CarrierBookingResult {
  externalId: string;
  externalTrackingNumber?: string;
  externalTrackingUrl?: string;
  labelUrl?: string;
  adapterName: string;
  /** True when the underlying carrier API was actually contacted (vs simulated). */
  live: boolean;
}

export interface CarrierAdapter {
  /** e.g. "royal-mail", "dpd". */
  name: string;
  /** Partner IDs (rate-card ids) this adapter handles. */
  handles: string[];
  /** Book a shipment and return carrier-side identifiers + tracking links. */
  bookShipment(shipment: Shipment): Promise<CarrierBookingResult>;
  /** True when env credentials are available — reflects "live" mode in admin UIs. */
  isLive(): boolean;
}
