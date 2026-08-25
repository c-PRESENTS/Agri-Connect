import { notify } from "../notifications";

type SecurityMessage = { kind: "invitation" | "email_verification" | "password_reset"; email: string; url: string; createdAt: string };
const testOutbox = new Map<string, SecurityMessage>();

export async function sendSecurityLink(kind: SecurityMessage["kind"], email: string, token: string): Promise<"email" | "preview"> {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:5000").replace(/\/$/, "");
  const paths = {
    invitation: "/accept-invitation",
    email_verification: "/verify-email",
    password_reset: "/reset-password",
  } as const;
  const url = `${base}${paths[kind]}?token=${encodeURIComponent(token)}`;
  if (process.env.NODE_ENV !== "production") testOutbox.set(`${kind}:${email.toLowerCase()}`, { kind, email: email.toLowerCase(), url, createdAt: new Date().toISOString() });
  const labels = {
    invitation: ["AgriConnect staff invitation", "Accept your AgriConnect Organisation Portal invitation"],
    email_verification: ["Verify your AgriConnect email", "Verify your email address"],
    password_reset: ["Reset your AgriConnect password", "Reset your password"],
  } as const;
  const result = await notify({ to: { email }, subject: labels[kind][0], body: `${labels[kind][1]} using this single-use link. It expires soon:\n\n${url}` });
  return result.channels.includes("email") ? "email" : "preview";
}

export function readSecurityTestMessage(kind: SecurityMessage["kind"], email: string): SecurityMessage | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return testOutbox.get(`${kind}:${email.toLowerCase()}`);
}
