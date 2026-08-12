import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../config/db";
import {
  savedAddressDetailsSchema,
  userAddresses,
  type CreateSavedAddressInput,
  type SavedAddress,
  type SavedAddressDetails,
  type UpdateSavedAddressInput,
} from "@shared/schema";
import { decryptAddress, encryptAddress } from "../account/address-crypto";

type AddressRow = typeof userAddresses.$inferSelect;

function toSavedAddress(row: AddressRow): SavedAddress {
  const details = decryptAddress(
    row.encryptedPayload,
    row.encryptionKeyVersion,
    row.userId,
    row.id,
  );
  return {
    id: row.id,
    label: row.label,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...details,
  };
}

function detailsFromCreate(input: CreateSavedAddressInput): SavedAddressDetails {
  return savedAddressDetailsSchema.parse(input);
}

export class UserAddressRepository {
  async list(userId: string): Promise<SavedAddress[]> {
    const rows = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, userId))
      .orderBy(desc(userAddresses.isDefault), desc(userAddresses.updatedAt));
    return rows.map(toSavedAddress);
  }

  async create(userId: string, input: CreateSavedAddressInput): Promise<SavedAddress> {
    const id = randomUUID();
    const encrypted = encryptAddress(detailsFromCreate(input), userId, id);

    const row = await db.transaction(async (transaction) => {
      const existing = await transaction
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(eq(userAddresses.userId, userId))
        .limit(1);
      const isDefault = input.isDefault === true || existing.length === 0;
      if (isDefault) {
        await transaction
          .update(userAddresses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(userAddresses.userId, userId));
      }

      const [created] = await transaction
        .insert(userAddresses)
        .values({
          id,
          userId,
          label: input.label,
          isDefault,
          ...encrypted,
        })
        .returning();
      return created;
    });

    return toSavedAddress(row);
  }

  async update(
    userId: string,
    addressId: string,
    input: UpdateSavedAddressInput,
  ): Promise<SavedAddress | undefined> {
    const [current] = await db
      .select()
      .from(userAddresses)
      .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)))
      .limit(1);
    if (!current) return undefined;

    const currentDetails = decryptAddress(
      current.encryptedPayload,
      current.encryptionKeyVersion,
      userId,
      addressId,
    );
    const { label, ...detailPatch } = input;
    const nextDetails = savedAddressDetailsSchema.parse({
      ...currentDetails,
      ...detailPatch,
    });
    const encrypted = encryptAddress(nextDetails, userId, addressId);
    const [updated] = await db
      .update(userAddresses)
      .set({
        label: label ?? current.label,
        ...encrypted,
        updatedAt: new Date(),
      })
      .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)))
      .returning();
    return updated ? toSavedAddress(updated) : undefined;
  }

  async setDefault(userId: string, addressId: string): Promise<SavedAddress | undefined> {
    return db.transaction(async (transaction) => {
      const [owned] = await transaction
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)))
        .limit(1);
      if (!owned) return undefined;

      await transaction
        .update(userAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(userAddresses.userId, userId));
      const [updated] = await transaction
        .update(userAddresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)))
        .returning();
      return updated ? toSavedAddress(updated) : undefined;
    });
  }

  async delete(userId: string, addressId: string): Promise<boolean> {
    return db.transaction(async (transaction) => {
      const [deleted] = await transaction
        .delete(userAddresses)
        .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)))
        .returning();
      if (!deleted) return false;

      if (deleted.isDefault) {
        const [replacement] = await transaction
          .select({ id: userAddresses.id })
          .from(userAddresses)
          .where(eq(userAddresses.userId, userId))
          .orderBy(desc(userAddresses.updatedAt))
          .limit(1);
        if (replacement) {
          await transaction
            .update(userAddresses)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(userAddresses.id, replacement.id));
        }
      }
      return true;
    });
  }
}

export const userAddressRepository = new UserAddressRepository();

