import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Screen } from "@/components/Screen";
import { users } from "@/data/mock";

interface Props {
  onSuccess: () => void;
  onAdmin: () => void;
}

const PIN_LENGTH = 4;
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const keyClass =
  "grid h-17 place-items-center rounded-2xl text-[28px] font-bold bg-surface lg:bg-surface-2";
const sideKeyClass =
  "grid h-17 place-items-center rounded-2xl text-base font-bold text-muted";

export const PinScreen = ({ onSuccess, onAdmin }: Props) => {
  const cashiers = users.filter((u) => u.active);
  const [userId, setUserId] = useState("lu");
  const [pin, setPin] = useState("");
  const selected = cashiers.find((u) => u.id === userId) ?? cashiers[0];

  const press = (digit: string) => {
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) onSuccess();
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
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted text-[17px]">PIN de {selected.name}</p>
          <div className="flex gap-5">
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <span
                key={i}
                className={`size-5 rounded-full ${i < pin.length ? "bg-gold" : "border-2 border-[#5a4a42]"}`}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 px-6 pb-9">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className={keyClass}
            >
              {k}
            </button>
          ))}
          <button type="button" onClick={onAdmin} className={sideKeyClass}>
            Admin
          </button>
          <button type="button" onClick={() => press("0")} className={keyClass}>
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
