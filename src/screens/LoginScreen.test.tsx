import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import { hashSecret } from "@/lib/auth";
import type { AppUser } from "@/lib/users";
import { LoginScreen } from "@/screens/LoginScreen";

const { createFirstOwner } = vi.hoisted(() => ({ createFirstOwner: vi.fn() }));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/users")>()),
  createFirstOwner,
}));

let owner: AppUser;

beforeAll(async () => {
  owner = {
    id: "ro",
    name: "Rodrigo",
    initials: "RO",
    role: "owner",
    active: true,
    pin: await hashSecret("1234"),
    admin: {
      username: "rodrigo",
      password: await hashSecret("12345678"),
    },
    createdAt: Timestamp.now(),
  };
});

const setup = (users: AppUser[], extra = {}) => {
  const props = {
    users,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    onAdminLogin: vi.fn(),
    onSetupDone: vi.fn(),
    onPin: vi.fn(),
    ...extra,
  };
  render(<LoginScreen {...props} />);
  return props;
};

const openAdmin = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    screen.getByRole("button", { name: "Ingresar como administrador" }),
  );

describe("LoginScreen", () => {
  beforeEach(() => {
    createFirstOwner.mockReset();
  });

  it("shows the owner setup when there are no users", async () => {
    createFirstOwner.mockResolvedValue(owner);
    const user = userEvent.setup();
    const props = setup([]);
    expect(screen.queryByText("Ingresar como administrador")).toBeNull();
    const create = screen.getByRole("button", { name: "Crear dueño" });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText("Nombre"), "Rodrigo");
    await user.type(screen.getByLabelText("Usuario"), "Rodrigo");
    await user.type(screen.getByLabelText(/Contraseña/), "12345678");
    await user.type(screen.getByLabelText(/PIN/), "1234");
    await user.click(create);
    expect(createFirstOwner).toHaveBeenCalledWith({
      name: "Rodrigo",
      pin: "1234",
      admin: { username: "Rodrigo", password: "12345678" },
    });
    expect(props.onSetupDone).toHaveBeenCalledWith(owner);
  });

  it("shows the setup error and stays on the form", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createFirstOwner.mockImplementation(async () => {
      throw new Error("La configuración inicial ya se hizo.");
    });
    const user = userEvent.setup();
    setup([]);
    await user.type(screen.getByLabelText("Nombre"), "Rodrigo");
    await user.type(screen.getByLabelText("Usuario"), "rodrigo");
    await user.type(screen.getByLabelText(/Contraseña/), "12345678");
    await user.type(screen.getByLabelText(/PIN/), "1234");
    await user.click(screen.getByRole("button", { name: "Crear dueño" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ya se hizo");
  });

  it("starts with empty credential fields", async () => {
    const user = userEvent.setup();
    setup([owner]);
    await openAdmin(user);
    expect(screen.getByLabelText("Usuario")).toHaveValue("");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
  });

  it("rejects wrong credentials with a single generic message", async () => {
    const user = userEvent.setup();
    const props = setup([owner]);
    await openAdmin(user);
    await user.type(screen.getByLabelText("Usuario"), "rodrigo");
    await user.type(screen.getByLabelText("Contraseña"), "mala-clave");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usuario o contraseña incorrectos",
    );
    await user.clear(screen.getByLabelText("Usuario"));
    await user.type(screen.getByLabelText("Usuario"), "otro");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usuario o contraseña incorrectos",
    );
    expect(props.onAdminLogin).not.toHaveBeenCalled();
  });

  it("logs in with the right credentials, ignoring username case", async () => {
    const user = userEvent.setup();
    const props = setup([owner]);
    await openAdmin(user);
    await user.type(screen.getByLabelText("Usuario"), "Rodrigo");
    await user.type(screen.getByLabelText("Contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await vi.waitFor(() =>
      expect(props.onAdminLogin).toHaveBeenCalledWith(owner),
    );
  });

  it("does not let a deactivated owner in", async () => {
    const user = userEvent.setup();
    const props = setup([{ ...owner, active: false }]);
    await openAdmin(user);
    await user.type(screen.getByLabelText("Usuario"), "rodrigo");
    await user.type(screen.getByLabelText("Contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(props.onAdminLogin).not.toHaveBeenCalled();
  });
});
