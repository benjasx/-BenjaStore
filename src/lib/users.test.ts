import { Timestamp } from "firebase/firestore";
import { hashSecret, verifySecret } from "@/lib/auth";
import {
  assertKeepsOwner,
  assertNotSelf,
  createFirstOwner,
  createUser,
  deleteUser,
  initialsOf,
  normalizeUsername,
  normalizeUserName,
  setUserActive,
  updateUser,
  type AppUser,
} from "@/lib/users";

const fs = vi.hoisted(() => ({
  docs: [] as { id: string; data: Record<string, unknown> }[],
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/firestore")>()),
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (ref: unknown, ...rest: string[]) => ({
    id: rest.at(-1) ?? "new-id",
    ref,
  }),
  getDocs: fs.getDocs,
  setDoc: fs.setDoc,
  updateDoc: fs.updateDoc,
  deleteDoc: fs.deleteDoc,
  runTransaction: fs.runTransaction,
  serverTimestamp: () => "ts",
  deleteField: () => "DELETE",
}));

const stored = async (
  id: string,
  name: string,
  role: "owner" | "cashier",
  extra: Record<string, unknown> = {},
) => ({
  id,
  data: {
    name,
    initials: initialsOf(name),
    role,
    active: true,
    pin: await hashSecret("1234"),
    createdAt: Timestamp.now(),
    ...extra,
  },
});

const setDocs = (docs: typeof fs.docs) => {
  fs.getDocs.mockResolvedValue({
    docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  });
};

beforeEach(() => {
  Object.values(fs).forEach((f) => typeof f === "function" && f.mockReset());
  fs.runTransaction.mockImplementation(async (_db, run) =>
    run({ get: async () => ({ exists: () => false }), set: fs.setDoc }),
  );
});

describe("helpers", () => {
  it("computes initials", () => {
    expect(initialsOf("Luis")).toBe("LU");
    expect(initialsOf("ana maría")).toBe("AM");
    expect(initialsOf("  Juan  Carlos  Pérez ")).toBe("JC");
    expect(initialsOf("Z")).toBe("Z");
  });

  it("validates names and usernames", () => {
    expect(normalizeUserName("  Luis  ")).toBe("Luis");
    expect(normalizeUserName("   ")).toBeNull();
    expect(normalizeUserName("a".repeat(31))).toBeNull();
    expect(normalizeUsername(" Rodrigo.Admin ")).toBe("rodrigo.admin");
    expect(normalizeUsername("ab")).toBeNull();
    expect(normalizeUsername("con espacio")).toBeNull();
  });

  it("keeps at least one active owner", () => {
    const users = [
      { id: "ro", role: "owner", active: true },
      { id: "lu", role: "cashier", active: true },
    ] as AppUser[];
    expect(() => assertKeepsOwner(users, "ro", null)).toThrow(/Dueño/);
    expect(() =>
      assertKeepsOwner(users, "ro", { role: "owner", active: false }),
    ).toThrow(/Dueño/);
    expect(() =>
      assertKeepsOwner(users, "ro", { role: "cashier", active: true }),
    ).toThrow(/Dueño/);
    expect(() => assertKeepsOwner(users, "lu", null)).not.toThrow();
    const two = [
      ...users,
      { id: "x", role: "owner", active: true },
    ] as AppUser[];
    expect(() => assertKeepsOwner(two, "ro", null)).not.toThrow();
  });

  it("blocks acting on yourself", () => {
    expect(() => assertNotSelf("ro", "ro")).toThrow();
    expect(() => assertNotSelf("ro", "lu")).not.toThrow();
    expect(() => assertNotSelf("ro")).not.toThrow();
  });
});

