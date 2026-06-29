import type { Shipment } from "@shared/schema";
import type { CarrierAdapter, CarrierBookingResult } from "./types";

/**
 * DPD Local UK adapter.
 *
 * Live mode (DPD_API_USERNAME + DPD_API_PASSWORD) authenticates with the
 * DPD UK API at https://api.dpdlocal.co.uk/user/?action=login then POSTs
 * a shipment to /shipping/shipment. The response includes a
 * `consignmentNumber` we use as the tracking number.
 *
 * Simulation produces a 14-digit numeric tracking number (DPD format) plus
 * a public DPD tracking link.
 */
function dpdTrackingNumber(shipment: Shipment): string {
  const digits = (shipment.id.replace(/[^0-9]/g, "") + "00000000000000").slice(0, 14);
  return digits;
}

async function callLive(username: string, password: string, shipment: Shipment): Promise<CarrierBookingResult | null> {
  try {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const loginRes = await fetch("https://api.dpdlocal.co.uk/user/?action=login", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
        "GeoClient": "account-uk",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!loginRes.ok) {
      console.warn("[ship:dpd] login failed", loginRes.status);
      return null;
    }
    const session = (await loginRes.json()) as { data?: { geoSession?: string } };
    const geoSession = session.data?.geoSession;
    if (!geoSession) return null;

    const shipmentRes = await fetch("https://api.dpdlocal.co.uk/shipping/shipment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "GeoClient": "account-uk",
        "GeoSession": geoSession,
      },
      body: JSON.stringify({
        jobId: null,
        collectionOnDelivery: false,
        invoice: null,
        collectionDate: new Date().toISOString().split("T")[0],
        consolidate: false,
        consignment: [{
          consignmentNumber: null,
          consignmentRef: shipment.trackingId,
          parcel: shipment.items.map((i, idx) => ({
            parcelNumber: idx + 1,
            weight: i.weightKg,
          })),
          collectionDetails: {
            address: {
              organisation: shipment.pickup.name,
              street: shipment.pickup.line1,
              town: shipment.pickup.city,
              postcode: shipment.pickup.postcode,
              countryCode: shipment.pickup.country,
            },
          },
          deliveryDetails: {
            address: {
              organisation: shipment.drop.name,
              street: shipment.drop.line1,
              town: shipment.drop.city,
              postcode: shipment.drop.postcode,
              countryCode: shipment.drop.country,
            },
            notificationDetails: {
              email: shipment.drop.email,
              mobile: shipment.drop.phone,
            },
          },
          totalWeight: shipment.weightKg,
        }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!shipmentRes.ok) {
      const txt = await shipmentRes.text().catch(() => "");
      console.warn("[ship:dpd] shipment failed", shipmentRes.status, txt.slice(0, 240));
      return null;
    }
    const json = (await shipmentRes.json()) as { data?: { consignment?: { consignmentNumber?: string }[]; shipmentId?: string } };
    const consignment = json.data?.consignment?.[0];
    const trackingNumber = consignment?.consignmentNumber || dpdTrackingNumber(shipment);
    return {
      externalId: json.data?.shipmentId || trackingNumber,
      externalTrackingNumber: trackingNumber,
      externalTrackingUrl: `https://track.dpdlocal.co.uk/parcels/${trackingNumber}`,
      adapterName: "dpd",
      live: true,
    };
  } catch (err) {
    console.warn("[ship:dpd] live error, falling back", (err as Error).message);
    return null;
  }
}

function simulate(shipment: Shipment): CarrierBookingResult {
  const trackingNumber = dpdTrackingNumber(shipment);
  return {
    externalId: `DPD-SIM-${shipment.id.slice(0, 8).toUpperCase()}`,
    externalTrackingNumber: trackingNumber,
    externalTrackingUrl: `https://track.dpdlocal.co.uk/parcels/${trackingNumber}`,
    labelUrl: `/api/shipments/${shipment.id}/label.pdf`,
    adapterName: "dpd",
    live: false,
  };
}

export const dpdAdapter: CarrierAdapter = {
  name: "dpd",
  handles: ["dpd"],
  isLive: () => !!process.env.DPD_API_USERNAME && !!process.env.DPD_API_PASSWORD,
  async bookShipment(shipment) {
    const u = process.env.DPD_API_USERNAME;
    const p = process.env.DPD_API_PASSWORD;
    if (u && p) {
      const live = await callLive(u, p, shipment);
      if (live) return live;
    }
    return simulate(shipment);
  },
};
