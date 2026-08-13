import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  sellerAssociatedPersons,
  sellerBusinessProfiles,
  sellerTaxIdentifiers,
  sellerVerificationCases,
  sellerVerificationDocuments,
  sellerVerificationEvents,
  users,
  type SellerBusinessProfileInput,
} from "@shared/schema";
import { db } from "../config/db";

export class SellerVerificationRepository {
  async getProfile(sellerId: string) {
    const [profile] = await db.select().from(sellerBusinessProfiles).where(eq(sellerBusinessProfiles.sellerId, sellerId));
    return profile;
  }

  async upsertProfile(sellerId: string, input: SellerBusinessProfileInput) {
    const values = {
      sellerId,
      ...input,
      tradingName: input.tradingName || null,
      registrationNumber: input.registrationNumber || null,
      website: input.website || null,
    };
    const [profile] = await db.insert(sellerBusinessProfiles).values(values).onConflictDoUpdate({
      target: sellerBusinessProfiles.sellerId,
      set: { ...values, updatedAt: new Date() },
    }).returning();
    return profile;
  }

  async getCase(sellerId: string) {
    const [verificationCase] = await db.select().from(sellerVerificationCases).where(eq(sellerVerificationCases.sellerId, sellerId));
    return verificationCase;
  }

  async upsertCase(input: typeof sellerVerificationCases.$inferInsert) {
    const [verificationCase] = await db.insert(sellerVerificationCases).values(input).onConflictDoUpdate({
      target: sellerVerificationCases.sellerId,
      set: { ...input, updatedAt: new Date() },
    }).returning();
    return verificationCase;
  }

  async upsertTaxIdentifier(input: typeof sellerTaxIdentifiers.$inferInsert) {
    const [identifier] = await db.insert(sellerTaxIdentifiers).values(input).onConflictDoUpdate({
      target: [sellerTaxIdentifiers.sellerId, sellerTaxIdentifiers.country, sellerTaxIdentifiers.type],
      set: {
        encryptedValue: input.encryptedValue,
        valueHash: input.valueHash,
        maskedValue: input.maskedValue,
        status: input.status,
        verificationSource: input.verificationSource,
        verifiedAt: input.verifiedAt,
        updatedAt: new Date(),
      },
    }).returning();
    return identifier;
  }

  listTaxIdentifiers(sellerId: string) {
    return db.select({
      id: sellerTaxIdentifiers.id,
      country: sellerTaxIdentifiers.country,
      type: sellerTaxIdentifiers.type,
      maskedValue: sellerTaxIdentifiers.maskedValue,
      status: sellerTaxIdentifiers.status,
      verificationSource: sellerTaxIdentifiers.verificationSource,
      verifiedAt: sellerTaxIdentifiers.verifiedAt,
      updatedAt: sellerTaxIdentifiers.updatedAt,
    }).from(sellerTaxIdentifiers).where(eq(sellerTaxIdentifiers.sellerId, sellerId));
  }

  setTaxIdentifierReview(sellerId: string, status: "verified" | "rejected", reviewerSource: string) {
    return db.update(sellerTaxIdentifiers).set({
      status,
      verificationSource: reviewerSource,
      verifiedAt: status === "verified" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(sellerTaxIdentifiers.sellerId, sellerId));
  }

  async addPerson(input: typeof sellerAssociatedPersons.$inferInsert) {
    const [person] = await db.insert(sellerAssociatedPersons).values(input).returning();
    return person;
  }

  deletePerson(sellerId: string, personId: string) {
    return db.delete(sellerAssociatedPersons).where(and(eq(sellerAssociatedPersons.sellerId, sellerId), eq(sellerAssociatedPersons.id, personId))).returning({ id: sellerAssociatedPersons.id });
  }

  listPeople(sellerId: string) {
    return db.select().from(sellerAssociatedPersons).where(eq(sellerAssociatedPersons.sellerId, sellerId)).orderBy(asc(sellerAssociatedPersons.createdAt));
  }

  async createDocument(input: typeof sellerVerificationDocuments.$inferInsert) {
    const [document] = await db.insert(sellerVerificationDocuments).values(input).returning();
    return document;
  }

  async getDocument(sellerId: string, documentId: string) {
    const [document] = await db.select().from(sellerVerificationDocuments).where(and(eq(sellerVerificationDocuments.sellerId, sellerId), eq(sellerVerificationDocuments.id, documentId)));
    return document;
  }

  async getDocumentById(documentId: string) {
    const [document] = await db.select().from(sellerVerificationDocuments).where(eq(sellerVerificationDocuments.id, documentId));
    return document;
  }

  async updateDocument(documentId: string, updates: Partial<typeof sellerVerificationDocuments.$inferInsert>) {
    const [document] = await db.update(sellerVerificationDocuments).set({ ...updates, updatedAt: new Date() }).where(eq(sellerVerificationDocuments.id, documentId)).returning();
    return document;
  }

  listDocuments(sellerId: string) {
    return db.select().from(sellerVerificationDocuments).where(eq(sellerVerificationDocuments.sellerId, sellerId)).orderBy(desc(sellerVerificationDocuments.createdAt));
  }

  async recordEvent(caseId: string, actorId: string | null, eventType: string, eventData: Record<string, unknown> = {}) {
    await db.insert(sellerVerificationEvents).values({ caseId, actorId, eventType, eventData });
  }

  async listQueue(statuses: string[] = ["pending_review", "needs_information"]) {
    return db.select({
      id: sellerVerificationCases.id,
      sellerId: sellerVerificationCases.sellerId,
      status: sellerVerificationCases.status,
      country: sellerVerificationCases.country,
      entityType: sellerVerificationCases.entityType,
      submittedAt: sellerVerificationCases.submittedAt,
      updatedAt: sellerVerificationCases.updatedAt,
      legalName: sellerBusinessProfiles.legalName,
      contactEmail: sellerBusinessProfiles.contactEmail,
      sellerEmail: users.email,
    }).from(sellerVerificationCases)
      .innerJoin(sellerBusinessProfiles, eq(sellerBusinessProfiles.sellerId, sellerVerificationCases.sellerId))
      .innerJoin(users, eq(users.id, sellerVerificationCases.sellerId))
      .where(inArray(sellerVerificationCases.status, statuses))
      .orderBy(asc(sellerVerificationCases.submittedAt), asc(sellerVerificationCases.createdAt));
  }
}

export const sellerVerificationRepository = new SellerVerificationRepository();
