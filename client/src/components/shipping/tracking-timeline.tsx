import { CheckCircle2, Circle, Truck, Package, MapPin, Home } from "lucide-react";
import type { ShipmentStatus } from "@shared/schema";

interface TimelineEvent {
  ts: string;
  status: ShipmentStatus;
  location?: string;
  note?: string;
  source?: string;
}

const statusOrder: ShipmentStatus[] = ["booked", "assigned", "picked_up", "in_transit", "out_for_delivery", "delivered"];
const statusLabel: Record<ShipmentStatus, string> = {
  quote_pending: "Quote pending",
  booked: "Booked",
  assigned: "Driver assigned",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  exception: "Exception",
  cancelled: "Cancelled",
};
const statusIcon: Record<string, typeof Package> = {
  booked: Package,
  assigned: Truck,
  picked_up: Package,
  in_transit: Truck,
  out_for_delivery: MapPin,
  delivered: Home,
};

export function TrackingTimeline({ currentStatus, events }: { currentStatus: ShipmentStatus; events: TimelineEvent[] }) {
  const currentIdx = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {statusOrder.map((s, i) => {
          const Icon = statusIcon[s] ?? Circle;
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex flex-col items-center flex-1 min-w-[60px]">
              <div className="flex items-center w-full">
                <div className={`flex-1 h-0.5 ${i === 0 ? "invisible" : done ? "bg-primary" : "bg-muted"}`} />
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  } ${active ? "ring-4 ring-primary/20 animate-pulse" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className={`flex-1 h-0.5 ${i === statusOrder.length - 1 ? "invisible" : done && i < currentIdx ? "bg-primary" : "bg-muted"}`} />
              </div>
              <p className={`text-[10px] mt-1 text-center ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {statusLabel[s]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Events */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet.</p>
        ) : (
          <ol className="relative border-l-2 border-muted ml-3 space-y-4">
            {events.slice().reverse().map((e, idx) => (
              <li key={idx} className="ml-4" data-testid={`event-${idx}`}>
                <div className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{statusLabel[e.status] ?? e.status}</p>
                    {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                    {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
                  </div>
                  <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(e.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
