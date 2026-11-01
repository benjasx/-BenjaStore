import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import { hashSecret, LOCK_SECONDS, MAX_PIN_ATTEMPTS } from "@/lib/auth";
import type { AppUser } from "@/lib/users";
import { PinScreen } from "@/screens/PinScreen";

vi.mock("@/lib/firebase", () => ({ db: {} }));

let users: AppUser[];

beforeAll(async () => {
  const base = { active: true, createdAt: Timestamp.now() };
  users = [
    {
      ...base,
      id: "lu",
      name: "Luis",
      initials: "LU",
      role: "cashier",
      pin: await hashSecret("1234"),
    },
    {
      ...base,
      id: "an",
      name: "Ana",
      initials: "AN",
      role: "cashier",
      pin: await hashSecret("4321"),
    },
    {
      ...base,
      id: "ma",
      name: "Mari",
      initials: "MA",
      role: "cashier",
      active: false,
      pin: await hashSecret("0000"),
    },
  ];
});

beforeEach(() => {
  localStorage.clear();
});

const type = async (user: ReturnType<typeof userEvent.setup>, pin: string) => {
  for (const d of pin)
    await user.click(screen.getByRole("button", { name: d }));
};

const setup = () => {
  const props = { users, onSuccess: vi.fn(), onAdmin: vi.fn() };
  render(<PinScreen {...props} />);
  return props;
};

describe("PinScreen", () => {
  it("lists only active users", () => {
    setup();
    expect(screen.getByText("Luis")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText("Mari")).toBeNull();
  });

  it("enters with the right PIN of the selected user", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByText("Ana"));
    await type(user, "4321");
    await vi.waitFor(() =>
      expect(props.onSuccess).toHaveBeenCalledWith(users[1]),
    );
  });

  it("rejects the PIN of another user and clears the dots", async () => {
    const user = userEvent.setup();
    const props = setup();
    await type(user, "4321");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "PIN incorrecto",
    );
    expect(props.onSuccess).not.toHaveBeenCalled();
    await type(user, "1234");
    await vi.waitFor(() =>
      expect(props.onSuccess).toHaveBeenCalledWith(users[0]),
    );
  });

  it("locks after five failures, even for the right PIN, with a countdown", async () => {
    const user = userEvent.setup();
    const props = setup();
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      await type(user, "9999");
      await vi.waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    }
    expect(await screen.findByRole("alert")).toHaveTextContent(
      `Espera ${LOCK_SECONDS} s`,
    );
    await type(user, "1234");
    expect(props.onSuccess).not.toHaveBeenCalled();
  });

  it("locks per user: another user can still enter", async () => {
    const user = userEvent.setup();
    const props = setup();
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      await type(user, "9999");
      await vi.waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    }
    await user.click(screen.getByText("Ana"));
    await type(user, "4321");
    await vi.waitFor(() =>
      expect(props.onSuccess).toHaveBeenCalledWith(users[1]),
    );
  });

  it("resets the failure counter after a success", async () => {
    const user = userEvent.setup();
    const props = setup();
    for (let i = 0; i < MAX_PIN_ATTEMPTS - 1; i++) {
      await type(user, "9999");
      await vi.waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    }
    await type(user, "1234");
    await vi.waitFor(() => expect(props.onSuccess).toHaveBeenCalled());
    expect(localStorage.getItem("benjastore.attempts")).not.toContain("lu");
  });
});
