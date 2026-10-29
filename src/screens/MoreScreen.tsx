import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Header, Screen } from "@/components/Screen";
import { Toggle } from "@/components/Toggle";
import { users as initialUsers } from "@/data/mock";

interface Props {
  onNavigate: (tab: NavTab) => void;
  onMenu: () => void;
  onShiftClose: () => void;
  onSwitchUser: () => void;
  onLogout: () => void;
}

const shortcut =
  "flex h-18 flex-col justify-center rounded-[14px] bg-surface px-3.5 py-3 text-left";

export const MoreScreen = ({
  onNavigate,
  onMenu,
  onShiftClose,
  onSwitchUser,
  onLogout,
}: Props) => {
  const [users, setUsers] = useState(initialUsers);
  const setActive = (id: string, active: boolean) =>
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, active } : u)));

  return (
    <Screen>
      <Header
        title="Más"
        action={
          <span className="text-muted px-2 text-[15px]">Rodrigo · Dueño</span>
        }
      />
      <div className="flex flex-1 flex-col gap-2.5 px-5">
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onMenu} className={shortcut}>
            <span className="text-[17px] font-extrabold">Menú</span>
            <span className="text-muted text-sm">19 productos</span>
          </button>
          <button type="button" onClick={onShiftClose} className={shortcut}>
            <span className="text-[17px] font-extrabold">Corte</span>
            <span className="text-muted text-sm">Cierre de turno</span>
          </button>
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          <h2 className="text-muted text-[15px] font-bold">Usuarios</h2>
          <button
            type="button"
            className="text-gold h-11 px-3.5 text-base font-extrabold"
          >
            + Agregar
          </button>
        </div>
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-x-8">
          {users.map((u) => {
            const owner = u.role === "Dueño";
            return (
              <div
                key={u.id}
                className="border-line-soft flex min-h-18 items-center gap-3.5 border-b"
              >
                <Avatar
                  initials={u.initials}
                  tone={owner ? "chili" : u.active ? "default" : "dim"}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span
                    className={`text-[17px] font-extrabold ${u.active ? "" : "text-muted"}`}
                  >
                    {u.name}
                  </span>
                  <span
                    className={`text-[15px] ${u.active ? "text-muted" : "text-faint"}`}
                  >
                    {u.role} ·{" "}
                    {owner
                      ? "usuario y contraseña"
                      : u.active
                        ? "PIN ••••"
                        : "desactivada"}
                  </span>
                </div>
                {!owner && (
                  <Toggle
                    checked={u.active}
                    onChange={(v) => setActive(u.id, v)}
                    label={`Activo: ${u.name}`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-auto flex flex-col gap-2.5 pb-4">
          <button
            type="button"
            onClick={onSwitchUser}
            className="border-line h-14 rounded-[14px] border-[1.5px] text-[17px] font-extrabold"
          >
            Cambiar usuario (PIN)
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-salmon h-12 text-base font-bold"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <BottomNav active="more" onChange={onNavigate} />
    </Screen>
  );
};
