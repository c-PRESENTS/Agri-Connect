import { useState } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopNavigation } from "@/components/top-navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FarmerDashboardMenu } from "@/components/farmer-dashboard-menu";
import { FarmerStatsCard } from "@/components/farmer-stats-card";
import { FarmerActivityFeed } from "@/components/farmer-activity-feed";

import { ScrollArea } from "@/components/ui/scroll-area";
import { mockDemandAlerts } from "@/lib/mock-data";
import type { FarmerStats } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const mockStats: FarmerStats = {
  totalEarnings: 67500,
  todayOrders: 8,
  pendingOrders: 3,
  totalProducts: 12,
  averageRating: 4.7,
};

const mockActivities = [
  { id: "1", product: "Tomato", quantity: "50kg", amount: 2000, status: "sold" as const, time: "2 hours ago" },
  { id: "2", product: "Rice", quantity: "100kg", amount: 3500, status: "pending" as const, time: "4 hours ago" },
  { id: "3", product: "Carrot", quantity: "30kg", amount: 1200, status: "cancelled" as const, time: "6 hours ago" },
  { id: "4", product: "Potato", quantity: "75kg", amount: 1875, status: "sold" as const, time: "Yesterday" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const handleWithdraw = () => {
    toast({
      title: t("dashboard.withdrawal_title"),
      description: t("dashboard.withdrawal_desc"),
    });
  };

  const handleArrangeDelivery = () => {
    toast({
      title: t("dashboard.delivery_title"),
      description: t("dashboard.delivery_desc"),
    });
  };

  const handleAcceptDemand = (alertId: string) => {
    toast({
      title: t("dashboard.demand_title"),
      description: t("dashboard.demand_desc"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-12">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
            data-testid="tab-overview"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="menu"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
            data-testid="tab-menu"
          >
            Quick Actions
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
            data-testid="tab-activity"
          >
            Activity
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <TabsContent value="overview" className="mt-0">
            <FarmerStatsCard
              stats={mockStats}
              onWithdraw={handleWithdraw}
              onArrangeDelivery={handleArrangeDelivery}
            />
            <FarmerActivityFeed
              activities={mockActivities.slice(0, 2)}
              demandAlerts={mockDemandAlerts.slice(0, 3)}
              onAcceptDemand={handleAcceptDemand}
            />
          </TabsContent>

          <TabsContent value="menu" className="mt-0">
            <FarmerDashboardMenu />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <FarmerActivityFeed
              activities={mockActivities}
              demandAlerts={mockDemandAlerts}
              onAcceptDemand={handleAcceptDemand}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
