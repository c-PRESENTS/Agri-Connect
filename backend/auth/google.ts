import { OAuth2Client } from "google-auth-library";

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (client) return client;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not set in environment");
  }
  client = new OAuth2Client(clientId);
  return client;
}

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    throw new Error("Invalid Google token: no payload");
  }

  return {
    googleId: payload.sub,
    email: payload.email || "",
    emailVerified: payload.email_verified === true,
    name: payload.name || payload.email?.split("@")[0] || "User",
    picture: payload.picture || "",
  };
}
