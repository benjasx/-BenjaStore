import {
  hashSecret,
  isValidPassword,
  isValidPin,
  LOCK_SECONDS,
  lockedUntil,
  MAX_PIN_ATTEMPTS,
  registerFailure,
  registerSuccess,
  verifySecret,
} from "@/lib/auth";

describe("hashing", () => {
  it("verifies the right secret and rejects a wrong one", async () => {
    const cred = await hashSecret("1234");
    expect(await verifySecret("1234", cred)).toBe(true);
    expect(await verifySecret("1235", cred)).toBe(false);
  });

  it("uses a different salt and hash for the same secret", async () => {
    const a = await hashSecret("1234");
    const b = await hashSecret("1234");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it("never stores the secret in clear", async () => {
    const cred = await hashSecret("1234");
    expect(JSON.stringify(cred)).not.toContain("1234");
  });
});

describe("validation", () => {
  it("accepts only 4-digit PINs", () => {
    expect(isValidPin("0123")).toBe(true);
    for (const p of ["", "123", "12345", "12a4", " 123"])
      expect(isValidPin(p)).toBe(false);
  });

  it("accepts passwords of 8 to 64 characters", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("a".repeat(64))).toBe(true);
    expect(isValidPassword("a".repeat(65))).toBe(false);
  });
});

describe("PIN lockout", () => {
  beforeEach(() => localStorage.clear());

  it("locks for 30 seconds on the fifth consecutive failure", () => {
    const now = 1_000_000;
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) {
      expect(registerFailure("lu", now).locked).toBe(false);
      expect(lockedUntil("lu", now)).toBeNull();
    }
    const result = registerFailure("lu", now);
    expect(result).toEqual({ locked: true, until: now + LOCK_SECONDS * 1000 });
    expect(lockedUntil("lu", now + 1000)).toBe(now + LOCK_SECONDS * 1000);
  });

  it("unlocks after the lock ends and starts counting again", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) registerFailure("lu", now);
    const later = now + LOCK_SECONDS * 1000 + 1;
    expect(lockedUntil("lu", later)).toBeNull();
    expect(registerFailure("lu", later).locked).toBe(false);
  });

  it("resets the counter after a success", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_PIN_ATTEMPTS - 1; i++) registerFailure("lu", now);
    registerSuccess("lu");
    for (let i = 0; i < MAX_PIN_ATTEMPTS - 1; i++)
      expect(registerFailure("lu", now).locked).toBe(false);
  });

  it("tracks users independently and survives corrupt storage", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) registerFailure("lu", now);
    expect(lockedUntil("an", now)).toBeNull();
    localStorage.setItem("benjastore.attempts", "{no json");
    expect(lockedUntil("lu", now)).toBeNull();
    expect(registerFailure("lu", now).locked).toBe(false);
  });
});
