export const SESSION_COOKIE_NAME = "swc_session";

const cookieJar = new Map<string, string>();

export function resetCookieJar() {
  cookieJar.clear();
}

export function setSessionCookie(value: string) {
  cookieJar.set(SESSION_COOKIE_NAME, value);
}

export function getSessionCookie(): string | undefined {
  return cookieJar.get(SESSION_COOKIE_NAME);
}

export function getCookieJar() {
  return cookieJar;
}
