export const TEST_SESSION_SECRET =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export const TEST_ENV = {
  SESSION_SECRET: TEST_SESSION_SECRET,
  APP_BASE_URL: "http://localhost:3000",
  STEAM_REALM: "http://localhost:3000",
} as const;

export function applyTestEnv() {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] = value;
  }
}
