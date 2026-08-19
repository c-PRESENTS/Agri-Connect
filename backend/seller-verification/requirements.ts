import type {
  SellerVerificationRequirement,
} from "@shared/schema";
import { getName } from "country-list";

export const SELLER_REQUIREMENTS_VERSION = "2026-08-global-2";

type RequirementContext = {
  country: string;
  entityType: string;
  primaryActivities?: string[];
};

const baseRequirements: SellerVerificationRequirement[] = [
  {
    code: "business_profile",
    label: "Business profile",
    description: "Legal name, contact information and registered operating address.",
    kind: "profile",
    required: true,
  },
  {
    code: "authorized_representative",
    label: "Authorized representative",
    description: "The person authorized to manage this seller account.",
    kind: "person",
    required: true,
  },
  {
    code: "representative_identity",
    label: "Representative identity",
    description: "Government-issued photo identity document for the authorized representative.",
    kind: "document",
    required: true,
    acceptedDocumentTypes: ["passport", "driving_licence", "national_identity_card"],
  },
  {
    code: "address_evidence",
    label: "Address evidence",
    description: "A recent bank statement, utility bill or official address document.",
    kind: "document",
    required: true,
    acceptedDocumentTypes: ["utility_bill", "bank_statement", "government_letter"],
  },
  {
    code: "bank_account_proof",
    label: "Bank account ownership",
    description: "Evidence that the payout account belongs to the seller or legal entity.",
    kind: "document",
    required: true,
    acceptedDocumentTypes: ["bank_statement", "cancelled_cheque", "bank_letter"],
  },
];

function ownershipRequirement(entityType: string): SellerVerificationRequirement[] {
  if (["individual", "sole_proprietor"].includes(entityType)) return [];
  return [{
    code: "business_controllers",
    label: "Directors, partners and beneficial owners",
    description: "Add at least one director, partner, controller or beneficial owner.",
    kind: "person",
    required: true,
  }];
}

function indiaRequirements(context: RequirementContext): SellerVerificationRequirement[] {
  const foodActivity = (context.primaryActivities ?? []).some((activity) =>
    ["food", "processed_food", "dairy", "meat", "food_retail"].includes(activity),
  );
  return [
    {
      code: "pan",
      label: "PAN",
      description: "Permanent Account Number for the individual or legal entity.",
      kind: "tax_id",
      required: true,
    },
    {
      code: "pan_evidence",
      label: "PAN evidence",
      description: "PAN card or official PAN allotment evidence.",
      kind: "document",
      required: true,
      acceptedDocumentTypes: ["pan_card", "pan_allotment_letter"],
    },
    {
      code: "gstin",
      label: "GSTIN",
      description: "Required when the seller is GST registered or legally required to register.",
      kind: "tax_id",
      required: false,
      condition: "Required when GST registration applies",
    },
    {
      code: "gst_registration",
      label: "GST registration certificate",
      description: "Upload when a GSTIN has been provided.",
      kind: "document",
      required: false,
      acceptedDocumentTypes: ["gst_registration_certificate"],
      condition: "Required when GSTIN is provided",
    },
    {
      code: "business_registration",
      label: "Business formation evidence",
      description: "Registration or formation evidence for the selected business type.",
      kind: "document",
      required: !["individual", "sole_proprietor"].includes(context.entityType),
      acceptedDocumentTypes: ["incorporation_certificate", "partnership_deed", "cooperative_registration"],
    },
    {
      code: "fssai",
      label: "FSSAI registration or licence",
      description: "Required for activities that fall within food-business licensing scope.",
      kind: "document",
      required: foodActivity,
      acceptedDocumentTypes: ["fssai_registration", "fssai_licence"],
      condition: "Required for applicable food businesses",
    },
  ];
}

function ukRequirements(context: RequirementContext): SellerVerificationRequirement[] {
  return [
    {
      code: "company_registration",
      label: "Companies House registration",
      description: "Company registration number for registered companies and partnerships.",
      kind: "tax_id",
      required: ["company", "partnership", "nonprofit"].includes(context.entityType),
    },
    {
      code: "formation_evidence",
      label: "Business formation evidence",
      description: "Certificate of incorporation or other registration evidence.",
      kind: "document",
      required: ["company", "partnership", "nonprofit"].includes(context.entityType),
      acceptedDocumentTypes: ["incorporation_certificate", "partnership_registration", "charity_registration"],
    },
    {
      code: "vat",
      label: "VAT registration number",
      description: "Provide when the seller is VAT registered or legally required to register.",
      kind: "tax_id",
      required: false,
      condition: "Required when VAT registration applies",
    },
  ];
}

function internationalRequirements(context: RequirementContext): SellerVerificationRequirement[] {
  const registeredEntity = !["individual", "sole_proprietor"].includes(context.entityType);
  return [
    {
      code: "tax_id",
      label: "Tax identification number",
      description: "The seller's national tax identification number, when issued in the selected country.",
      kind: "tax_id",
      required: false,
      condition: "Required when a national tax identifier has been issued",
    },
    {
      code: "vat",
      label: "VAT / GST registration number",
      description: "Provide when the seller is registered for VAT, GST or an equivalent consumption tax.",
      kind: "tax_id",
      required: false,
      condition: "Required when VAT or GST registration applies",
    },
    {
      code: "formation_evidence",
      label: "Business formation evidence",
      description: "Official incorporation, partnership, cooperative, charity or other business registration evidence.",
      kind: "document",
      required: registeredEntity,
      acceptedDocumentTypes: [
        "incorporation_certificate",
        "business_registration_certificate",
        "partnership_registration",
        "cooperative_registration",
        "charity_registration",
      ],
    },
  ];
}

export function sellerRequirements(context: RequirementContext): {
  supported: boolean;
  version: string;
  requirements: SellerVerificationRequirement[];
} {
  const country = context.country.toUpperCase();
  const supported = Boolean(getName(country));
  const countryRequirements = !supported
    ? []
    : country === "IN"
      ? indiaRequirements(context)
      : country === "GB"
        ? ukRequirements(context)
        : internationalRequirements(context);
  return {
    supported,
    version: SELLER_REQUIREMENTS_VERSION,
    requirements: [...baseRequirements, ...ownershipRequirement(context.entityType), ...countryRequirements],
  };
}