describe("createFirstOwner", () => {
  const input = {
    name: "Rodrigo",
    pin: "1234",
    admin: { username: "Rodrigo", password: "12345678" },
  };

  it("creates the owner with hashed credentials when users is empty", async () => {
    setDocs([]);
    const owner = await createFirstOwner(input);
    expect(owner.role).toBe("owner");
    expect(owner.admin?.username).toBe("rodrigo");
    expect(JSON.stringify(fs.setDoc.mock.calls[0][1])).not.toContain(
      "12345678",
    );
    expect(await verifySecret("1234", owner.pin)).toBe(true);
    expect(await verifySecret("12345678", owner.admin!.password)).toBe(true);
  });

  it("rejects a second setup", async () => {
    setDocs([await stored("ro", "Rodrigo", "owner")]);
    await expect(createFirstOwner(input)).rejects.toThrow(/ya se hizo/);
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it("rejects when the fixed owner document already exists", async () => {
    setDocs([]);
    fs.runTransaction.mockImplementation(async (_db, run) =>
      run({ get: async () => ({ exists: () => true }), set: fs.setDoc }),
    );
    await expect(createFirstOwner(input)).rejects.toThrow(/ya se hizo/);
  });
});

describe("createUser", () => {
  it("creates a cashier with a PIN hash and no admin credentials", async () => {
    setDocs([
      await stored("ro", "Rodrigo", "owner", {
        admin: { username: "rodrigo", password: await hashSecret("12345678") },
      }),
    ]);
    const user = await createUser({
      name: " Ana ",
      role: "cashier",
      pin: "4321",
    });
    expect(user).toMatchObject({
      name: "Ana",
      initials: "AN",
      role: "cashier",
    });
    expect(user.admin).toBeUndefined();
    const [, saved] = fs.setDoc.mock.calls[0];
    expect(JSON.stringify(saved)).not.toContain("4321");
  });

  it("requires admin credentials and a unique username for owners", async () => {
    setDocs([
      await stored("ro", "Rodrigo", "owner", {
        admin: { username: "rodrigo", password: await hashSecret("12345678") },
      }),
    ]);
    await expect(
      createUser({ name: "Sofi", role: "owner", pin: "1111" }),
    ).rejects.toThrow(/usuario y contraseña/);
    await expect(
      createUser({
        name: "Sofi",
        role: "owner",
        pin: "1111",
        admin: { username: "RODRIGO", password: "12345678" },
      }),
    ).rejects.toThrow(/ya existe/);
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it("rejects a bad PIN or name", async () => {
    setDocs([]);
    await expect(
      createUser({ name: "Ana", role: "cashier", pin: "12" }),
    ).rejects.toThrow(/PIN/);
    await expect(
      createUser({ name: " ", role: "cashier", pin: "1234" }),
    ).rejects.toThrow(/nombre/);
  });
});

describe("updateUser, setUserActive and deleteUser", () => {
  it("resets the PIN with a new hash", async () => {
    setDocs([
      await stored("ro", "Rodrigo", "owner"),
      await stored("lu", "Luis", "cashier"),
    ]);
    await updateUser("lu", { pin: "9999" });
    const [, update] = fs.updateDoc.mock.calls[0];
    expect(await verifySecret("9999", update.pin)).toBe(true);
    expect(await verifySecret("1234", update.pin)).toBe(false);
  });

  it("requires admin credentials when promoting to owner", async () => {
    setDocs([
      await stored("ro", "Rodrigo", "owner"),
      await stored("lu", "Luis", "cashier"),
    ]);
    await expect(updateUser("lu", { role: "owner" })).rejects.toThrow(
      /usuario y contraseña/,
    );
    await updateUser("lu", {
      role: "owner",
      admin: { username: "luis", password: "12345678" },
    });
    expect(fs.updateDoc.mock.calls[0][1].role).toBe("owner");
  });

  it("refuses to demote, deactivate or delete the only owner", async () => {
    setDocs([
      await stored("ro", "Rodrigo", "owner"),
      await stored("lu", "Luis", "cashier"),
    ]);
    await expect(updateUser("ro", { role: "cashier" })).rejects.toThrow(
      /Dueño/,
    );
    await expect(setUserActive("ro", false, "lu")).rejects.toThrow(/Dueño/);
    await expect(deleteUser("ro", "lu")).rejects.toThrow(/Dueño/);
    expect(fs.updateDoc).not.toHaveBeenCalled();
    expect(fs.deleteDoc).not.toHaveBeenCalled();
  });

  it("refuses to deactivate or delete yourself", async () => {
    setDocs([
      await stored("ro", "Rodrigo", "owner"),
      await stored("an", "Ana", "owner"),
    ]);
    await expect(setUserActive("ro", false, "ro")).rejects.toThrow(/propio/);
    await expect(deleteUser("ro", "ro")).rejects.toThrow(/propio/);
    await deleteUser("an", "ro");
    expect(fs.deleteDoc).toHaveBeenCalledTimes(1);
  });

  it("deactivates and reactivates a cashier", async () => {
    setDocs([
      await stored("ro", "Rodrigo", "owner"),
      await stored("lu", "Luis", "cashier"),
    ]);
    await setUserActive("lu", false, "ro");
    await setUserActive("lu", true, "ro");
    expect(fs.updateDoc.mock.calls.map((c) => c[1])).toEqual([
      { active: false },
      { active: true },
    ]);
  });
});
