import { useState } from "react";
import { Screen } from "@/components/Screen";

interface Props {
  onLogin: () => void;
  onPin: () => void;
}

const inputBox =
  "flex h-14 items-center rounded-[14px] border-[1.5px] bg-surface px-4 text-[17px]";

export const LoginScreen = ({ onLogin, onPin }: Props) => {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState("rodrigo.admin");
  const [password, setPassword] = useState("12345678");

  return (
    <Screen>
      <form
        className="flex flex-1 flex-col justify-center gap-10 px-7"
        onSubmit={(e) => {
          e.preventDefault();
          onLogin();
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="bg-chili font-marker text-gold grid size-24 place-items-center rounded-full text-[40px]">
            DT
          </div>
          <h1 className="font-marker mt-4 text-[40px] leading-none">
            Doble Tentación
          </h1>
          <p className="text-muted text-base">
            Alitas &amp; Boneless · Administración
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-muted text-[15px] font-semibold">
              Usuario
            </span>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className={`${inputBox} border-line focus:border-gold outline-none`}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-muted text-[15px] font-semibold">
              Contraseña
            </span>
            <div className={`${inputBox} border-gold justify-between`}>
              <input
                type={show ? "text" : "password"}
                value={password}
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
          <button
            type="submit"
            className="bg-gold text-ink mt-2 h-14 rounded-[14px] text-lg font-extrabold"
          >
            Entrar
          </button>
        </div>
      </form>
      <div className="px-7 pb-10">
        <button
          type="button"
          onClick={onPin}
          className="border-line h-14 w-full rounded-[14px] border-[1.5px] text-[17px] font-bold"
        >
          Entrar con PIN de mostrador
        </button>
      </div>
    </Screen>
  );
};
