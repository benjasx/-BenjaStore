import { useState, type FormEvent } from "react";
import { ErrorBanner } from "@/components/ProductsState";
import { Screen } from "@/components/Screen";
import { isValidPassword, isValidPin, verifySecret } from "@/lib/auth";
import {
  createFirstOwner,
  normalizeUsername,
  normalizeUserName,
  type AppUser,
} from "@/lib/users";

interface Props {
  users: AppUser[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onAdminLogin: (user: AppUser) => void;
  onSetupDone: (user: AppUser) => void;
  onPin: () => void;
}

const inputBox =
  "flex h-14 items-center rounded-[14px] border-[1.5px] bg-surface lg:bg-surface-2 px-4 text-[17px]";
const inputClass = `${inputBox} border-line focus:border-gold w-full outline-none`;
const label = "text-muted text-[15px] font-semibold";

const Field = ({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) => (
  <label className="flex flex-col gap-2">
    <span className={label}>{text}</span>
    {children}
  </label>
);

const SetupOwnerForm = ({ onDone }: { onDone: (user: AppUser) => void }) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid =
    normalizeUserName(name) !== null &&
    normalizeUsername(username) !== null &&
    isValidPassword(password) &&
    isValidPin(pin);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      onDone(
        await createFirstOwner({
          name,
          pin,
          admin: { username, password },
        }),
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo crear el dueño.",
      );
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-[22px] font-black">Crear dueño</h2>
      <p className="text-muted text-[15px]">
        Es la primera vez que se abre la app. Crea la cuenta del dueño.
      </p>
      <Field text="Nombre">
        <input
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field text="Usuario">
        <input
          value={username}
          autoCapitalize="none"
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field text="Contraseña (mínimo 8 caracteres)">
        <input
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field text="PIN de mostrador (4 dígitos)">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className={inputClass}
        />
      </Field>
      {error && (
        <p role="alert" className="text-salmon text-[15px] font-bold">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!valid || saving}
        className="bg-gold text-ink mt-2 h-14 rounded-[14px] text-lg font-extrabold disabled:opacity-40"
      >
        {saving ? "Creando…" : "Crear dueño"}
      </button>
    </form>
  );
};

export const LoginScreen = ({
  users,
  loading,
  error,
  onRetry,
  onAdminLogin,
  onSetupDone,
  onPin,
}: Props) => {
  const [show, setShow] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const needsSetup = !loading && !error && users.length === 0;

  const submitAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLoginError(null);
    const username = normalizeUsername(user);
    const candidate = users.find(
      (u) => u.active && u.admin && u.admin.username === username,
    );
    const ok = candidate?.admin
      ? await verifySecret(password, candidate.admin.password)
      : false;
    setBusy(false);
    if (candidate && ok) onAdminLogin(candidate);
    else setLoginError("Usuario o contraseña incorrectos");
  };

  return (
    <div className="lg:grid lg:min-h-dvh lg:place-items-center lg:p-8">
      <Screen className="lg:bg-surface lg:min-h-0 lg:rounded-3xl lg:py-10">
        <div className="flex flex-1 flex-col justify-center gap-10 px-7 py-8">
          <div className="flex flex-col items-center gap-1">
            <img
              src="/logo_solo.jpeg"
              alt="Doble Tentación"
              width={96}
              height={96}
              className="size-24 rounded-full object-cover"
            />
            <h1 className="font-marker mt-4 text-[40px] leading-none">
              Doble Tentación
            </h1>
            <p className="text-muted text-center text-base text-balance">
              Lo mejor de lo mejor en alitas y boneless
            </p>
          </div>
          {error && (
            <ErrorBanner
              onRetry={onRetry}
              message="No se pudieron cargar los usuarios."
            />
          )}
          {loading && (
            <p className="text-muted text-center text-[15px]">Cargando…</p>
          )}
          {needsSetup && <SetupOwnerForm onDone={onSetupDone} />}
          {!loading && !error && !needsSetup && (
            <form onSubmit={submitAdmin} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setAdmin((v) => !v)}
                aria-expanded={admin}
                className="border-line h-14 w-full rounded-[14px] border-[1.5px] text-[17px] font-bold"
              >
                Ingresar como administrador
              </button>
              {admin && (
                <>
                  <Field text="Usuario">
                    <input
                      value={user}
                      autoCapitalize="none"
                      autoComplete="username"
                      onChange={(e) => setUser(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <label className="flex flex-col gap-2">
                    <span className={label}>Contraseña</span>
                    <div className={`${inputBox} border-gold justify-between`}>
                      <input
                        type={show ? "text" : "password"}
                        value={password}
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent tracking-widest outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        className="text-muted text-[15px] font-semibold"
                      >
                        {show ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </label>
                  {loginError && (
                    <p
                      role="alert"
                      className="text-salmon text-[15px] font-bold"
                    >
                      {loginError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className="bg-gold text-ink mt-2 h-14 rounded-[14px] text-lg font-extrabold disabled:opacity-40"
                  >
                    {busy ? "Entrando…" : "Entrar"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onPin}
                className="bg-gold text-ink h-14 w-full rounded-[14px] text-lg font-extrabold"
              >
                Entrar con PIN de mostrador
              </button>
            </form>
          )}
        </div>
      </Screen>
    </div>
  );
};
