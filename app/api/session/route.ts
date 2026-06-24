import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    steamConnected: Boolean(session.steamConnected),
    steamId: session.steamId ?? null,
    googleConnected: Boolean(
      session.googleConnected &&
        session.googleAccessToken &&
        (session.googleTokenExpiresAt === undefined ||
          session.googleTokenExpiresAt > Date.now()),
    ),
  });
}
