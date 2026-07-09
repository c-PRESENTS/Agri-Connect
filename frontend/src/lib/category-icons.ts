import type { ComponentType } from "react";
import {
  Award,
  Building2,
  Heart,
  Package,
  ShoppingBasket,
  Sprout,
  Store,
  Truck,
  Wheat,
  Wrench,
} from "lucide-react";

type IconComponent = ComponentType<{ className?: string }>;

const categoryIconMap: Record<string, IconComponent> = {
  Award,
  Building2,
  Heart,
  Package,
  ShoppingBasket,
  Sprout,
  Store,
  Truck,
  Wheat,
  Wrench,
};

export function getCategoryIconComponent(iconName: string): IconComponent {
  return categoryIconMap[iconName] || Package;
}
