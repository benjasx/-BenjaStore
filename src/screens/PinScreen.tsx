import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Screen } from "@/components/Screen";
import {
  lockedUntil,
  registerFailure,
  registerSuccess,
  verifySecret,
} from "@/lib/auth";
import type { AppUser } from "@/lib/users";

interface Props {
  users: AppUser[];
  onSuccess: (user: AppUser) => void;
  onAdmin: () => void;
  error?: string | null;
}

const PIN_LENGTH = 4;
const currentTime = () => Date.now();
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const keyClass =
  "grid h-17 place-items-center rounded-2xl text-[28px] font-bold bg-surface lg:bg-surface-2";
const sideKeyClass =
  "grid h-17 place-items-center rounded-2xl text-base font-bold text-muted";

export const PinScreen = ({ users, onSuccess, onAdmin, error }: Props) => {
  const cashiers = users.filter((u) => u.active);
  const [userId, setUserId] = useState(cashiers[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [now, setNow] = useState(currentTime);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const selected = cashiers.find((u) => u.id === userId) ?? cashiers[0];
  const lockEnd = selected ? lockedUntil(selected.id, now) : null;
  const secondsLeft =
    lockEnd === null ? 0 : Math.max(1, Math.ceil((lockEnd - now) / 1000));

  useEffect(() => {
    if (lockEnd === null) return;
    const id = setInterval(() => setNow(currentTime()), 500);
    return () => clearInterval(id);
  }, [lockEnd]);

  const press = async (digit: string) => {
    if (!selected || busy || lockEnd !== null || pin.length >= PIN_LENGTH)
      return;
    const next = pin + digit;
    setPin(next);
    setWrong(false);
    if (next.length < PIN_LENGTH) return;
    setBusy(true);
    const ok = await verifySecret(next, selected.pin);
    setBusy(false);
    if (ok) {
      registerSuccess(selected.id);
      onSuccess(selected);
      return;
    }
    registerFailure(selected.id);
    setNow(currentTime());
    setWrong(true);
    setPin("");
  };

  return (
    <div className="lg:grid lg:min-h-dvh lg:place-items-center lg:p-8">
      <Screen className="lg:bg-surface lg:min-h-0 lg:rounded-3xl lg:pb-4">
        <div className="flex flex-col gap-5 px-6 pt-8">
          <h1 className="text-[28px] font-black tracking-tight">
            ¿Quién vende?
          </h1>
          <div className="grid grid-cols-4 gap-2.5">
            {cashiers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setUserId(u.id);
                  setPin("");
                  setWrong(false);
                  setNow(currentTime());
                }}
                className="flex flex-col items-center gap-2"
              >
                <Avatar
                  initials={u.initials}
                  size="lg"
                  tone={u.id === userId ? "chili" : "default"}
                  selected={u.id === userId}
                />
                <span
                  className={`text-[15px] ${u.id === userId ? "font-bold" : "text-muted"}`}
                >
                  {u.name}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
          <p className="text-muted text-[17px]">
            {selected ? `PIN de ${selected.name}` : "No hay usuarios activos"}
          </p>
          <div className="flex gap-5">
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <span
                key={i}
                className={`size-5 rounded-full ${i < pin.length ? "bg-gold" : "border-2 border-[#5a4a42]"}`}
              />
            ))}
          </div>
          {lockEnd !== null && (
            <p role="alert" className="text-salmon px-6 text-[15px] font-bold">
              Demasiados intentos. Espera {secondsLeft} s.
            </p>
          )}
          {wrong && lockEnd === null && (
            <p role="alert" className="text-salmon px-6 text-[15px] font-bold">
              PIN incorrecto
            </p>
          )}
          {error && (
            <p role="alert" className="text-salmon px-6 text-[15px] font-bold">
              {error}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 px-6 pb-9">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => void press(k)}
              className={keyClass}
            >
              {k}
            </button>
          ))}
          <button type="button" onClick={onAdmin} className={sideKeyClass}>
            Admin
          </button>
          <button
            type="button"
            onClick={() => void press("0")}
            className={keyClass}
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin((p) => p.slice(0, -1))}
            className={sideKeyClass}
          >
            Borrar
          </button>
        </div>
      </Screen>
    </div>
  );
};
