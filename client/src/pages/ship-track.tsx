import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, MapPin, Clock, Truck, Copy, Share2 } from "lucide-react";
import { TrackingTimeline } from "@/components/shipping/tracking-timeline";
import { useToast } from "@/hooks/use-toast";
import type { ShipmentStatus } from "@shared/schema";

interface PublicShipment {
  trackingId: string;
  status: ShipmentStatus;
  partnerName: string;
  service: string;
  pickup: { city: string; postcode: string; country: string };
  drop: { city: string; postcode: string; country: string };
  itemsSummary: string;
  distanceKm: number;
  eta?: string;
  createdAt: string;
  updatedAt: string;
  events: { ts: string; status: ShipmentStatus; location?: string; note?: string; source: string }[];
}

export default function ShipTrackPage() {
  const [, params] = useRoute<{ trackingId: string }>("/ship/track/:trackingId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const trackingId = params?.trackingId ?? "";

  const { data, isLoading, error } = useQuery<PublicShipment>({
    queryKey: ["/api/shipping/track", trackingId],
    enabled: !!trackingId,
    refetchInterval: 15_000,
  });

  return (
    <div className="container max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/ship")} className="-ml-2" data-testid="button-back">
        <ArrowLeft className="h-4 w-4 mr-1" />Back to Ship
      </Button>

      <div>
        <p className="text-xs text-muted-foreground">Tracking ID</p>
        <div className="flex items-center gap-2">
          <p className="font-mono text-2xl sm:text-3xl font-bold tracking-wider" data-testid="text-tracking-id">{trackingId}</p>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(trackingId); toast({ title: "Copied!" }); }} data-testid="button-copy">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); }} data-testid="button-share">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      )}

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-6 text-center space-y-2">
            <Package className="h-8 w-8 mx-auto text-red-500" />
            <p className="font-semibold">Tracking ID not found</p>
            <p className="text-xs text-muted-foreground">Double-check the ID and try again.</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />{data.partnerName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{data.service.replace("_", " ")} service</p>
                </div>
                <Badge variant="secondary" className="text-xs capitalize">{data.status.replace(/_/g, " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />From</p>
                  <p className="font-medium">{data.pickup.city}</p>
                  <p className="text-xs text-muted-foreground">{data.pickup.postcode}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />To</p>
                  <p className="font-medium">{data.drop.city}</p>
                  <p className="text-xs text-muted-foreground">{data.drop.postcode}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Items</p>
                  <p className="font-medium">{data.itemsSummary}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Distance</p>
                  <p className="font-medium">{data.distanceKm} km</p>
                </div>
                {data.eta && (
                  <div className="col-span-2 bg-primary/5 border border-primary/20 rounded p-2">
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />Estimated arrival</p>
                    <p className="font-semibold text-primary">{new Date(data.eta).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Live tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <TrackingTimeline currentStatus={data.status} events={data.events} />
            </CardContent>
          </Card>

          <p className="text-[11px] text-muted-foreground text-center">Auto-refreshing every 15s · Updates from {data.events[0]?.source ?? "system"}</p>
        </>
      )}
    </div>
  );
}
