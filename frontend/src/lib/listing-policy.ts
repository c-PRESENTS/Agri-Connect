export const MINIMAL_LISTING_FEE_USD = 1;
export const LISTING_POLICY_STATUS = "confirmed_ui_foundation" as const;

export const LISTING_POLICY = {
  feeUsd: MINIMAL_LISTING_FEE_USD,
  status: LISTING_POLICY_STATUS,
  title: "$1 minimal listing policy",
  zeroEntryMessage: "Zero entry barriers for small farmers — no listing fee is collected in the app yet.",
  enforcementMessage: "Payment collection and listing-fee enforcement are planned for a future payment integration.",
} as const;
