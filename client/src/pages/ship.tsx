import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Package, Send, Calendar, Building2, Search, MapPin, Clock, ChevronRight, Snowflake, Leaf, Zap, Plus, Globe, Handshake } from "lucide-react";
import { SendParcelWizard } from "@/components/shipping/send-parcel-wizard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Shipment, ShipmentStatus } from "@shared/schema";

const statusColor: Record<ShipmentStatus, string> = {
  quote_pending: "bg-muted text-foreground",
  booked: "bg-blue-500/15 text-blue-700",
  assigned: "bg-blue-500/15 text-blue-700",
  picked_up: "bg-amber-500/15 text-amber-700",
  in_transit: "bg-amber-500/15 text-amber-700",
  out_for_delivery: "bg-orange-500/15 text-orange-700",
  delivered: "bg-green-500/15 text-green-700",
  exception: "bg-red-500/15 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

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

export default function ShipPage() {
  const [, navigate] = useLocation();
  const [trackInput, setTrackInput] = useState("");
  const [tab, setTab] = useState("track");
  const { toast } = useToast();

  const { data: myShipments, isLoading: loadingMine } = useQuery<Shipment[]>({
    queryKey: ["/api/shipments/me"],
  });

  const advanceMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/shipments/${id}/advance`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/me"] });
      toast({ title: "Status advanced (demo)" });
    },
  });

  const handleTrack = () => {
    const id = trackInput.trim().toUpperCase();
    if (!id) return;
    navigate(`/ship/track/${encodeURIComponent(id)}`);
  };

  return (
    <div className="container max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Ship
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Tracking, deliveries, send-anything & milk runs</p>
        </div>
        <Button size="sm" onClick={() => setTab("send")} data-testid="button-quick-send">
          <Plus className="h-4 w-4 mr-1" />Send
        </Button>
      </div>

      {/* Quick track bar */}
      <Card className="bg-primary/5 border-primary/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Enter tracking ID e.g. AGS-XXXXXX"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              className="border-0 bg-transparent focus-visible:ring-0 px-0 font-mono"
              data-testid="input-track-quick"
            />
            <Button size="sm" onClick={handleTrack} disabled={!trackInput.trim()} data-testid="button-track-quick">Track</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full h-auto">
          <TabsTrigger value="track" className="text-[10px] sm:text-xs flex-col gap-0.5 py-2" data-testid="tab-track"><Package className="h-3.5 w-3.5" />Track</TabsTrigger>
          <TabsTrigger value="orders" className="text-[10px] sm:text-xs flex-col gap-0.5 py-2" data-testid="tab-orders"><Truck className="h-3.5 w-3.5" />Orders</TabsTrigger>
          <TabsTrigger value="send" className="text-[10px] sm:text-xs flex-col gap-0.5 py-2" data-testid="tab-send"><Send className="h-3.5 w-3.5" />Send</TabsTrigger>
          <TabsTrigger value="milk" className="text-[10px] sm:text-xs flex-col gap-0.5 py-2" data-testid="tab-milk"><Calendar className="h-3.5 w-3.5" />Milk Runs</TabsTrigger>
          <TabsTrigger value="partner" className="text-[10px] sm:text-xs flex-col gap-0.5 py-2" data-testid="tab-partner"><Building2 className="h-3.5 w-3.5" />Partners</TabsTrigger>
        </TabsList>

        {/* TRACK — list of my shipments */}
        <TabsContent value="track" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">My shipments</h2>
            {myShipments && myShipments.length > 0 && (
              <Badge variant="outline" className="text-[10px]">{myShipments.length}</Badge>
            )}
          </div>
          {loadingMine ? (
            <div className="space-y-2">{[0, 1].map((i) => (<div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />))}</div>
          ) : !myShipments || myShipments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <Package className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No shipments yet.</p>
                <Button size="sm" onClick={() => setTab("send")} data-testid="button-empty-send">Send your first parcel</Button>
              </CardContent>
            </Card>
          ) : (
            myShipments.map((s) => (
              <Card key={s.id} className="hover:border-primary/50 transition-colors" data-testid={`card-shipment-${s.id}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-bold" data-testid={`text-tracking-${s.id}`}>{s.trackingId}</p>
                        <Badge className={`${statusColor[s.status]} border-0 text-[10px]`}>{statusLabel[s.status]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.partnerName} · {s.items.length} item(s) · {s.weightKg.toFixed(1)} kg</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{s.pickup.city}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{s.drop.city}</span>
                      </div>
                      {s.eta && (
                        <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />ETA {new Date(s.eta).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">£{s.price.toFixed(2)}</p>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] mt-1" onClick={() => navigate(`/ship/track/${s.trackingId}`)} data-testid={`button-track-${s.id}`}>
                        Track
                      </Button>
                    </div>
                  </div>
                  {s.status !== "delivered" && s.status !== "cancelled" && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] mt-2 text-muted-foreground" onClick={() => advanceMut.mutate(s.id)} disabled={advanceMut.isPending} data-testid={`button-advance-${s.id}`}>
                      Advance status (demo) →
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders" className="mt-4 space-y-3">
          {(() => {
            const orderShipments = (myShipments ?? []).filter((s) => s.orderId);
            if (loadingMine) {
              return <div className="space-y-2">{[0, 1].map((i) => (<div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />))}</div>;
            }
            if (orderShipments.length === 0) {
              return (
                <Card>
                  <CardContent className="p-6 text-center space-y-2">
                    <Truck className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Marketplace order deliveries appear here once you check out.</p>
                    <Button size="sm" variant="outline" onClick={() => navigate("/cart")} data-testid="button-go-cart">Go to cart</Button>
                  </CardContent>
                </Card>
              );
            }
            return orderShipments.map((s) => (
              <Card key={s.id} className="hover:border-primary/50 transition-colors" data-testid={`card-order-shipment-${s.id}`}>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm font-bold">{s.trackingId}</p>
                        <Badge className={`${statusColor[s.status]} border-0 text-[10px]`}>{statusLabel[s.status]}</Badge>
                        {s.adapterName && <Badge variant="outline" className="text-[10px]">{s.adapterName}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.partnerName} · {s.items.length} item(s) · {s.weightKg.toFixed(1)} kg</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{s.pickup.city}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{s.drop.city}</span>
                      </div>
                      {s.eta && (
                        <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />ETA {new Date(s.eta).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">£{s.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={() => navigate(`/orders/${s.orderId}`)} data-testid={`button-view-order-${s.id}`}>
                      View order
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={() => navigate(`/ship/track/${s.trackingId}`)} data-testid={`button-track-order-${s.id}`}>
                      Track parcel
                    </Button>
                    {s.externalTrackingUrl && (
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => window.open(s.externalTrackingUrl!, "_blank")} data-testid={`button-carrier-${s.id}`}>
                        Carrier site →
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ));
          })()}
        </TabsContent>

        {/* SEND */}
        <TabsContent value="send" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" />Send a parcel anywhere</CardTitle>
              <p className="text-xs text-muted-foreground">From farm produce to equipment — instant quotes from our 3rd-party carrier network (Royal Mail, DPD, FedEx, DHL & more). Worldwide delivery.</p>
            </CardHeader>
            <CardContent>
              <SendParcelWizard />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MILK RUNS */}
        <TabsContent value="milk" className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2"><Leaf className="h-4 w-4 text-green-600" /><h3 className="font-semibold text-sm">Scheduled milk runs</h3></div>
              <p className="text-xs text-muted-foreground">Shared recurring routes — lower cost & lower CO₂.</p>
            </CardContent>
          </Card>
          {[
            { id: "mr-1", name: "Devon → Bristol → Cardiff", days: "Mon · Wed · Fri", time: "06:00", capacity: "240 / 500 kg", price: "from £4.50" },
            { id: "mr-2", name: "Norfolk → Cambridge → London", days: "Tue · Thu · Sat", time: "05:30", capacity: "120 / 400 kg", price: "from £5.20" },
            { id: "mr-3", name: "Yorkshire → Manchester → Liverpool", days: "Daily", time: "07:00", capacity: "320 / 600 kg", price: "from £4.80" },
          ].map((r) => (
            <Card key={r.id} className="hover:border-primary/50 transition-colors" data-testid={`card-milkrun-${r.id}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <Snowflake className="h-3.5 w-3.5 text-blue-500" />{r.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.days} · departs {r.time}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Capacity: {r.capacity}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{r.price}</p>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] mt-1" onClick={() => setTab("send")} data-testid={`button-join-${r.id}`}>Join run</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground text-center pt-2">Live capacity & booking arrives in Phase 3.</p>
        </TabsContent>

        {/* PARTNERS */}
        <TabsContent value="partner" className="mt-4 space-y-3">
          {/* How AgriConnect ships — aggregator model */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">How AgriConnect ships</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We don't own trucks. AgriConnect is a <span className="font-semibold text-foreground">marketplace aggregator</span> —
                we collaborate with established 3rd-party logistics partners (Royal Mail, DPD, Evri, FedEx, DHL, UPS, Stuart) plus a
                community-organised <span className="font-semibold text-foreground">Farmer Milk Run</span> network.
                You always book through us; we forward the job to the best-priced carrier and handle tracking, payments and disputes.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background rounded p-2"><p className="text-base font-bold text-primary">8+</p><p className="text-[10px] text-muted-foreground">carriers</p></div>
                <div className="bg-background rounded p-2"><p className="text-base font-bold text-primary"><Globe className="h-4 w-4 inline" /></p><p className="text-[10px] text-muted-foreground">worldwide</p></div>
                <div className="bg-background rounded p-2"><p className="text-base font-bold text-primary">0%</p><p className="text-[10px] text-muted-foreground">markup*</p></div>
              </div>
              <p className="text-[10px] text-muted-foreground">*Carrier prices passed through; AgriConnect adds a small platform fee at checkout.</p>
            </CardContent>
          </Card>

          {/* Carrier list */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Building2 className="h-4 w-4" />Our logistics partners</h3>
            {[
              { name: "Royal Mail", icon: Truck, color: "text-red-600", svc: "UK · Tracked 24/48", from: "from £4.99" },
              { name: "Evri", icon: Truck, color: "text-blue-600", svc: "UK · cheapest courier", from: "from £3.95" },
              { name: "DPD Local", icon: Zap, color: "text-orange-500", svc: "UK + Europe · next-day", from: "from £9.99" },
              { name: "Stuart Same-Day", icon: Zap, color: "text-amber-500", svc: "UK · same-day local", from: "from £14.99" },
              { name: "AgriConnect Cold-Chain Network", icon: Snowflake, color: "text-blue-500", svc: "Europe · refrigerated 2–8°C", from: "from £18.00" },
              { name: "Farmer Milk Run", icon: Leaf, color: "text-green-600", svc: "UK · shared route · lowest CO₂", from: "from £6.99" },
              { name: "UPS", icon: Truck, color: "text-amber-700", svc: "Worldwide · tracked next-day", from: "from £12.50" },
              { name: "FedEx International Priority", icon: Globe, color: "text-purple-600", svc: "Worldwide · 1–3 day air", from: "from £25.00" },
              { name: "DHL Express Worldwide", icon: Globe, color: "text-yellow-600", svc: "Worldwide · cold-chain capable", from: "from £28.00" },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.name} className="mb-2" data-testid={`card-partner-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Icon className={`h-4 w-4 ${p.color}`} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.svc}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold">{p.from}</p>
                      <Badge variant="secondary" className="text-[10px] h-4">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Become a partner CTA */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Run a fleet? Join us</h3></div>
              <p className="text-xs text-muted-foreground">Local couriers, cold-chain operators and refrigerated hauliers — get matched with farm shipments in your region.</p>
              <Button size="sm" variant="outline" className="w-full" disabled data-testid="button-partner-apply">Carrier signup opens in Phase 5</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
