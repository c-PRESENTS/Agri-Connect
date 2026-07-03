import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bell, TrendingUp, MapPin, Clock, Megaphone, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DemandAlert } from "@shared/schema";

interface DemandAlertsProps {
  className?: string;
  compact?: boolean;
}

export function DemandAlerts({ className, compact = false }: DemandAlertsProps) {
  const { t } = useTranslation();
  const { data: alerts = [], isLoading } = useQuery<DemandAlert[]>({
    queryKey: ["/api/demand-alerts"],
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary" />
            {t("demand.badge_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-4 sm:p-8">
          <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-primary" />
              {t("demand.badge_title")}
            </CardTitle>
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
              data-testid={`alert-item-${alert.id}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  alert.urgency === "high"
                    ? "bg-red-500"
                    : alert.urgency === "medium"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{alert.productName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {alert.quantity} needed
                </p>
              </div>
              <span className="text-sm font-semibold text-primary">
                {alert.priceRange}
              </span>
            </div>
          ))}
          {alerts.length > 3 && (
            <Button variant="ghost" className="w-full gap-2 text-sm" data-testid="button-view-all-alerts">
              {t("demand.view_all_button")} {alerts.length} {t("demand.badge_title")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {t("demand.title")}
          </CardTitle>
          <Badge variant="secondary">{alerts.length} {t("demand.tab_active")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("demand.description")}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AlertCard({ alert }: { alert: DemandAlert }) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-visible" data-testid={`demand-alert-${alert.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-2 rounded-full ${
              alert.urgency === "high"
                ? "bg-red-500/10 text-red-500"
                : alert.urgency === "medium"
                ? "bg-yellow-500/10 text-yellow-500"
                : "bg-green-500/10 text-green-500"
            }`}
          >
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{alert.productName}</h3>
              <Badge
                variant="outline"
                className={
                  alert.urgency === "high"
                    ? "border-red-500/50 text-red-600 dark:text-red-400"
                    : alert.urgency === "medium"
                    ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                    : "border-green-500/50 text-green-600 dark:text-green-400"
                }
              >
                {alert.urgency === "high"
                  ? t("demand.tab_urgent")
                  : alert.urgency === "medium"
                  ? t("demand.sort_urgency")
                  : "Standard"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {t("map.quantity")}: <span className="font-medium text-foreground">{alert.quantity}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {alert.location}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {alert.timePosted}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{alert.priceRange}</p>
            <p className="text-xs text-muted-foreground">{t("product.add_short")} {alert.unit}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button className="flex-1" data-testid={`button-respond-alert-${alert.id}`}>
            {t("demand.respond_button")}
          </Button>
          <Button variant="outline" size="icon" data-testid={`button-save-alert-${alert.id}`}>
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
