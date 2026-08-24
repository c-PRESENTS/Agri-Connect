import type { PoolClient } from "pg";
import type { AdminAccessContext } from "@shared/schema";
import { pool } from "../config/db";
import { sellerRequirements } from "../seller-verification/requirements";
import { isVerificationTransitionAllowed } from "./admin-user-validation";

export class AdminUserOperationError extends Error {
  constructor(public status: 404 | 409 | 422, public code: string, message: string) {
    super(message);
  }
}

type Actor = {
  userId: string;
  access: AdminAccessContext;
  requestId?: string | null;
};

type DocumentDecision = { documentId: string; status: "verified" | "rejected"; reason?: string };

async function auditInTransaction(
  client: PoolClient,
  actor: Actor,
  input: { action: string; permissionCode: string; targetType: string; targetId: string; changes?: Record<string, unknown>; metadata?: Record<string, unknown> },
) {
  await client.query(
    `INSERT INTO admin_audit_events
      (organisation_id,actor_user_id,membership_id,action,permission_code,target_type,target_id,outcome,request_id,changes,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'success',$8,$9::jsonb,$10::jsonb)`,
    [
      actor.access.organisation?.id ?? null,
      actor.userId,
      actor.access.membership?.id ?? null,
      input.action,
      input.permissionCode,
      input.targetType,
      input.targetId,
      actor.requestId ?? null,
      JSON.stringify(input.changes ?? {}),
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

function assertFresh(actual: Date | string, expected: string) {
  if (new Date(actual).getTime() !== new Date(expected).getTime()) {
    throw new AdminUserOperationError(409, "ADMIN_STALE_UPDATE", "This record changed after it was opened. Refresh and review the latest version.");
  }
}

async function verifyMandatoryEvidence(client: PoolClient, verificationCase: Record<string, any>, documentDecisions: DocumentDecision[]) {
  const [profileResult, identifierResult, peopleResult, documentResult] = await Promise.all([
    client.query("SELECT * FROM seller_business_profiles WHERE seller_id=$1 LIMIT 1", [verificationCase.seller_id]),
    client.query("SELECT type,status FROM seller_tax_identifiers WHERE seller_id=$1", [verificationCase.seller_id]),
    client.query("SELECT role FROM seller_associated_persons WHERE seller_id=$1", [verificationCase.seller_id]),
    client.query("SELECT id,requirement_code,status FROM seller_verification_documents WHERE case_id=$1 FOR UPDATE", [verificationCase.id]),
  ]);
  const profile = profileResult.rows[0];
  if (!profile) throw new AdminUserOperationError(422, "ADMIN_VERIFICATION_INCOMPLETE", "The seller business profile is missing.");
  const decisions = new Map(documentDecisions.map((decision) => [decision.documentId, decision.status]));
  const documents = documentResult.rows.map((document) => ({ ...document, status: decisions.get(document.id) ?? document.status }));
  const identifiers = identifierResult.rows;
  const people = peopleResult.rows;
  const requirements = sellerRequirements({
    country: profile.country,
    entityType: profile.entity_type,
    primaryActivities: Array.isArray(profile.primary_activities) ? profile.primary_activities : [],
  }).requirements;
  const gstProvided = identifiers.some((item) => item.type === "gstin");
  const missing = requirements.filter((requirement) => {
    const required = requirement.required || (requirement.code === "gst_registration" && gstProvided);
    if (!required) return false;
    if (requirement.kind === "profile") return false;
    if (requirement.kind === "tax_id") return !identifiers.some((item) => item.type === requirement.code && item.status !== "rejected");
    if (requirement.kind === "person") {
      if (requirement.code === "authorized_representative") return !people.some((item) => item.role === "representative");
      return !people.some((item) => ["director", "partner", "beneficial_owner", "controller"].includes(item.role));
    }
    if (requirement.kind === "document") return !documents.some((item) => item.requirement_code === requirement.code && item.status === "verified");
    return false;
  });
  if (missing.length) {
    throw new AdminUserOperationError(422, "ADMIN_VERIFICATION_INCOMPLETE", `Mandatory evidence is not verified: ${missing.map((item) => item.label).join(", ")}`);
  }
}

export async function reviewAdminVerification(
  caseId: string,
  actor: Actor,
  input: { decision: "verified" | "needs_information" | "rejected" | "suspended"; reason: string; expectedUpdatedAt: string; documentDecisions: DocumentDecision[] },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const caseResult = await client.query("SELECT * FROM seller_verification_cases WHERE id=$1 FOR UPDATE", [caseId]);
    const verificationCase = caseResult.rows[0];
    if (!verificationCase) throw new AdminUserOperationError(404, "ADMIN_VERIFICATION_NOT_FOUND", "Seller verification case was not found.");
    assertFresh(verificationCase.updated_at, input.expectedUpdatedAt);
    if (!isVerificationTransitionAllowed(verificationCase.status, input.decision)) {
      throw new AdminUserOperationError(422, "ADMIN_INVALID_VERIFICATION_TRANSITION", `A ${verificationCase.status} case cannot transition to ${input.decision}.`);
    }

    const documents = await client.query("SELECT id FROM seller_verification_documents WHERE case_id=$1 FOR UPDATE", [caseId]);
    const ownedIds = new Set(documents.rows.map((item: Record<string, any>) => item.id));
    if (new Set(input.documentDecisions.map((item) => item.documentId)).size !== input.documentDecisions.length) {
      throw new AdminUserOperationError(422, "ADMIN_DUPLICATE_DOCUMENT_DECISION", "Each document can be reviewed only once per decision.");
    }
    for (const decision of input.documentDecisions) {
      if (!ownedIds.has(decision.documentId)) throw new AdminUserOperationError(422, "ADMIN_DOCUMENT_OWNERSHIP_MISMATCH", "A document does not belong to this verification case.");
    }
    if (input.decision === "verified") await verifyMandatoryEvidence(client, verificationCase, input.documentDecisions);

    const reviewedAt = new Date();
    for (const decision of input.documentDecisions) {
      await client.query(
        `UPDATE seller_verification_documents SET status=$2,rejection_reason=$3,reviewed_at=$4,reviewed_by=$5,updated_at=$4 WHERE id=$1`,
        [decision.documentId, decision.status, decision.status === "rejected" ? (decision.reason || input.reason) : null, reviewedAt, actor.userId],
      );
    }
    const expiresAt = input.decision === "verified" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;
    await client.query(
      `UPDATE seller_verification_cases SET status=$2,reviewed_by=$3,reviewed_at=$4,review_reason=$5,expires_at=$6,updated_at=$4 WHERE id=$1`,
      [caseId, input.decision, actor.userId, reviewedAt, input.reason, expiresAt],
    );
    if (["verified", "rejected"].includes(input.decision)) {
      await client.query(
        `UPDATE seller_tax_identifiers SET status=$2::varchar,verification_source='admin_manual_review',verified_at=CASE WHEN $2::varchar='verified' THEN $3::timestamptz ELSE NULL::timestamptz END,updated_at=$3::timestamptz WHERE seller_id=$1`,
        [verificationCase.seller_id, input.decision, reviewedAt],
      );
    }
    await client.query("UPDATE users SET is_verified=$2,updated_at=$3 WHERE id=$1", [verificationCase.seller_id, input.decision === "verified", reviewedAt]);
    await client.query(
      "INSERT INTO seller_verification_events (case_id,actor_id,event_type,event_data) VALUES ($1,$2,$3,$4::jsonb)",
      [caseId, actor.userId, `verification_${input.decision}`, JSON.stringify({ reason: input.reason, reviewedDocumentCount: input.documentDecisions.length })],
    );
    await auditInTransaction(client, actor, {
      action: "admin.verification_reviewed",
      permissionCode: input.decision === "verified" ? "verification.approve" : input.decision === "rejected" ? "verification.reject" : "verification.review",
      targetType: "verification_case",
      targetId: caseId,
      changes: { status: { from: verificationCase.status, to: input.decision }, reviewedDocumentCount: input.documentDecisions.length },
      metadata: { reason: input.reason, sellerId: verificationCase.seller_id },
    });
    await client.query("COMMIT");
    return { sellerId: verificationCase.seller_id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyAdminUser(userId: string, actor: Actor, input: { reason: string; expectedUpdatedAt: string }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const user = userResult.rows[0];
    if (!user) throw new AdminUserOperationError(404, "ADMIN_USER_NOT_FOUND", "User was not found.");
    assertFresh(user.updated_at, input.expectedUpdatedAt);
    if (user.account_status !== "active") throw new AdminUserOperationError(422, "ADMIN_USER_NOT_ACTIVE", "Reactivate this account before verifying it.");
    const verificationResult = await client.query("SELECT * FROM seller_verification_cases WHERE seller_id=$1 FOR UPDATE", [userId]);
    const verificationCase = verificationResult.rows[0];
    const now = new Date();
    if (verificationCase) {
      if (verificationCase.status !== "pending_review") {
        throw new AdminUserOperationError(422, "ADMIN_INVALID_VERIFICATION_TRANSITION", "Seller verification must be pending review before approval.");
      }
      await verifyMandatoryEvidence(client, verificationCase, []);
      await client.query("UPDATE seller_verification_cases SET status='verified',reviewed_by=$2,reviewed_at=$3,review_reason=$4,expires_at=$5,updated_at=$3 WHERE id=$1", [verificationCase.id, actor.userId, now, input.reason, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)]);
      await client.query("UPDATE seller_tax_identifiers SET status='verified',verification_source='admin_manual_review',verified_at=$2,updated_at=$2 WHERE seller_id=$1", [userId, now]);
      await client.query("INSERT INTO seller_verification_events (case_id,actor_id,event_type,event_data) VALUES ($1,$2,'verification_verified',$3::jsonb)", [verificationCase.id, actor.userId, JSON.stringify({ reason: input.reason, source: "user_directory" })]);
    }
    await client.query("UPDATE users SET is_verified=true,updated_at=$2 WHERE id=$1", [userId, now]);
    await auditInTransaction(client, actor, { action: "admin.user_verified", permissionCode: "users.approve", targetType: "user", targetId: userId, changes: { isVerified: { from: user.is_verified, to: true } }, metadata: { reason: input.reason } });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function changeAdminUserStatus(userId: string, actor: Actor, input: { status: "active" | "suspended"; reason: string; expectedUpdatedAt: string }) {
  if (userId === actor.userId) throw new AdminUserOperationError(422, "ADMIN_SELF_SUSPENSION_FORBIDDEN", "You cannot suspend your own account.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const user = userResult.rows[0];
    if (!user) throw new AdminUserOperationError(404, "ADMIN_USER_NOT_FOUND", "User was not found.");
    assertFresh(user.updated_at, input.expectedUpdatedAt);
    if (input.status === "suspended") {
      const superAdmin = await client.query(`SELECT 1 FROM organisation_memberships m JOIN admin_roles r ON r.id=m.role_id
        WHERE m.user_id=$1 AND m.status='active' AND r.is_super_admin=true LIMIT 1`, [userId]);
      if (superAdmin.rows[0]) throw new AdminUserOperationError(422, "ADMIN_SUPER_ADMIN_SUSPENSION_FORBIDDEN", "Remove Super Admin authority through employee governance before suspending this account.");
      if (user.account_status !== "active") throw new AdminUserOperationError(422, "ADMIN_INVALID_ACCOUNT_TRANSITION", "Only an active account can be suspended.");
    } else if (!['suspended', 'deactivated'].includes(user.account_status)) {
      throw new AdminUserOperationError(422, "ADMIN_INVALID_ACCOUNT_TRANSITION", "Only a suspended or deactivated account can be reactivated.");
    }
    const now = new Date();
    await client.query("UPDATE users SET account_status=$2,account_status_reason=$3,account_status_updated_at=$4::timestamptz,updated_at=$4::timestamp WHERE id=$1", [userId, input.status, input.reason, now]);
    await auditInTransaction(client, actor, {
      action: input.status === "active" ? "admin.user_reactivated" : "admin.user_suspended",
      permissionCode: "users.suspend",
      targetType: "user",
      targetId: userId,
      changes: { accountStatus: { from: user.account_status, to: input.status } },
      metadata: { reason: input.reason },
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addAdminUserNote(userId: string, actor: Actor, input: { classification: string; text: string }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const exists = await client.query("SELECT 1 FROM users WHERE id=$1", [userId]);
    if (!exists.rows[0]) throw new AdminUserOperationError(404, "ADMIN_USER_NOT_FOUND", "User was not found.");
    const note = await client.query(
      "INSERT INTO admin_user_notes (subject_user_id,author_user_id,classification,note_text) VALUES ($1,$2,$3,$4) RETURNING id,created_at,updated_at",
      [userId, actor.userId, input.classification, input.text],
    );
    await auditInTransaction(client, actor, { action: "admin.user_note_added", permissionCode: "users.edit", targetType: "user", targetId: userId, changes: { noteAdded: true }, metadata: { classification: input.classification, noteId: note.rows[0].id } });
    await client.query("COMMIT");
    return note.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
