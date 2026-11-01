import { useState } from "react";
import { isValidPassword, isValidPin } from "@/lib/auth";
import {
  MAX_USER_NAME,
  normalizeUsername,
  normalizeUserName,
  roleLabel,
  type AppUser,
  type NewUserInput,
  type Role,
  type UserChanges,
} from "@/lib/users";

interface Props {
  user?: AppUser;
  selfId?: string;
  onClose: () => void;
  onCreate: (input: NewUserInput) => Promise<void>;
  onUpdate: (id: string, changes: UserChanges) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const inputClass =
  "bg-surface-2 border-line focus:border-gold h-14 w-full rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";
const labelClass = "text-muted text-[15px] font-semibold";

export const UserSheet = ({
  user,
  selfId,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: Props) => {
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "cashier");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = user !== undefined;
  const needsAdmin = role === "owner" && !(editing && user.admin);
  const pinFilled = pin !== "" || pin2 !== "";
  const pinOk = pinFilled ? isValidPin(pin) && pin === pin2 : editing;
  const adminOk =
    !needsAdmin ||
    (normalizeUsername(username) !== null && isValidPassword(password));
  const valid = normalizeUserName(name) !== null && pinOk && adminOk;

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setSaving(false);
    }
  };

  const save = () =>
    run(async () => {
      const admin = needsAdmin ? { username, password } : undefined;
      if (!user) {
        await onCreate({ name, role, pin, ...(admin && { admin }) });
        return;
      }
      await onUpdate(user.id, {
        ...(name.trim() !== user.name && { name }),
        ...(role !== user.role && { role }),
        ...(pinFilled && { pin }),
        ...(admin && { admin }),
      });
    });

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-end lg:justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(8,5,4,0.72)]"
      />
      <div
        role="dialog"
        aria-label={editing ? `Editar ${user.name}` : "Nuevo usuario"}
        className="bg-surface relative flex max-h-dvh w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] px-5 pt-5 pb-8 lg:rounded-[28px]"
      >
        <h2 className="text-[22px] font-black">
          {editing ? "Editar usuario" : "Nuevo usuario"}
        </h2>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nombre</span>
          <input
            value={name}
            maxLength={MAX_USER_NAME}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nombre"
            className={inputClass}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Rol</span>
          <div className="grid grid-cols-2 gap-2">
            {(["cashier", "owner"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={`h-12 rounded-[14px] text-base ${
                  role === r
                    ? "bg-chili font-extrabold"
                    : "bg-surface-2 text-sand font-semibold"
                }`}
              >
                {roleLabel(r)}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>
            {editing ? "Nuevo PIN (opcional)" : "PIN (4 dígitos)"}
          </span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            aria-label={editing ? "Nuevo PIN" : "PIN"}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Repetir PIN</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
            aria-label="Repetir PIN"
            className={inputClass}
          />
        </label>
        {needsAdmin && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Usuario de administrador</span>
              <input
                value={username}
                autoCapitalize="none"
                onChange={(e) => setUsername(e.target.value)}
                aria-label="Usuario de administrador"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>
                Contraseña (mínimo 8 caracteres)
              </span>
              <input
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Contraseña de administrador"
                className={inputClass}
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-salmon text-[15px] font-bold">
            {error}
          </p>
        )}
        {confirmDelete && user ? (
          <div className="flex flex-col gap-2">
            <p className="text-[15px] font-bold">
              ¿Eliminar a {user.name}? Sus ventas se conservan.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDelete(false)}
                className="bg-surface-2 h-14 rounded-2xl text-lg font-bold disabled:opacity-40"
              >
                No eliminar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => run(() => onDelete(user.id))}
                className="bg-chili h-14 rounded-2xl text-lg font-black disabled:opacity-40"
              >
                {saving ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="bg-surface-2 h-14 rounded-2xl text-lg font-bold disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={!valid || saving}
                onClick={save}
                className="bg-gold text-ink h-14 rounded-2xl text-lg font-black disabled:opacity-40"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
            {editing && user.id !== selfId && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDelete(true)}
                className="text-salmon h-12 text-base font-bold"
              >
                Eliminar usuario
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
