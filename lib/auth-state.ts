import { SessionData } from "@/lib/session";

export function assertOAuthState(
  session: SessionData,
  provider: string,
  receivedState: string | null,
) {
  const expected = session.oauthStates?.[provider];
  if (!expected || !receivedState || expected !== receivedState) {
    throw new Error("Invalid OAuth state.");
  }
}
