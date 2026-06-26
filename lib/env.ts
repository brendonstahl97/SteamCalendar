const requiredEnv = [
  "SESSION_SECRET",
  "APP_BASE_URL",
  "STEAM_REALM",
] as const;

type EnvKey = (typeof requiredEnv)[number];

function requireEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnv() {
  const env = Object.fromEntries(
    requiredEnv.map((key) => [key, requireEnv(key)]),
  ) as Record<EnvKey, string>;

  if (!/^[0-9a-fA-F]{64}$/.test(env.SESSION_SECRET)) {
    throw new Error("SESSION_SECRET must be 64 hex characters (32 bytes).");
  }

  return env;
}
