import type {
  MarketplaceConversationMessage,
  MarketplaceConversationMessagesPage,
  MarketplaceConversationSummary,
} from "@shared/schema";
import { pool } from "../config/db";

type ConversationAccess = { id: string; productId: string; buyerId: string; sellerId: string; status: string };

function displayName(row: Record<string, unknown>, prefix: string): string {
  return String(
    row[`${prefix}_name`]
      || [row[`${prefix}_first_name`], row[`${prefix}_last_name`]].filter(Boolean).join(" ")
      || row[`${prefix}_email`]
      || (prefix === "counterpart" ? "Marketplace member" : "User"),
  );
}

function hydrateSummary(row: Record<string, unknown>): MarketplaceConversationSummary {
  const productData = (row.product_data ?? {}) as Record<string, unknown>;
  const images = Array.isArray(productData.images) ? productData.images : [];
  return {
    id: String(row.id),
    productId: String(row.product_id),
    buyerId: String(row.buyer_id),
    sellerId: String(row.seller_id),
    status: row.status === "closed" ? "closed" : "active",
    lastMessageAt: new Date(String(row.last_message_at)).toISOString(),
    unreadCount: Number(row.unread_count ?? 0),
    counterpart: {
      id: String(row.counterpart_id),
      name: displayName(row, "counterpart"),
      avatar: String(row.counterpart_avatar || row.counterpart_profile_image_url || ""),
      role: String(row.counterpart_role || "buyer"),
    },
    product: {
      id: String(row.product_id),
      name: String(row.product_name),
      image: typeof images[0] === "string" ? images[0] : "",
      price: Number(BigInt(String(row.price_minor))) / 100,
      currency: String(row.currency),
      unit: String(row.unit),
      stock: Number(row.stock),
    },
  };
}

function hydrateMessage(row: Record<string, unknown>): MarketplaceConversationMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    senderName: displayName(row, "sender"),
    senderRole: String(row.sender_role || "buyer"),
    content: String(row.content),
    deliveredAt: new Date(String(row.delivered_at)).toISOString(),
    readAt: row.read_at ? new Date(String(row.read_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

const SUMMARY_SELECT = `
  SELECT c.*, p.name AS product_name, p.price_minor, p.currency, p.unit, p.stock, p.product_data,
         counterpart.id AS counterpart_id, counterpart.name AS counterpart_name,
         counterpart.first_name AS counterpart_first_name, counterpart.last_name AS counterpart_last_name,
         counterpart.email AS counterpart_email, counterpart.avatar AS counterpart_avatar,
         counterpart.profile_image_url AS counterpart_profile_image_url, counterpart.role AS counterpart_role,
         (SELECT count(*)::integer FROM marketplace_conversation_messages unread
           WHERE unread.conversation_id=c.id AND unread.sender_id<>$1 AND unread.read_at IS NULL) AS unread_count
    FROM marketplace_conversations c
    JOIN commerce_products p ON p.id=c.product_id
    JOIN users counterpart ON counterpart.id=CASE WHEN c.buyer_id=$1 THEN c.seller_id ELSE c.buyer_id END`;

export class ConversationRepository {
  async createOrGet(input: { productId: string; buyerId: string; sellerId: string }): Promise<MarketplaceConversationSummary> {
    const inserted = await pool.query(
      `INSERT INTO marketplace_conversations (product_id, buyer_id, seller_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (product_id, buyer_id, seller_id)
       DO UPDATE SET updated_at=marketplace_conversations.updated_at
       RETURNING id`,
      [input.productId, input.buyerId, input.sellerId],
    );
    const result = await pool.query(`${SUMMARY_SELECT} WHERE c.id=$2`, [input.buyerId, inserted.rows[0].id]);
    return hydrateSummary(result.rows[0]);
  }

  async listForUser(userId: string, productId?: string): Promise<MarketplaceConversationSummary[]> {
    const params: unknown[] = [userId];
    const clauses = ["(c.buyer_id=$1 OR c.seller_id=$1)"];
    if (productId) {
      params.push(productId);
      clauses.push(`c.product_id=$${params.length}`);
    }
    const result = await pool.query(
      `${SUMMARY_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY c.last_message_at DESC`,
      params,
    );
    return result.rows.map(hydrateSummary);
  }

  async getAccess(conversationId: string, userId: string): Promise<ConversationAccess | undefined> {
    const result = await pool.query(
      `SELECT id, product_id, buyer_id, seller_id, status
         FROM marketplace_conversations
        WHERE id=$1 AND (buyer_id=$2 OR seller_id=$2)`,
      [conversationId, userId],
    );
    const row = result.rows[0];
    return row ? { id: String(row.id), productId: String(row.product_id), buyerId: String(row.buyer_id), sellerId: String(row.seller_id), status: String(row.status) } : undefined;
  }

  async listMessages(conversationId: string, page: number, pageSize: number): Promise<MarketplaceConversationMessagesPage> {
    const countResult = await pool.query(
      "SELECT count(*)::integer AS total FROM marketplace_conversation_messages WHERE conversation_id=$1",
      [conversationId],
    );
    const total = Number(countResult.rows[0]?.total ?? 0);
    const result = await pool.query(
      `SELECT m.*, sender.name AS sender_name, sender.first_name AS sender_first_name,
              sender.last_name AS sender_last_name, sender.email AS sender_email, sender.role AS sender_role
         FROM marketplace_conversation_messages m
         JOIN users sender ON sender.id=m.sender_id
        WHERE m.conversation_id=$1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3`,
      [conversationId, pageSize, (page - 1) * pageSize],
    );
    return { messages: result.rows.reverse().map(hydrateMessage), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async createMessage(conversationId: string, senderId: string, content: string): Promise<MarketplaceConversationMessage> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO marketplace_conversation_messages (conversation_id, sender_id, content)
         VALUES ($1,$2,$3) RETURNING *`,
        [conversationId, senderId, content],
      );
      await client.query(
        "UPDATE marketplace_conversations SET last_message_at=now(), updated_at=now() WHERE id=$1",
        [conversationId],
      );
      const result = await client.query(
        `SELECT m.*, sender.name AS sender_name, sender.first_name AS sender_first_name,
                sender.last_name AS sender_last_name, sender.email AS sender_email, sender.role AS sender_role
           FROM marketplace_conversation_messages m JOIN users sender ON sender.id=m.sender_id WHERE m.id=$1`,
        [inserted.rows[0].id],
      );
      await client.query("COMMIT");
      return hydrateMessage(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markRead(conversationId: string, userId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE marketplace_conversation_messages SET read_at=now()
        WHERE conversation_id=$1 AND sender_id<>$2 AND read_at IS NULL`,
      [conversationId, userId],
    );
    return result.rowCount ?? 0;
  }
}

export const conversationRepository = new ConversationRepository();
