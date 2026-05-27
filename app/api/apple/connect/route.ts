import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  await setSession({ ...session, appleConnected: true });
  return NextResponse.json({ appleConnected: true });
}
