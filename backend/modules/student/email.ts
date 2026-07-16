import { notify } from "../../notifications";

type TestMessage = { email: string; token: string; createdAt: string };
const testOutbox = new Map<string, TestMessage>();

function confirmationUrl(token: string): string {
  const baseUrl = (process.env.STUDENT_PORTAL_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${baseUrl}/student/confirm-login?token=${encodeURIComponent(token)}`;
}

export async function sendStudentLoginConfirmation(email: string, token: string, expiresMinutes: number): Promise<boolean> {
  const mode = process.env.STUDENT_EMAIL_MODE || "disabled";
  if (mode === "test" && process.env.NODE_ENV !== "production") {
    testOutbox.set(email.toLowerCase(), { email: email.toLowerCase(), token, createdAt: new Date().toISOString() });
    return true;
  }
  if (mode !== "provider") return false;

  const result = await notify({
    to: { email },
    subject: "Confirm your AgriConnect student login",
    body: [
      "A student login was requested for your account.",
      "",
      `Confirm this sign-in within ${expiresMinutes} minutes:`,
      confirmationUrl(token),
      "",
      "If you did not request this login, ignore this message.",
      "",
      "— AgriConnect Student Help Point",
    ].join("\n"),
  });
  return result.channels.includes("email");
}

export function readStudentTestConfirmation(email: string): TestMessage | undefined {
  return testOutbox.get(email.toLowerCase());
}
