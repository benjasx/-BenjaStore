export interface Session {
  v: 1;
  userId: string;
  mode: "admin" | "pin";
}

const KEY = "benjastore.session";

export const loadSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data === "object" &&
      data !== null &&
      (data as Session).v === 1 &&
      typeof (data as Session).userId === "string" &&
      (data as Session).userId !== "" &&
      ((data as Session).mode === "admin" || (data as Session).mode === "pin")
    ) {
      const { userId, mode } = data as Session;
      return { v: 1, userId, mode };
    }
    return null;
  } catch {
    return null;
  }
};

export const saveSession = (session: Session) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // sin almacenamiento: la sesión no sobrevive al refresco
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada que limpiar
  }
};
