import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import type { AppUser } from "@/lib/users";
import { MoreScreen } from "@/screens/MoreScreen";

vi.mock("@/lib/firebase", () => ({ db: {} }));

const user = (role: AppUser["role"]): AppUser => ({
  id: role,
  name: role,
  initials: "XX",
  role,
  active: true,
  pin: { hash: "h", salt: "s" },
  createdAt: Timestamp.now(),
});

const setup = (role: AppUser["role"], onCuts = () => {}) =>
  render(
    <MoreScreen
      onNavigate={() => {}}
      productCount={3}
      onMenu={() => {}}
      onShiftClose={() => {}}
      onCuts={onCuts}
      onSwitchUser={() => {}}
      onLogout={() => {}}
      account={user(role)}
      users={[]}
      usersError={null}
      onRetryUsers={() => {}}
      onCreateUser={async () => {}}
      onUpdateUser={async () => {}}
      onSetUserActive={async () => {}}
      onDeleteUser={async () => {}}
    />,
  );

describe("MoreScreen cuts history card", () => {
  it("opens the history for the owner", async () => {
    const onCuts = vi.fn();
    setup("owner", onCuts);
    await userEvent.click(
      screen.getByRole("button", { name: /Historial de cortes/ }),
    );
    expect(onCuts).toHaveBeenCalled();
  });

  it("hides it from the cashier but keeps the own cut", () => {
    setup("cashier");
    expect(
      screen.queryByRole("button", { name: /Historial de cortes/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Corte/ })).toBeInTheDocument();
  });
});
