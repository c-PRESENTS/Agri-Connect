import type { Express, Request, Response } from "express";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { listAdapters } from "../../shipping/adapters";
import { storage } from "../../storage";
import type { Order } from "@shared/schema";

type DashboardRouteDeps = { getUserId: (req: Request) => string | undefined };

function sellerOrderView(order: Order, sellerId: string): Order {
  const items = order.items.filter((item) => item.farmerId === sellerId);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { ...order, items, subtotal, total: subtotal, tax: 0, deliveryFee: 0, shippingTotal: undefined, buyerEmail: undefined, shippingChoices: undefined, deliveryAddressStruct: undefined };
}

async function hasRole(req: Request, res: Response, getUserId: DashboardRouteDeps["getUserId"], roles: string[]): Promise<string | undefined> {
  const userId = getUserId(req);
  const user = userId ? await authStorage.getUser(userId) : undefined;
  if (!userId || !user || !roles.includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return undefined;
  }
  return userId;
}

export function registerDashboardRoutes(app: Express, deps: DashboardRouteDeps): void {
  app.get("/api/dashboard/seller", isAuthenticated, async (req, res) => {
    try {
      const userId = await hasRole(req, res, deps.getUserId, ["farmer", "admin"]);
      if (!userId) return;
      const [products, orders] = await Promise.all([
        storage.getProductsByFarmer(userId),
        storage.getSellerOrders(userId),
      ]);
      const activeOrders = orders.filter((order) => !["cancelled", "refunded", "delivered"].includes(order.status));
      const salesTotal = orders
        .filter((order) => !["cancelled", "refunded"].includes(order.status))
        .reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0), 0);
      res.json({
        products,
        orders: orders.map((order) => sellerOrderView(order, userId)),
        summary: { productCount: products.length, orderCount: orders.length, activeOrderCount: activeOrders.length, salesTotal: Number(salesTotal.toFixed(2)) },
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch seller dashboard" });
    }
  });

  app.get("/api/dashboard/operator", isAuthenticated, async (req, res) => {
    try {
      const userId = await hasRole(req, res, deps.getUserId, ["admin"]);
      if (!userId) return;
      const [orders, products] = await Promise.all([storage.getAllOrders(), storage.getProducts()]);
      const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
        counts[order.status] = (counts[order.status] || 0) + 1;
        return counts;
      }, {});
      const completedSales = orders
        .filter((order) => !["cancelled", "refunded"].includes(order.status))
        .reduce((sum, order) => sum + order.total, 0);
      res.json({
        summary: {
          productCount: products.length,
          availableProductCount: products.filter((product) => product.stock > 0).length,
          orderCount: orders.length,
          completedSales: Number(completedSales.toFixed(2)),
          statusCounts,
        },
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch operator dashboard" });
    }
  });

  app.get("/api/logistics/providers", isAuthenticated, async (req, res) => {
    const userId = await hasRole(req, res, deps.getUserId, ["farmer", "logistics", "admin"]);
    if (!userId) return;
    res.json({ providers: listAdapters() });
  });
}
