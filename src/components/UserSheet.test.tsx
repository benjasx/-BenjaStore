import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import { UserSheet } from "@/components/UserSheet";
import type { AppUser } from "@/lib/users";

vi.mock("@/lib/firebase", () => ({ db: {} }));

const cred = { hash: "h", salt: "s" };
const cashier: AppUser = {
  id: "lu",
  name: "Luis",
  initials: "LU",
  role: "cashier",
  active: true,
  pin: cred,
  createdAt: Timestamp.now(),
};

const setup = (user?: AppUser, selfId = "ro") => {
  const props = {
    user,
    selfId,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  };
  render(<UserSheet {...props} />);
  return props;
};

describe("UserSheet", () => {
  it("creates a cashier only with a valid name and matching PINs", async () => {
    const user = userEvent.setup();
    const props = setup();
    const save = screen.getByRole("button", { name: "Guardar" });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Nombre"), " Ana ");
    await user.type(screen.getByLabelText("PIN"), "4321");
    await user.type(screen.getByLabelText("Repetir PIN"), "4320");
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText("Repetir PIN"));
    await user.type(screen.getByLabelText("Repetir PIN"), "4321");
    await user.click(save);
    expect(props.onCreate).toHaveBeenCalledWith({
      name: " Ana ",
      role: "cashier",
      pin: "4321",
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("asks for admin credentials when creating an owner", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.type(screen.getByLabelText("Nombre"), "Sofi");
    await user.type(screen.getByLabelText("PIN"), "1111");
    await user.type(screen.getByLabelText("Repetir PIN"), "1111");
    await user.click(screen.getByRole("button", { name: "Dueño" }));
    const save = screen.getByRole("button", { name: "Guardar" });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Usuario de administrador"), "sofi");
    await user.type(
      screen.getByLabelText("Contraseña de administrador"),
      "12345678",
    );
    await user.click(save);
    expect(props.onCreate).toHaveBeenCalledWith({
      name: "Sofi",
      role: "owner",
      pin: "1111",
      admin: { username: "sofi", password: "12345678" },
    });
  });

  it("sends only the changed fields when editing and resets the PIN", async () => {
    const user = userEvent.setup();
    const props = setup(cashier);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    await user.type(screen.getByLabelText("Nuevo PIN"), "9999");
    await user.type(screen.getByLabelText("Repetir PIN"), "9999");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onUpdate).toHaveBeenCalledWith("lu", { pin: "9999" });
  });

  it("shows the error and stays open when saving fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const props = setup(cashier);
    props.onUpdate.mockRejectedValue(
      new Error("Debe quedar al menos un Dueño activo."),
    );
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Luis M");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Dueño");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("deletes only after confirming and never offers deleting yourself", async () => {
    const user = userEvent.setup();
    const props = setup(cashier);
    await user.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    expect(props.onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(props.onDelete).toHaveBeenCalledWith("lu");
  });

  it("hides delete for the signed-in user", () => {
    setup(cashier, "lu");
    expect(
      screen.queryByRole("button", { name: "Eliminar usuario" }),
    ).toBeNull();
  });
});
