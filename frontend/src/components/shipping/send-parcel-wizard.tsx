import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Package, MapPin, ArrowRight, ArrowLeft, CheckCircle2, Copy, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QuoteCards } from "./quote-cards";
import { COUNTRIES } from "@/lib/countries";
import type { ShipQuote, Shipment } from "@shared/schema";

type Step = 1 | 2 | 3 | 4;

interface AddressForm {
  name: string; phone: string; email?: string;
  line1: string; line2?: string; city: string; postcode: string; country: string;
}

interface ItemForm {
  name: string; quantity: number; weightKg: number; coldChain: boolean; fragile: boolean;
}

const blankPickup: AddressForm = { name: "", phone: "", email: "", line1: "", line2: "", city: "", postcode: "", country: "GB" };
const blankDrop: AddressForm = { name: "", phone: "", email: "", line1: "", line2: "", city: "", postcode: "", country: "" };
const blankItem: ItemForm = { name: "", quantity: 1, weightKg: 1, coldChain: false, fragile: false };

export function SendParcelWizard({ onComplete }: { onComplete?: (s: Shipment, trackUrl: string) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<ItemForm[]>([{ ...blankItem }]);
  const [pickup, setPickup] = useState<AddressForm>({ ...blankPickup });
  const [drop, setDrop] = useState<AddressForm>({ ...blankDrop });
  const [pickupWindow, setPickupWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [quotes, setQuotes] = useState<ShipQuote[]>([]);
  const [selected, setSelected] = useState<ShipQuote | null>(null);
  const [booked, setBooked] = useState<{ shipment: Shipment; trackUrl: string } | null>(null);

  const quoteMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shipping/quotes", { pickup, drop, items, pickupWindow });
      return res.json();
    },
    onSuccess: (data: { quotes: ShipQuote[]; distanceKm: number; weightKg: number }) => {
      setQuotes(data.quotes);
      setSelected(data.quotes[0] ?? null);
      setStep(3);
    },
    onError: (e: Error) => toast({ title: t("send_parcel.could_not_get_quotes"), description: e.message, variant: "destructive" }),
  });

  const bookMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error(t("send_parcel.pick_shipping_first"));
      const res = await apiRequest("POST", "/api/shipping/book", {
        pickup, drop, items, pickupWindow, notes,
        quoteId: selected.id, service: selected.service,
        notifyEmail: drop.email || pickup.email,
        notifyWhatsapp: drop.phone,
      });
      return res.json();
    },
    onSuccess: (data: { shipment: Shipment; trackUrl: string }) => {
      setBooked(data);
      setStep(4);
      onComplete?.(data.shipment, data.trackUrl);
    },
    onError: (e: Error) => toast({ title: t("send_parcel.booking_failed"), description: e.message, variant: "destructive" }),
  });

  const addItem = () => setItems((v) => [...v, { ...blankItem }]);
  const updateItem = (i: number, patch: Partial<ItemForm>) => setItems((v) => v.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((v) => v.filter((_, idx) => idx !== i));

  const validStep1 = items.every((i) => i.name && i.quantity > 0 && i.weightKg > 0);
  const validAddr = (a: AddressForm) => !!(a.name && a.phone && a.line1 && a.city && a.postcode && a.country);
  const validStep2 = validAddr(pickup) && validAddr(drop);

  if (step === 4 && booked) {
    return (
      <div className="space-y-4 py-2">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold">{t("send_parcel.shipment_booked")}</h3>
          <p className="text-sm text-muted-foreground">{t("send_parcel.confirmation_sent_to", { email: booked.shipment.notifyEmail || "the recipient" })}</p>
        </div>
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{t("send_parcel.tracking_id")}</p>
              <Button
                size="sm" variant="ghost" className="h-7 px-2 text-xs"
                onClick={() => { navigator.clipboard.writeText(booked.shipment.trackingId); toast({ title: t("send_parcel.copied_toast") }); }}
                data-testid="button-copy-tracking"
              ><Copy className="h-3 w-3 mr-1" />{t("send_parcel.copy_button")}</Button>
            </div>
            <p className="font-mono text-2xl font-bold tracking-wider" data-testid="text-tracking-id">{booked.shipment.trackingId}</p>
            <p className="text-xs text-muted-foreground break-all">{booked.trackUrl}</p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">{t("send_parcel.carrier")}</p><p className="font-medium">{booked.shipment.partnerName}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("send_parcel.total")}</p><p className="font-medium">£{booked.shipment.price.toFixed(2)}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("send_parcel.distance")}</p><p className="font-medium">{booked.shipment.distanceKm} km</p></div>
          <div><p className="text-xs text-muted-foreground">{t("send_parcel.weight")}</p><p className="font-medium">{booked.shipment.weightKg.toFixed(1)} kg</p></div>
        </div>
        <Button className="w-full" onClick={() => { setBooked(null); setStep(1); setItems([{ ...blankItem }]); setPickup({ ...blankPickup }); setDrop({ ...blankDrop }); setQuotes([]); setSelected(null); }} data-testid="button-send-another">{t("send_parcel.send_another")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</div>
            {n < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > n ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 — Items */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{t("send_parcel.what_sending")}</h3>
          </div>
          {items.map((it, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{t("send_parcel.item_number", { number: i + 1 })}</p>
                  {items.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(i)} data-testid={`button-remove-item-${i}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input placeholder={t("send_parcel.item_name_placeholder")} value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} data-testid={`input-item-name-${i}`} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("send_parcel.quantity")}</Label>
                    <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Math.max(1, +e.target.value || 1) })} data-testid={`input-item-qty-${i}`} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("send_parcel.weight_kg")}</Label>
                    <Input type="number" min={0.1} step={0.1} value={it.weightKg} onChange={(e) => updateItem(i, { weightKg: Math.max(0.1, +e.target.value || 0.1) })} data-testid={`input-item-weight-${i}`} />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={it.coldChain} onCheckedChange={(v) => updateItem(i, { coldChain: !!v })} data-testid={`check-cold-${i}`} />
                    {t("send_parcel.cold_chain")}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={it.fragile} onCheckedChange={(v) => updateItem(i, { fragile: !!v })} data-testid={`check-fragile-${i}`} />
                    {t("send_parcel.fragile")}
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="w-full" data-testid="button-add-item">
            <Plus className="h-3 w-3 mr-1" />{t("send_parcel.add_another_item")}
          </Button>
          <Button className="w-full" disabled={!validStep1} onClick={() => setStep(2)} data-testid="button-next-step1">
            {t("send_parcel.next_pickup_drop")} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2 — Addresses */}
      {step === 2 && (
        <div className="space-y-4">
          <AddressBlock title="Pickup from" addr={pickup} onChange={setPickup} testPrefix="pickup" />
          <Separator />
          <AddressBlock title="Deliver to" addr={drop} onChange={setDrop} testPrefix="drop" />
          <div>
            <Label className="text-xs">{t("send_parcel.pickup_window_label")}</Label>
            <Input placeholder={t("send_parcel.pickup_window_placeholder")} value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} data-testid="input-pickup-window" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)} data-testid="button-back-step2"><ArrowLeft className="h-4 w-4 mr-1" />{t("send_parcel.back_button")}</Button>
            <Button className="flex-1" disabled={!validStep2 || quoteMut.isPending} onClick={() => quoteMut.mutate()} data-testid="button-get-quotes">
              {quoteMut.isPending ? t("send_parcel.getting_quotes") : t("send_parcel.get_shipping_quotes")}<ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Quotes */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{t("send_parcel.choose_option")}</h3>
            <Badge variant="outline" className="text-[10px]">{t("send_parcel.options_count", { count: quotes.length })}</Badge>
          </div>
          <QuoteCards quotes={quotes} selectedId={selected?.id} onSelect={setSelected} loading={quoteMut.isPending} />
          <div>
            <Label className="text-xs">{t("send_parcel.driver_notes")}</Label>
            <Textarea rows={2} placeholder={t("send_parcel.driver_notes_placeholder")} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-notes" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)} data-testid="button-back-step3"><ArrowLeft className="h-4 w-4 mr-1" />{t("send_parcel.back_button")}</Button>
            <Button className="flex-1" disabled={!selected || bookMut.isPending} onClick={() => bookMut.mutate()} data-testid="button-confirm-booking">
              {bookMut.isPending ? t("send_parcel.booking") : t("send_parcel.book_button", { price: `£${selected?.price.toFixed(2) ?? "0.00"}` })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddressBlock({ title, addr, onChange, testPrefix }: { title: string; addr: AddressForm; onChange: (a: AddressForm) => void; testPrefix: string }) {
  const { t } = useTranslation();
  const set = (patch: Partial<AddressForm>) => onChange({ ...addr, ...patch });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder={t("send_parcel.contact_name")} value={addr.name} onChange={(e) => set({ name: e.target.value })} data-testid={`input-${testPrefix}-name`} />
        <Input placeholder={t("send_parcel.phone")} value={addr.phone} onChange={(e) => set({ phone: e.target.value })} data-testid={`input-${testPrefix}-phone`} />
      </div>
      <Input type="email" placeholder={t("send_parcel.email_tracking")} value={addr.email} onChange={(e) => set({ email: e.target.value })} data-testid={`input-${testPrefix}-email`} />
      <Input placeholder={t("send_parcel.address_line1")} value={addr.line1} onChange={(e) => set({ line1: e.target.value })} data-testid={`input-${testPrefix}-line1`} />
      <Input placeholder={t("send_parcel.address_line2")} value={addr.line2} onChange={(e) => set({ line2: e.target.value })} data-testid={`input-${testPrefix}-line2`} />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder={t("send_parcel.city")} value={addr.city} onChange={(e) => set({ city: e.target.value })} data-testid={`input-${testPrefix}-city`} />
        <Input placeholder={t("send_parcel.postcode_zip")} value={addr.postcode} onChange={(e) => set({ postcode: e.target.value.toUpperCase() })} data-testid={`input-${testPrefix}-postcode`} />
      </div>
      <div>
        <Label className="text-[11px] flex items-center gap-1 text-muted-foreground"><Globe className="h-3 w-3" />{t("send_parcel.country")}</Label>
        <Select value={addr.country || ""} onValueChange={(v) => set({ country: v })}>
          <SelectTrigger data-testid={`select-${testPrefix}-country`}>
            <SelectValue placeholder={t("send_parcel.select_country")} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code} data-testid={`option-${testPrefix}-country-${c.code}`}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
