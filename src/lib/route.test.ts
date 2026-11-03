import type { View } from "@/lib/permissions";
import { hashToView, restorable, viewToHash } from "@/lib/route";

const all: View[] = [
  "login",
  "pin",
  "pos",
  "cart",
  "reports",
  "sales",
  "more",
  "menu",
  "product-new",
  "shift",
  "cuts",
  "advertising",
];

describe("route", () => {
  it("round-trips every view through the hash", () => {
    for (const v of all) expect(hashToView(viewToHash(v))).toBe(v);
  });

  it("uses readable hashes", () => {
    expect(viewToHash("sales")).toBe("#/ventas");
    expect(viewToHash("product-new")).toBe("#/menu/nuevo");
    expect(viewToHash("cuts")).toBe("#/cortes");
    expect(viewToHash("advertising")).toBe("#/publicidad");
  });

  it("returns null for unknown or empty hashes", () => {
    for (const h of ["", "#", "#/nada", "#/ventas/x", "ventas"])
      expect(hashToView(h)).toBeNull();
  });

  it("restores stateful views to their parent", () => {
    expect(restorable("cart")).toBe("pos");
    expect(restorable("product-new")).toBe("menu");
    expect(restorable("sales")).toBe("sales");
  });
});
