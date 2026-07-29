import { pool } from "../config/db";
import type { LocalNeed } from "@shared/schema";

export interface CreateLocalNeedRecord {
  buyerId: string;
  productName: string;
  quantity: number;
  unit: string;
  priceRange: string;
  location: string;
  latitude: number;
  longitude: number;
  urgency: LocalNeed["urgency"];
  buyerName: string;
  buyerType: LocalNeed["buyerType"];
  description?: string;
  deadline?: string;
  category?: string;
}

function relativeTime(value: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1_000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function hydrateLocalNeed(row: Record<string, unknown>): LocalNeed {
  const createdAt = new Date(String(row.created_at));
  return {
    id: String(row.id),
    productName: String(row.product_name),
    quantity: Number(row.quantity),
    unit: String(row.unit),
    priceRange: String(row.price_range),
    location: String(row.location),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    urgency: row.urgency as LocalNeed["urgency"],
    buyerName: String(row.buyer_name),
    buyerType: row.buyer_type as LocalNeed["buyerType"],
    timePosted: relativeTime(createdAt),
    description: row.description ? String(row.description) : undefined,
    deadline: row.deadline ? String(row.deadline).slice(0, 10) : undefined,
    category: row.category ? String(row.category) : undefined,
    status: row.status as LocalNeed["status"],
    createdAt: createdAt.toISOString(),
  };
}

export class LocalNeedsRepository {
  async listActive(urgency?: string): Promise<LocalNeed[]> {
    const params: unknown[] = [];
    let urgencyClause = "";
    if (urgency && ["high", "medium", "low"].includes(urgency)) {
      params.push(urgency);
      urgencyClause = ` AND urgency=$${params.length}`;
    }
    const result = await pool.query(
      `SELECT * FROM local_needs
        WHERE status='active'${urgencyClause}
        ORDER BY created_at DESC, id`,
      params,
    );
    return result.rows.map(hydrateLocalNeed);
  }

  async create(input: CreateLocalNeedRecord): Promise<LocalNeed> {
    const result = await pool.query(
      `INSERT INTO local_needs
         (buyer_id, product_name, quantity, unit, price_range, location, latitude,
          longitude, urgency, buyer_name, buyer_type, description, deadline, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        input.buyerId,
        input.productName,
        input.quantity,
        input.unit,
        input.priceRange,
        input.location,
        input.latitude,
        input.longitude,
        input.urgency,
        input.buyerName,
        input.buyerType,
        input.description || null,
        input.deadline || null,
        input.category || null,
      ],
    );
    return hydrateLocalNeed(result.rows[0]);
  }
}

export const localNeedsRepository = new LocalNeedsRepository();
