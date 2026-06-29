import type { Shipment } from "@shared/schema";
import type { CarrierAdapter, CarrierBookingResult } from "./types";
import { royalMailAdapter } from "./royal-mail";
import { dpdAdapter } from "./dpd";

/**
 * Generic mock adapter used for partners that don't yet have a dedicated
 * integration (Evri, FedEx, DHL, UPS, Stuart, AgriConnect Cold-Chain Network,
 * Farmer Milk Run). It returns deterministic carrier-prefixed tracking
 * numbers so the rest of the platform (events, emails, WhatsApp templates)
 * has a tracking number to render.
 */
function mockAdapter(partnerId: string): CarrierAdapter {
  return {
    name: `mock-${partnerId}`,
    handles: [partnerId],
    isLive: () => false,
    async bookShipment(shipment: Shipment): Promise<CarrierBookingResult> {
      const prefix = partnerId.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "AGS";
      const digits = (shipment.id.replace(/[^0-9]/g, "") + "0000000000").slice(0, 10);
      const trackingNumber = `${prefix}${digits}`;
      return {
        externalId: `${prefix}-${shipment.id.slice(0, 8).toUpperCase()}`,
        externalTrackingNumber: trackingNumber,
        // No public tracking URL for mock — the AgriConnect tracking page
        // remains the source of truth.
        externalTrackingUrl: undefined,
        labelUrl: `/api/shipments/${shipment.id}/label.pdf`,
        adapterName: `mock-${partnerId}`,
        live: false,
      };
    },
  };
}

const ADAPTERS: CarrierAdapter[] = [royalMailAdapter, dpdAdapter];

export function getAdapter(partnerId: string): CarrierAdapter {
  return ADAPTERS.find((a) => a.handles.includes(partnerId)) ?? mockAdapter(partnerId);
}

export function listAdapters(): { name: string; handles: string[]; live: boolean }[] {
  return ADAPTERS.map((a) => ({ name: a.name, handles: a.handles, live: a.isLive() }));
}
