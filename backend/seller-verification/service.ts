import {
  type SellerBusinessProfileInput,
  type SellerVerificationRequirement,
} from "@shared/schema";
import { protectSensitiveValue } from "../security/sensitive-fields";
import { sellerVerificationRepository } from "../repositories/seller-verification-repository";
import { sellerRequirements, SELLER_REQUIREMENTS_VERSION } from "./requirements";
import { sellerCapabilities } from "./capabilities";

export class SellerVerificationRuleError extends Error {}

function requirementCompletion(
  requirement: SellerVerificationRequirement,
  data: {
    profile: unknown;
    identifiers: Array<{ type: string; status: string }>;
    people: Array<{ role: string }>;
    documents: Array<{ requirementCode: string; status: string }>;
  },
): boolean {
  if (requirement.kind === "profile") return Boolean(data.profile);
  if (requirement.kind === "tax_id") return data.identifiers.some((identifier) => identifier.type === requirement.code && identifier.status !== "rejected");
  if (requirement.kind === "person") {
    if (requirement.code === "authorized_representative") return data.people.some((person) => person.role === "representative");
    return data.people.some((person) => ["director", "partner", "beneficial_owner", "controller"].includes(person.role));
  }
  if (requirement.kind === "document") return data.documents.some((document) =>
    document.requirementCode === requirement.code && ["uploaded", "pending_review", "verified"].includes(document.status),
  );
  return false;
}

function validateIdentifier(country: string, type: string, value: string): void {
  const normalized = value.toUpperCase().replace(/\s+/g, "");
  if (country === "IN" && type === "pan" && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalized)) throw new Error("Enter a valid 10-character PAN");
  if (country === "IN" && type === "gstin" && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalized)) throw new Error("Enter a valid 15-character GSTIN");
  if (country === "GB" && type === "vat" && !/^(GB)?([0-9]{9}|[0-9]{12})$/.test(normalized)) throw new Error("Enter a valid UK VAT registration number");
  if (country === "GB" && type === "company_registration" && !/^(?:[A-Z]{2})?[0-9A-Z]{6,8}$/.test(normalized)) throw new Error("Enter a valid Companies House registration number");
}

export class SellerVerificationService {
  async saveProfile(sellerId: string, input: SellerBusinessProfileInput) {
    const requirements = sellerRequirements(input);
    if (!requirements.supported) throw new Error("Commercial seller verification is not yet supported for this country");
    const previous = await sellerVerificationRepository.getCase(sellerId);
    const profile = await sellerVerificationRepository.upsertProfile(sellerId, input);
    const verificationCase = await sellerVerificationRepository.upsertCase({
      ...(previous ?? {}),
      sellerId,
      country: input.country,
      entityType: input.entityType,
      requirementsVersion: SELLER_REQUIREMENTS_VERSION,
      status: previous?.status === "pending_review" ? "needs_information" : previous?.status === "verified" ? "in_progress" : (previous?.status ?? "in_progress"),
      reviewReason: previous?.status === "verified" ? "Business information changed; re-verification is required." : previous?.reviewReason,
      reviewedAt: previous?.status === "verified" ? null : previous?.reviewedAt,
      reviewedBy: previous?.status === "verified" ? null : previous?.reviewedBy,
      expiresAt: previous?.status === "verified" ? null : previous?.expiresAt,
    });
    await sellerVerificationRepository.recordEvent(verificationCase.id, sellerId, "business_profile_saved", { country: input.country, entityType: input.entityType });
    return profile;
  }

  async saveTaxIdentifier(sellerId: string, input: { country: string; type: string; value: string }) {
    const profile = await sellerVerificationRepository.getProfile(sellerId);
    if (!profile || profile.country !== input.country) throw new Error("Tax identifier country must match the business profile");
    const allowed = sellerRequirements({
      country: profile.country,
      entityType: profile.entityType,
      primaryActivities: Array.isArray(profile.primaryActivities)
        ? profile.primaryActivities as string[]
        : [],
    }).requirements.some((requirement) => requirement.kind === "tax_id" && requirement.code === input.type);
    if (!allowed) throw new Error("This tax identifier is not part of the seller's country requirements");
    validateIdentifier(input.country, input.type, input.value);
    return sellerVerificationRepository.upsertTaxIdentifier({ sellerId, country: input.country, type: input.type, ...protectSensitiveValue(input.value), status: "pending", verificationSource: "manual_review" });
  }

  async status(sellerId: string) {
    const [profile, verificationCase, identifiers, people, documents] = await Promise.all([
      sellerVerificationRepository.getProfile(sellerId),
      sellerVerificationRepository.getCase(sellerId),
      sellerVerificationRepository.listTaxIdentifiers(sellerId),
      sellerVerificationRepository.listPeople(sellerId),
      sellerVerificationRepository.listDocuments(sellerId),
    ]);
    const requirementsResult = sellerRequirements({
      country: profile?.country ?? verificationCase?.country ?? "",
      entityType: profile?.entityType ?? verificationCase?.entityType ?? "individual",
      primaryActivities: Array.isArray(profile?.primaryActivities) ? profile.primaryActivities as string[] : [],
    });
    const requirements = requirementsResult.requirements.map((requirement) => ({
      ...requirement,
      complete: requirementCompletion(requirement, { profile, identifiers, people, documents }),
    }));
    return {
      profile,
      case: verificationCase,
      identifiers,
      people,
      documents: documents.map(({ storageKey: _storageKey, sha256: _sha256, ...document }) => document),
      supported: requirementsResult.supported,
      requirementsVersion: requirementsResult.version,
      requirements,
      capabilities: await sellerCapabilities(sellerId),
    };
  }

  async submit(sellerId: string) {
    const state = await this.status(sellerId);
    if (!state.profile || !state.case || !state.supported) throw new Error("Complete a supported business profile before submission");
    if (!["in_progress", "needs_information", "rejected", "expired"].includes(state.case.status)) {
      throw new SellerVerificationRuleError(`A ${state.case.status} verification case cannot be submitted.`);
    }
    const missing = state.requirements.filter((requirement) => requirement.required && !requirement.complete);
    const gstinProvided = state.identifiers.some((identifier) => identifier.type === "gstin");
    if (gstinProvided && !state.requirements.find((requirement) => requirement.code === "gst_registration")?.complete) {
      missing.push({ code: "gst_registration", label: "GST registration certificate", description: "Required when GSTIN is provided", kind: "document", required: true, complete: false });
    }
    if (missing.length) throw new Error(`Complete these requirements before submission: ${missing.map((item) => item.label).join(", ")}`);
    const updated = await sellerVerificationRepository.upsertCase({ ...state.case, status: "pending_review", submittedAt: new Date(), reviewedAt: null, reviewedBy: null, reviewReason: null });
    for (const document of state.documents.filter((item) => item.status === "uploaded")) {
      await sellerVerificationRepository.updateDocument(document.id, { status: "pending_review" });
    }
    await sellerVerificationRepository.recordEvent(updated.id, sellerId, "verification_submitted", { requirementsVersion: updated.requirementsVersion });
    return this.status(sellerId);
  }

}

export const sellerVerificationService = new SellerVerificationService();
