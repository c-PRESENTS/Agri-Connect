import { Check, Clock, X, AlertTriangle, TrendingUp, Hotel, Factory, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DemandAlert } from "@shared/schema";
import { motion } from "framer-motion";

interface Activity {
  id: string;
  product: string;
  quantity: string;
  amount: number;
  status: "sold" | "pending" | "cancelled";
  time: string;
}

interface FarmerActivityFeedProps {
  activities: Activity[];
  demandAlerts: DemandAlert[];
  currencySymbol?: string;
  onAcceptDemand?: (alertId: string) => void;
}

const statusConfig = {
  sold: { icon: Check, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "SOLD" },
  pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", label: "Pending" },
  cancelled: { icon: X, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", label: "Cancelled" },
};

const urgencyConfig = {
  high: { color: "bg-red-500", label: "URGENT" },
  medium: { color: "bg-orange-500", label: "THIS WEEK" },
  low: { color: "bg-blue-500", label: "STANDARD" },
};

const buyerIcons: Record<string, React.ReactNode> = {
  Hotel: <Hotel className="h-5 w-5" />,
  Mill: <Factory className="h-5 w-5" />,
  Trader: <Store className="h-5 w-5" />,
  Restaurant: <Hotel className="h-5 w-5" />,
  Supermarket: <Store className="h-5 w-5" />,
};

export function FarmerActivityFeed({
  activities,
  demandAlerts,
  currencySymbol = "₹",
  onAcceptDemand,
}: FarmerActivityFeedProps) {
  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Today's Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No activity today</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => {
                const status = statusConfig[activity.status];
                const StatusIcon = status.icon;
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg ${status.bg}`}
                    data-testid={`activity-${activity.id}`}
                  >
                    <StatusIcon className={`h-5 w-5 ${status.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{activity.product}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">{activity.quantity}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{currencySymbol}{activity.amount.toLocaleString()}</span>
                      <Badge variant="outline" className={`ml-2 ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Buyers Want Near You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {demandAlerts.map((alert, index) => {
                const urgency = urgencyConfig[alert.urgency];
                
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                    data-testid={`demand-${alert.id}`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {buyerIcons[alert.buyerType || ""] || <Store className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{alert.buyerType || "Buyer"}</span>
                        <span className="text-muted-foreground">needs</span>
                        <span className="font-semibold text-primary">{alert.quantity} {alert.productName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${urgency.color} text-white text-xs`}>
                          {urgency.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{alert.location}</span>
                        <span className="text-xs text-muted-foreground">{alert.priceRange}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAcceptDemand?.(alert.id)}
                      data-testid={`button-accept-demand-${alert.id}`}
                    >
                      Accept
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
