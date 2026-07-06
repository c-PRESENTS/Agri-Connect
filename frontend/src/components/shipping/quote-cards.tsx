import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Snowflake, Zap, Leaf, Truck, Clock, Star, CheckCircle2 } from "lucide-react";
import type { ShipQuote, ShipServiceType } from "@shared/schema";

const serviceIcon: Record<ShipServiceType, typeof Truck> = {
  standard: Truck,
  express: Zap,
  cold_chain: Snowflake,
  same_day: Zap,
  next_day: Clock,
  scheduled: Clock,
  freight: Truck,
  milk_run: Leaf,
};

const serviceLabel: Record<ShipServiceType, string> = {
  standard: "Standard",
  express: "Express",
  cold_chain: "Cold-Chain",
  same_day: "Same-Day",
  next_day: "Next-Day",
  scheduled: "Scheduled",
  freight: "Freight",
  milk_run: "Milk Run",
};

interface Props {
  quotes: ShipQuote[];
  selectedId?: string;
  onSelect: (q: ShipQuote) => void;
  loading?: boolean;
}

export function QuoteCards({ quotes, selectedId, onSelect, loading }: Props) {
  const { t } = useTranslation();
  const getServiceLabel = (s: ShipServiceType) => {
    const key: Record<ShipServiceType, string> = {
      standard: "shipping_quote_cards.service_standard",
      express: "shipping_quote_cards.service_express",
      cold_chain: "shipping_quote_cards.service_cold_chain",
      same_day: "shipping_quote_cards.service_same_day",
      next_day: "shipping_quote_cards.service_next_day",
      scheduled: "shipping_quote_cards.service_scheduled",
      freight: "shipping_quote_cards.service_freight",
      milk_run: "shipping_quote_cards.service_milk_run",
    };
    return t(key[s]);
  };
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }
  if (!quotes.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t("shipping_quote_cards.no_quotes")}</p>;
  }
  const cheapest = quotes[0];
  const greenest = [...quotes].sort((a, b) => a.co2Kg - b.co2Kg)[0];
  const fastest = [...quotes].sort((a, b) => a.etaHours - b.etaHours)[0];

  return (
    <div className="space-y-2">
      {quotes.map((q) => {
        const Icon = serviceIcon[q.service];
        const isSelected = q.id === selectedId;
        const tags: string[] = [];
        if (q.id === cheapest.id) tags.push(t("shipping_quote_cards.tag_best_price"));
        if (q.id === fastest.id && q.id !== cheapest.id) tags.push(t("shipping_quote_cards.tag_fastest"));
        if (q.id === greenest.id && q.id !== cheapest.id) tags.push(t("shipping_quote_cards.tag_greenest"));
        return (
          <Card
            key={q.id}
            data-testid={`card-quote-${q.partnerId}`}
            className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}`}
            onClick={() => onSelect(q)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${q.coldChain ? "bg-blue-500/10 text-blue-600" : "bg-primary/10 text-primary"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" data-testid={`text-partner-${q.partnerId}`}>{q.partnerName}</p>
                      <p className="text-[11px] text-muted-foreground">{getServiceLabel(q.service)} · {q.notes}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base" data-testid={`text-price-${q.partnerId}`}>£{q.price.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">{t("shipping_quote_cards.incl_fees")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{q.etaWindow}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{q.rating.toFixed(1)}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Leaf className="h-3 w-3 text-green-600" />{q.co2Kg.toFixed(2)} kg CO₂</span>
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] h-5">{t}</Badge>
                    ))}
                    {isSelected && <Badge className="text-[10px] h-5 bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" />{t("shipping_quote_cards.selected")}</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
