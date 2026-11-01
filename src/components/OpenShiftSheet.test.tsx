import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpenShiftSheet } from "@/components/OpenShiftSheet";

const setup = (onConfirm = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <OpenShiftSheet
      sellerName="Luis"
      onClose={() => {}}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
};

describe("OpenShiftSheet", () => {
  it.each(["", "-5", "1.5", "100000"])("rejects %j", async (value) => {
    const user = userEvent.setup();
    setup();
    if (value) await user.type(screen.getByLabelText("Fondo inicial"), value);
    expect(screen.getByRole("button", { name: "Abrir turno" })).toBeDisabled();
  });

  it("confirms a valid float", async () => {
    const user = userEvent.setup();
    const onConfirm = setup();
    await user.type(screen.getByLabelText("Fondo inicial"), "500");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));
    expect(onConfirm).toHaveBeenCalledWith(500);
  });

  it("shows the error and stays open when opening fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    setup(vi.fn().mockRejectedValue(new Error("sin red")));
    await user.type(screen.getByLabelText("Fondo inicial"), "0");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("sin red");
    expect(screen.getByRole("button", { name: "Abrir turno" })).toBeEnabled();
  });
});
