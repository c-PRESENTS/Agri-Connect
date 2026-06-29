import { Link, useLocation } from "wouter";
import { 
  Wheat, 
  ShoppingCart, 
  Beef, 
  Camera, 
  Wallet, 
  Building2, 
  Phone,
  Package,
  TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  color: string;
}

const menuItems: MenuItem[] = [
  {
    id: "my-crops",
    icon: <Wheat className="h-8 w-8" />,
    label: "My Crops",
    description: "List my produce",
    href: "/dashboard/products",
    color: "bg-green-500",
  },
  {
    id: "buy-inputs",
    icon: <ShoppingCart className="h-8 w-8" />,
    label: "Buy Inputs",
    description: "Seeds, fertilizers, tools",
    href: "/",
    color: "bg-blue-500",
  },
  {
    id: "my-animals",
    icon: <Beef className="h-8 w-8" />,
    label: "My Animals",
    description: "Sell livestock",
    href: "/dashboard/animals",
    color: "bg-orange-500",
  },
  {
    id: "photo-sell",
    icon: <Camera className="h-8 w-8" />,
    label: "Photo Sell",
    description: "Click photo to sell",
    href: "/dashboard/photo-sell",
    color: "bg-purple-500",
  },
  {
    id: "my-money",
    icon: <Wallet className="h-8 w-8" />,
    label: "My Money",
    description: "Earnings & payments",
    href: "/dashboard/earnings",
    color: "bg-yellow-500",
  },
  {
    id: "government",
    icon: <Building2 className="h-8 w-8" />,
    label: "Government",
    description: "Schemes & subsidies",
    href: "/dashboard/schemes",
    color: "bg-red-500",
  },
  {
    id: "orders",
    icon: <Package className="h-8 w-8" />,
    label: "Orders",
    description: "View all orders",
    href: "/dashboard/orders",
    color: "bg-teal-500",
  },
  {
    id: "analytics",
    icon: <TrendingUp className="h-8 w-8" />,
    label: "Analytics",
    description: "Sales & trends",
    href: "/dashboard/analytics",
    color: "bg-indigo-500",
  },
  {
    id: "help",
    icon: <Phone className="h-8 w-8" />,
    label: "Help",
    description: "Voice help, support",
    href: "/dashboard/help",
    color: "bg-pink-500",
  },
];

export function FarmerDashboardMenu() {
  const [, setLocation] = useLocation();

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {menuItems.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card
            className="p-4 cursor-pointer hover-elevate transition-all duration-200 flex flex-col items-center text-center"
            onClick={() => setLocation(item.href)}
            data-testid={`menu-item-${item.id}`}
          >
            <div className={`${item.color} text-white p-3 rounded-xl mb-3`}>
              {item.icon}
            </div>
            <span className="font-semibold text-sm mb-0.5">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.description}</span>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
