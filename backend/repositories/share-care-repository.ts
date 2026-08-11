import { pool } from "../config/db";
import type { ShareCareListing } from "@shared/schema";

export interface CreateShareCareRecord {
  donorId: string;
  donorName: string;
  sourceType: ShareCareListing["sourceType"];
  name: string;
  category: string;
  quantity: number;
  unit: string;
  isFree: boolean;
  price: number;
  location: string;
  latitude: number;
  longitude: number;
  emoji: string;
  urgency: ShareCareListing["urgency"];
  expiresAt: Date;
  dietaryTags: string[];
}

export interface UpdateShareCareRecord {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  status?: ShareCareListing["status"];
  urgency?: ShareCareListing["urgency"];
  expiresAt?: Date;
  dietaryTags?: string[];
}

export class ShareCareUnavailableError extends Error {}
export class ShareCareOwnListingError extends Error {}

function relativePast(value: Date): string {
  const minutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function relativeFuture(value: Date): string {
  const minutes = Math.max(0, Math.ceil((value.getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function hydrateShareCareListing(row: Record<string, unknown>): ShareCareListing {
  const createdAt = new Date(String(row.created_at));
  const expiresAt = new Date(String(row.expires_at));
  const listingData = (row.listing_data ?? {}) as { dietaryTags?: unknown };
  return {
    id: String(row.id),
    donorId: row.donor_id ? String(row.donor_id) : undefined,
    donor: String(row.donor_name),
    sourceType: row.source_type as ShareCareListing["sourceType"],
    name: String(row.name),
    category: String(row.category),
    qty: Number(row.quantity),
    unit: String(row.unit),
    isFree: Boolean(row.is_free),
    price: Number(row.price_minor) / 100,
    currency: "GBP",
    location: String(row.location),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    emoji: String(row.emoji),
    urgency: row.urgency as ShareCareListing["urgency"],
    status: row.status as ShareCareListing["status"],
    expiresAt: expiresAt.toISOString(),
    expiresIn: relativeFuture(expiresAt),
    createdAt: createdAt.toISOString(),
    postedAgo: relativePast(createdAt),
    dietaryTags: Array.isArray(listingData.dietaryTags)
      ? listingData.dietaryTags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}

export class ShareCareRepository {
  private async expireStale(): Promise<void> {
    await pool.query(
      `UPDATE share_care_listings
          SET status='expired', updated_at=now()
        WHERE status='available' AND expires_at <= now()`,
    );
  }

  async list(options: { freeOnly?: boolean; status?: ShareCareListing["status"]; limit?: number } = {}): Promise<ShareCareListing[]> {
    await this.expireStale();
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (options.freeOnly) clauses.push("is_free=true");
    if (options.status) {
      params.push(options.status);
      clauses.push(`status=$${params.length}`);
    }
    const safeLimit = Math.min(Math.max(options.limit ?? 100, 1), 100);
    params.push(safeLimit);
    const result = await pool.query(
      `SELECT * FROM share_care_listings
       ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
       ORDER BY CASE urgency WHEN 'urgent' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                expires_at ASC, created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    return result.rows.map(hydrateShareCareListing);
  }

  async countAvailableFree(): Promise<number> {
    await this.expireStale();
    const result = await pool.query(
      "SELECT count(*)::integer AS count FROM share_care_listings WHERE status='available' AND is_free=true AND expires_at > now()",
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async create(input: CreateShareCareRecord): Promise<ShareCareListing> {
    const result = await pool.query(
      `INSERT INTO share_care_listings
         (donor_id, donor_name, source_type, name, category, quantity, unit, is_free,
          price_minor, currency, location, latitude, longitude, emoji, urgency, status,
          expires_at, listing_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'GBP',$10,$11,$12,$13,$14,'available',$15,$16::jsonb)
       RETURNING *`,
      [
        input.donorId,
        input.donorName,
        input.sourceType,
        input.name,
        input.category,
        input.quantity,
        input.unit,
        input.isFree,
        Math.round(input.price * 100),
        input.location,
        input.latitude,
        input.longitude,
        input.emoji,
        input.urgency,
        input.expiresAt,
        JSON.stringify({ dietaryTags: input.dietaryTags }),
      ],
    );
    return hydrateShareCareListing(result.rows[0]);
  }

  async updateOwned(id: string, donorId: string, input: UpdateShareCareRecord): Promise<ShareCareListing | undefined> {
    const existing = await pool.query("SELECT * FROM share_care_listings WHERE id=$1 AND donor_id=$2", [id, donorId]);
    if (!existing.rows[0]) return undefined;
    const current = existing.rows[0] as Record<string, unknown>;
    const currentData = (current.listing_data ?? {}) as Record<string, unknown>;
    const result = await pool.query(
      `UPDATE share_care_listings
          SET name=$3, category=$4, quantity=$5, unit=$6, status=$7, urgency=$8,
              expires_at=$9, listing_data=$10::jsonb, updated_at=now()
        WHERE id=$1 AND donor_id=$2
        RETURNING *`,
      [
        id,
        donorId,
        input.name ?? current.name,
        input.category ?? current.category,
        input.quantity ?? current.quantity,
        input.unit ?? current.unit,
        input.status ?? current.status,
        input.urgency ?? current.urgency,
        input.expiresAt ?? current.expires_at,
        JSON.stringify({ ...currentData, dietaryTags: input.dietaryTags ?? currentData.dietaryTags ?? [] }),
      ],
    );
    return result.rows[0] ? hydrateShareCareListing(result.rows[0]) : undefined;
  }

  async reserve(id: string, reserverId: string): Promise<ShareCareListing> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM share_care_listings WHERE id=$1 FOR UPDATE", [id]);
      const listing = result.rows[0] as Record<string, unknown> | undefined;
      if (!listing || listing.status !== "available" || new Date(String(listing.expires_at)).getTime() <= Date.now()) {
        throw new ShareCareUnavailableError("This Share & Care item is no longer available.");
      }
      if (listing.donor_id === reserverId) {
        throw new ShareCareOwnListingError("You cannot reserve your own Share & Care listing.");
      }
      await client.query(
        "INSERT INTO share_care_reservations (listing_id, reserver_id) VALUES ($1,$2)",
        [id, reserverId],
      );
      const updated = await client.query(
        "UPDATE share_care_listings SET status='reserved', updated_at=now() WHERE id=$1 RETURNING *",
        [id],
      );
      await client.query("COMMIT");
      return hydrateShareCareListing(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const shareCareRepository = new ShareCareRepository();
