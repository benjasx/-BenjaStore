import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Header, Screen } from "@/components/Screen";
import { Toggle } from "@/components/Toggle";
import { ErrorBanner } from "@/components/ProductsState";
import { UserSheet } from "@/components/UserSheet";
import { can } from "@/lib/permissions";
import {
  roleLabel,
  type AppUser,
  type NewUserInput,
  type UserChanges,
} from "@/lib/users";

interface Props {
  onNavigate: (tab: NavTab) => void;
  productCount: number | null;
  onMenu: () => void;
  onShiftClose: () => void;
  onCuts: () => void;
  onAdvertising: () => void;
  onSwitchUser: () => void;
  onLogout: () => void;
  account: AppUser | null;
  users: AppUser[];
  usersError: Error | null;
  onRetryUsers: () => void;
  onCreateUser: (input: NewUserInput) => Promise<void>;
  onUpdateUser: (id: string, changes: UserChanges) => Promise<void>;
  onSetUserActive: (id: string, active: boolean) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

const shortcut =
  "flex h-18 flex-col justify-center rounded-[14px] bg-surface px-3.5 py-3 text-left";

export const MoreScreen = ({
  onNavigate,
  productCount,
  onMenu,
  onShiftClose,
  onCuts,
  onAdvertising,
  onSwitchUser,
  onLogout,
  account,
  users,
  usersError,
  onRetryUsers,
  onCreateUser,
  onUpdateUser,
  onSetUserActive,
  onDeleteUser,
}: Props) => {
  const [sheet, setSheet] = useState<AppUser | "new" | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const manageUsers = account !== null && can(account.role, "manageUsers");
  const setActive = (id: string, active: boolean) => {
    setToggleError(null);
    onSetUserActive(id, active).catch((e: unknown) => {
      console.error(e);
      setToggleError(
        e instanceof Error ? e.message : "No se pudo cambiar el estado.",
      );
    });
  };

  return (
    <Screen>
      <Header
        title="Más"
        action={
          <span className="text-muted px-2 text-[15px]">
            {account ? `${account.name} · ${roleLabel(account.role)}` : ""}
          </span>
        }
      />
      <div className="flex flex-1 flex-col gap-2.5 px-5">
        <div className="grid grid-cols-2 gap-2.5">
          {account && can(account.role, "manageMenu") && (
            <button type="button" onClick={onMenu} className={shortcut}>
              <span className="text-[17px] font-extrabold">Menú</span>
              <span className="text-muted text-sm">
                {productCount === null
                  ? "Cargando…"
                  : `${productCount} ${productCount === 1 ? "producto" : "productos"}`}
              </span>
            </button>
          )}
          <button type="button" onClick={onShiftClose} className={shortcut}>
            <span className="text-[17px] font-extrabold">Corte</span>
            <span className="text-muted text-sm">Cierre de turno</span>
          </button>
          {account && can(account.role, "viewCuts") && (
            <button type="button" onClick={onCuts} className={shortcut}>
              <span className="text-[17px] font-extrabold">
                Historial de cortes
              </span>
              <span className="text-muted text-sm">Faltantes y sobrantes</span>
            </button>
          )}
          {account && can(account.role, "manageAdvertising") && (
            <button type="button" onClick={onAdvertising} className={shortcut}>
              <span className="text-[17px] font-extrabold">Publicidad</span>
              <span className="text-muted text-sm">Banners y carteles</span>
            </button>
          )}
        </div>
        {manageUsers && (
          <>
            <div className="mt-3.5 flex items-center justify-between">
              <h2 className="text-muted text-[15px] font-bold">Usuarios</h2>
              <button
                type="button"
                onClick={() => setSheet("new")}
                className="text-gold h-11 px-3.5 text-base font-extrabold"
              >
                + Agregar
              </button>
            </div>
            {usersError && (
              <ErrorBanner
                onRetry={onRetryUsers}
                message="No se pudieron cargar los usuarios."
              />
            )}
            {toggleError && (
              <p role="alert" className="text-salmon text-[15px] font-bold">
                {toggleError}
              </p>
            )}
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-x-8">
              {users.map((u) => {
                const owner = u.role === "owner";
                return (
                  <div
                    key={u.id}
                    className="border-line-soft flex min-h-18 items-center gap-3.5 border-b"
                  >
                    <button
                      type="button"
                      aria-label={`Editar ${u.name}`}
                      onClick={() => setSheet(u)}
                      className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                    >
                      <Avatar
                        initials={u.initials}
                        tone={owner ? "chili" : u.active ? "default" : "dim"}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={`text-[17px] font-extrabold ${u.active ? "" : "text-muted"}`}
                        >
                          {u.name}
                        </span>
                        <span
                          className={`text-[15px] ${u.active ? "text-muted" : "text-faint"}`}
                        >
                          {roleLabel(u.role)} ·{" "}
                          {u.active
                            ? owner
                              ? "usuario y contraseña"
                              : "PIN ••••"
                            : "desactivado"}
                        </span>
                      </div>
                    </button>
                    {u.id !== account?.id && (
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
          </>
        )}
        <div className="mt-auto flex flex-col gap-2.5 pb-4">
          {account && can(account.role, "switchUser") && (
            <button
              type="button"
              onClick={onSwitchUser}
              className="border-line h-14 rounded-[14px] border-[1.5px] text-[17px] font-extrabold"
            >
              Cambiar usuario (PIN)
            </button>
          )}
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
      {sheet && (
        <UserSheet
          user={sheet === "new" ? undefined : sheet}
          selfId={account?.id}
          onClose={() => setSheet(null)}
          onCreate={onCreateUser}
          onUpdate={onUpdateUser}
          onDelete={onDeleteUser}
        />
      )}
    </Screen>
  );
};
