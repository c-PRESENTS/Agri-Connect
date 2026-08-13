import { and, eq } from "drizzle-orm";
import { db } from "../config/db";
import {
  logisticsCollaborationInterests,
  type CreateLogisticsCollaborationInterest,
  type LogisticsCollaborationInterest,
} from "@shared/schema";

export class LogisticsCollaborationRepository {
  async register(
    userId: string | undefined,
    input: CreateLogisticsCollaborationInterest,
  ): Promise<LogisticsCollaborationInterest> {
    const values = {
      userId: userId ?? null,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone || null,
      organisationName: input.organisationName,
      collaborationType: input.collaborationType,
      region: input.region,
      details: input.details || null,
      status: "registered",
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: logisticsCollaborationInterests.id })
      .from(logisticsCollaborationInterests)
      .where(and(
        eq(logisticsCollaborationInterests.email, input.email),
        eq(logisticsCollaborationInterests.collaborationType, input.collaborationType),
      ))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(logisticsCollaborationInterests)
        .set(values)
        .where(eq(logisticsCollaborationInterests.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(logisticsCollaborationInterests)
      .values(values)
      .returning();
    return created;
  }
}

export const logisticsCollaborationRepository = new LogisticsCollaborationRepository();
