import { Wallet, ShoppingBag, Clock, Package, Star, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FarmerStats } from "@shared/schema";
import { motion } from "framer-motion";

interface FarmerStatsCardProps {
  stats: FarmerStats;
  currencySymbol?: string;
  onWithdraw?: () => void;
  onArrangeDelivery?: () => void;
}

export function FarmerStatsCard({
  stats,
  currencySymbol = "₹",
  onWithdraw,
  onArrangeDelivery,
}: FarmerStatsCardProps) {
  return (
    <div className="p-4 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Total Earnings</p>
                <h2 className="text-3xl sm:text-4xl font-bold" data-testid="text-total-earnings">
                  {currencySymbol}{stats.totalEarnings.toLocaleString()}
                </h2>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                +12% this month
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
                onClick={onWithdraw}
                data-testid="button-withdraw"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Withdraw to Bank
              </Button>
              <Button
                variant="secondary"
                className="flex-1 bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
                onClick={onArrangeDelivery}
                data-testid="button-arrange-delivery"
              >
                <Package className="h-4 w-4 mr-2" />
                Arrange Delivery
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-today-orders">{stats.todayOrders}</p>
                  <p className="text-xs text-muted-foreground">Today's Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-orders">{stats.pendingOrders}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-products">{stats.totalProducts}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-avg-rating">{stats.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
