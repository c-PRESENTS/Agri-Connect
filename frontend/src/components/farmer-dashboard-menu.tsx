import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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
    label: "farmer_dashboard.crop_management",
    description: "List my produce",
    href: "/dashboard/list-product",
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
    label: "farmer_dashboard.livestock",
    description: "Sell livestock",
    href: "/dashboard/list-product",
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
    label: "farmer_dashboard.financial_overview",
    description: "Earnings & payments",
    href: "/seller",
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
    label: "nav.cart",
    description: "View all orders",
    href: "/seller",
    color: "bg-teal-500",
  },
  {
    id: "analytics",
    icon: <TrendingUp className="h-8 w-8" />,
    label: "Analytics",
    description: "Sales & trends",
    href: "/seller",
    color: "bg-indigo-500",
  },
  {
    id: "help",
    icon: <Phone className="h-8 w-8" />,
    label: "nav.help",
    description: "Voice help, support",
    href: "/support",
    color: "bg-pink-500",
  },
];

export function FarmerDashboardMenu() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {menuItems.map((item, index) => (
        <motion.button
          type="button"
          key={item.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => setLocation(item.href)}
          aria-label={`${t(item.label)}: ${item.description}`}
          className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card
            className="p-4 cursor-pointer hover-elevate transition-all duration-200 flex flex-col items-center text-center"
            data-testid={`menu-item-${item.id}`}
          >
            <div className={`${item.color} text-white p-3 rounded-xl mb-3`}>
              {item.icon}
            </div>
            <span className="font-semibold text-sm mb-0.5">{t(item.label)}</span>
            <span className="text-xs text-muted-foreground">{item.description}</span>
          </Card>
        </motion.button>
      ))}
    </div>
  );
}
