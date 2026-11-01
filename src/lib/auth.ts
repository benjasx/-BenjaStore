export interface Credential {
  hash: string;
  salt: string;
}

export const MAX_PIN_ATTEMPTS = 5;
export const LOCK_SECONDS = 30;
const ITERATIONS = 100_000;
const ATTEMPTS_KEY = "benjastore.attempts";

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

const fromBase64 = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const derive = async (secret: string, salt: Uint8Array<ArrayBuffer>) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
};

export const hashSecret = async (secret: string): Promise<Credential> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    hash: toBase64(await derive(secret, salt)),
    salt: toBase64(salt),
  };
};

export const verifySecret = async (
  secret: string,
  cred: Credential,
): Promise<boolean> => {
  const expected = fromBase64(cred.hash);
  const actual = await derive(secret, fromBase64(cred.salt));
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
};

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

export const isValidPassword = (password: string) =>
  password.length >= 8 && password.length <= 64;

interface Attempts {
  fails: number;
  until?: number;
}

const readAttempts = (): Record<string, Attempts> => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, Attempts>)
      : {};
  } catch {
    return {};
  }
};

const writeAttempts = (all: Record<string, Attempts>) => {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch {
    // sin almacenamiento: el bloqueo no persiste
  }
};

export const lockedUntil = (userId: string, now = Date.now()) => {
  const until = readAttempts()[userId]?.until;
  return until !== undefined && until > now ? until : null;
};

export const registerFailure = (
  userId: string,
  now = Date.now(),
): { locked: boolean; until?: number } => {
  const all = readAttempts();
  const current = all[userId];
  const expired = current?.until !== undefined && current.until <= now;
  const fails = (expired ? 0 : (current?.fails ?? 0)) + 1;
  if (fails >= MAX_PIN_ATTEMPTS) {
    const until = now + LOCK_SECONDS * 1000;
    all[userId] = { fails: 0, until };
    writeAttempts(all);
    return { locked: true, until };
  }
  all[userId] = { fails };
  writeAttempts(all);
  return { locked: false };
};

export const registerSuccess = (userId: string) => {
  const all = readAttempts();
  if (!(userId in all)) return;
  delete all[userId];
  writeAttempts(all);
};
