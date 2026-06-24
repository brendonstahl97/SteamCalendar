import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

const SESSION_COOKIE = "swc_session";

export type SessionData = {
  steamId?: string;
  steamConnected?: boolean;
  googleConnected?: boolean;
  googleAccessToken?: string;
  googleTokenExpiresAt?: number;
  oauthStates?: Record<string, string>;
};

function getKeyFromHex(hex: string) {
  return Buffer.from(hex, "hex");
}

export function encryptSessionData(data: SessionData, secretHex: string): string {
  const iv = randomBytes(12);
  const key = getKeyFromHex(secretHex);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSessionData(raw: string, secretHex: string): SessionData {
  const decoded = Buffer.from(raw, "base64url");
  const iv = decoded.subarray(0, 12);
  const tag = decoded.subarray(12, 28);
  const encrypted = decoded.subarray(28);
  const key = getKeyFromHex(secretHex);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as SessionData;
}

function encrypt(data: SessionData): string {
  return encryptSessionData(data, getEnv().SESSION_SECRET);
}

function decrypt(raw: string): SessionData {
  return decryptSessionData(raw, getEnv().SESSION_SECRET);
}

export async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return {};
  }
  try {
    return decrypt(raw);
  } catch {
    return {};
  }
}

export async function setSession(nextData: SessionData) {
  const cookieStore = await cookies();
  const value = encrypt(nextData);
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
}

export function newOAuthState() {
  return createHash("sha256")
    .update(randomBytes(32))
    .digest("base64url")
    .slice(0, 48);
}
