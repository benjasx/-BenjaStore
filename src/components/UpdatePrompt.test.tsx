import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdatePrompt } from "@/components/UpdatePrompt";

const { useRegisterSW, updateServiceWorker, setNeedRefresh } = vi.hoisted(
  () => ({
    useRegisterSW: vi.fn(),
    updateServiceWorker: vi.fn(),
    setNeedRefresh: vi.fn(),
  }),
);

vi.mock("virtual:pwa-register/react", () => ({ useRegisterSW }));

const mockState = (needRefresh: boolean) =>
  useRegisterSW.mockReturnValue({
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  });

describe("UpdatePrompt", () => {
  beforeEach(() => {
    updateServiceWorker.mockReset();
    setNeedRefresh.mockReset();
  });

  it("no muestra nada sin versión nueva", () => {
    mockState(false);
    render(<UpdatePrompt />);
    expect(screen.queryByText("Nueva versión disponible")).toBeNull();
  });

  it("avisa de la versión nueva sin recargar por sí solo", () => {
    mockState(true);
    render(<UpdatePrompt />);
    expect(screen.getByText("Nueva versión disponible")).toBeInTheDocument();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it("Actualizar activa la versión nueva", async () => {
    mockState(true);
    render(<UpdatePrompt />);
    await userEvent.click(screen.getByText("Actualizar"));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("Luego oculta el aviso", async () => {
    mockState(true);
    render(<UpdatePrompt />);
    await userEvent.click(screen.getByText("Luego"));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });
});
