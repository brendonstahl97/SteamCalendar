import { vi } from "vitest";
import { applyTestEnv } from "./helpers/env";
import { getCookieJar } from "./helpers/cookie-jar";

applyTestEnv();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => {
    const cookieJar = getCookieJar();
    return {
      get: (name: string) => {
        const value = cookieJar.get(name);
        return value !== undefined ? { name, value } : undefined;
      },
      set: (name: string, value: string) => {
        cookieJar.set(name, value);
      },
    };
  }),
}));
