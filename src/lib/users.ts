import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import {
  hashSecret,
  isValidPassword,
  isValidPin,
  type Credential,
} from "@/lib/auth";
import { db } from "@/lib/firebase";
import type { Role } from "@/lib/permissions";

export type { Role };

export const MAX_USER_NAME = 30;
export const FIRST_OWNER_ID = "first-owner";

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  role: Role;
  active: boolean;
  pin: Credential;
  admin?: { username: string; password: Credential };
  createdAt: Timestamp;
}

export interface AdminInput {
  username: string;
  password: string;
}

export interface NewUserInput {
  name: string;
  role: Role;
  pin: string;
  admin?: AdminInput;
}

export interface NewOwnerInput {
  name: string;
  pin: string;
  admin: AdminInput;
}

export interface UserChanges {
  name?: string;
  role?: Role;
  pin?: string;
  admin?: AdminInput;
}

export const roleLabel = (role: Role) =>
  role === "owner" ? "Dueño" : "Cajero";

export const normalizeUserName = (name: string) => {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed !== "" && trimmed.length <= MAX_USER_NAME ? trimmed : null;
};

export const normalizeUsername = (username: string) => {
  const clean = username.trim().toLowerCase();
  return /^[a-z0-9._-]{3,30}$/.test(clean) ? clean : null;
};

export const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length >= 2
      ? words[0][0] + words[1][0]
      : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
};

const isOwnerActive = (u: Pick<AppUser, "role" | "active">) =>
  u.role === "owner" && u.active;

// `after` es el estado del usuario tras el cambio, o null si se elimina.
export const assertKeepsOwner = (
  users: Pick<AppUser, "id" | "role" | "active">[],
  id: string,
  after: Pick<AppUser, "role" | "active"> | null,
) => {
  const remaining = users.filter((u) => u.id !== id).some(isOwnerActive);
  if (!remaining && !(after && isOwnerActive(after)))
    throw new Error("Debe quedar al menos un Dueño activo.");
};

export const assertNotSelf = (id: string, actorId?: string) => {
  if (actorId !== undefined && actorId === id)
    throw new Error("No puedes hacerlo con tu propio usuario.");
};

const cleanAdmin = (
  admin: AdminInput | undefined,
  users: Pick<AppUser, "id" | "admin">[],
  selfId?: string,
) => {
  if (!admin) throw new Error("El Dueño necesita usuario y contraseña.");
  const username = normalizeUsername(admin.username);
  if (!username)
    throw new Error("Usuario inválido (3 a 30 letras, números, . _ -).");
  if (!isValidPassword(admin.password))
    throw new Error("La contraseña debe tener de 8 a 64 caracteres.");
  if (users.some((u) => u.id !== selfId && u.admin?.username === username))
    throw new Error("Ese usuario ya existe.");
  return { username, password: admin.password };
};

const cleanName = (name: string) => {
  const clean = normalizeUserName(name);
  if (!clean)
    throw new Error(`El nombre debe tener de 1 a ${MAX_USER_NAME} caracteres.`);
  return clean;
};

const cleanPin = (pin: string) => {
  if (!isValidPin(pin)) throw new Error("El PIN debe tener 4 dígitos.");
  return pin;
};

const isCredential = (v: unknown): v is Credential =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Credential).hash === "string" &&
  typeof (v as Credential).salt === "string";

export const toUser = (id: string, data: DocumentData): AppUser | null => {
  if (
    typeof data.name !== "string" ||
    (data.role !== "owner" && data.role !== "cashier") ||
    !isCredential(data.pin)
  )
    return null;
  const admin =
    data.admin &&
    typeof data.admin.username === "string" &&
    isCredential(data.admin.password)
      ? { username: data.admin.username, password: data.admin.password }
      : undefined;
  return {
    id,
    name: data.name,
    initials:
      typeof data.initials === "string" ? data.initials : initialsOf(data.name),
    role: data.role,
    active: data.active !== false,
    pin: data.pin,
    ...(admin && { admin }),
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
  };
};

const fetchUsers = async (): Promise<AppUser[]> => {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.flatMap((d) => {
    const user = toUser(d.id, d.data({ serverTimestamps: "estimate" }));
    return user ? [user] : [];
  });
};

const buildDoc = async (
  name: string,
  role: Role,
  pin: string,
  admin: { username: string; password: string } | undefined,
) => ({
  name,
  initials: initialsOf(name),
  role,
  active: true,
  pin: await hashSecret(pin),
  ...(admin && {
    admin: {
      username: admin.username,
      password: await hashSecret(admin.password),
    },
  }),
});

export const createUser = async (input: NewUserInput): Promise<AppUser> => {
  const name = cleanName(input.name);
  const pin = cleanPin(input.pin);
  const users = await fetchUsers();
  const admin =
    input.role === "owner" ? cleanAdmin(input.admin, users) : undefined;
  const data = await buildDoc(name, input.role, pin, admin);
  const ref = doc(collection(db, "users"));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return { ...data, id: ref.id, createdAt: Timestamp.now() };
};

export const createFirstOwner = async (
  input: NewOwnerInput,
): Promise<AppUser> => {
  const name = cleanName(input.name);
  const pin = cleanPin(input.pin);
  if ((await fetchUsers()).length > 0)
    throw new Error("La configuración inicial ya se hizo.");
  const admin = cleanAdmin(input.admin, []);
  const data = await buildDoc(name, "owner", pin, admin);
  const ref = doc(db, "users", FIRST_OWNER_ID);
  // El id fijo hace atómica la creación: una segunda configuración simultánea falla.
  await runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists())
      throw new Error("La configuración inicial ya se hizo.");
    tx.set(ref, { ...data, createdAt: serverTimestamp() });
  });
  return { ...data, id: ref.id, createdAt: Timestamp.now() };
};

export const updateUser = async (
  id: string,
  changes: UserChanges,
): Promise<void> => {
  const users = await fetchUsers();
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error("El usuario no existe.");
  const role = changes.role ?? target.role;
  assertKeepsOwner(users, id, { role, active: target.active });
  const update: Record<string, unknown> = {};
  if (changes.name !== undefined) {
    const name = cleanName(changes.name);
    update.name = name;
    update.initials = initialsOf(name);
  }
  if (changes.pin !== undefined)
    update.pin = await hashSecret(cleanPin(changes.pin));
  if (role !== target.role) update.role = role;
  if (role === "owner") {
    if (changes.admin || !target.admin) {
      const admin = cleanAdmin(changes.admin, users, id);
      update.admin = {
        username: admin.username,
        password: await hashSecret(admin.password),
      };
    }
  } else if (target.admin) {
    update.admin = deleteField();
  }
  if (Object.keys(update).length === 0) return;
  await updateDoc(doc(db, "users", id), update);
};

export const setUserActive = async (
  id: string,
  active: boolean,
  actorId?: string,
): Promise<void> => {
  if (!active) assertNotSelf(id, actorId);
  const users = await fetchUsers();
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error("El usuario no existe.");
  assertKeepsOwner(users, id, { role: target.role, active });
  await updateDoc(doc(db, "users", id), { active });
};

export const deleteUser = async (
  id: string,
  actorId?: string,
): Promise<void> => {
  assertNotSelf(id, actorId);
  const users = await fetchUsers();
  if (!users.some((u) => u.id === id)) throw new Error("El usuario no existe.");
  assertKeepsOwner(users, id, null);
  await deleteDoc(doc(db, "users", id));
};
