import { act, renderHook } from "@testing-library/react";
import { DEFAULT_ADVERTISING } from "@/lib/advertising";
import { useAdvertising } from "@/hooks/useAdvertising";

const fs = vi.hoisted(() => ({
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  onSnapshot: fs.onSnapshot,
  setDoc: fs.setDoc,
}));

beforeEach(() => {
  fs.onSnapshot.mockReset();
  fs.setDoc.mockReset();
});

describe("useAdvertising", () => {
  it("lee settings/advertising en vivo", () => {
    let next: (s: { data: () => unknown }) => void = () => {};
    fs.onSnapshot.mockImplementation((_ref, onNext) => {
      next = onNext;
      return () => {};
    });
    const { result } = renderHook(() => useAdvertising());
    expect(fs.onSnapshot.mock.calls[0][0]).toEqual({
      path: "settings/advertising",
    });
    expect(result.current.loading).toBe(true);

    act(() =>
      next({
        data: () => ({
          brand: { name: "Otro", phone: "1", address: "", promoTitle: "Hola" },
          promoComboIds: ["c1"],
          menuProductIds: ["p1", "p2"],
        }),
      }),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.config.brand.name).toBe("Otro");
    expect(result.current.config.promoComboIds).toEqual(["c1"]);
  });

  it("documento ausente usa la configuración por defecto", () => {
    fs.onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ data: () => undefined });
      return () => {};
    });
    const { result } = renderHook(() => useAdvertising());
    expect(result.current.config).toEqual(DEFAULT_ADVERTISING);
    expect(result.current.error).toBeNull();
  });

  it("expone el error de lectura", () => {
    const boom = new Error("boom");
    fs.onSnapshot.mockImplementation((_ref, _next, onError) => {
      onError(boom);
      return () => {};
    });
    const { result } = renderHook(() => useAdvertising());
    expect(result.current.error).toBe(boom);
    expect(result.current.loading).toBe(false);
  });

  it("guarda el documento con la marca recortada", async () => {
    fs.onSnapshot.mockReturnValue(() => {});
    fs.setDoc.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdvertising());
    await act(() =>
      result.current.save({
        brand: { name: "  Casa ", phone: " 1 ", address: "", promoTitle: "" },
        promoComboIds: ["c1"],
        menuProductIds: ["p1"],
        productBannerId: "p9",
      }),
    );
    expect(fs.setDoc).toHaveBeenCalledWith(
      { path: "settings/advertising" },
      {
        brand: { name: "Casa", phone: "1", address: "", promoTitle: "" },
        promoComboIds: ["c1"],
        menuProductIds: ["p1"],
        productBannerId: "p9",
      },
    );
  });

  it("rechaza una marca inválida sin escribir", async () => {
    fs.onSnapshot.mockReturnValue(() => {});
    const { result } = renderHook(() => useAdvertising());
    await expect(
      result.current.save({
        ...DEFAULT_ADVERTISING,
        brand: { ...DEFAULT_ADVERTISING.brand, name: " " },
      }),
    ).rejects.toThrow("obligatorio");
    expect(fs.setDoc).not.toHaveBeenCalled();
  });
});
