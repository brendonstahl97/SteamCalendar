export const TEST_SESSION_SECRET =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export const TEST_ENV = {
  SESSION_SECRET: TEST_SESSION_SECRET,
  APP_BASE_URL: "http://localhost:3000",
  STEAM_REALM: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
} as const;

export function applyTestEnv() {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] = value;
  }
}
