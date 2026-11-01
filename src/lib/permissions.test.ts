import { allowedViews, can, homeView } from "@/lib/permissions";

describe("permissions", () => {
  it("lets the owner do everything", () => {
    for (const p of [
      "sell",
      "viewSales",
      "viewAllSales",
      "cancelAnySale",
      "viewReports",
      "manageMenu",
      "manageUsers",
      "closeShift",
      "switchUser",
    ] as const)
      expect(can("owner", p)).toBe(true);
  });

  it("limits the cashier to selling, own sales and their shift", () => {
    expect(can("cashier", "sell")).toBe(true);
    expect(can("cashier", "viewSales")).toBe(true);
    expect(can("cashier", "closeShift")).toBe(true);
    expect(can("cashier", "viewAllSales")).toBe(false);
    expect(can("cashier", "cancelAnySale")).toBe(false);
    expect(can("cashier", "viewReports")).toBe(false);
    expect(can("cashier", "manageMenu")).toBe(false);
    expect(can("cashier", "manageUsers")).toBe(false);
    expect(can("cashier", "switchUser")).toBe(false);
  });

  it("hides reports and menu views from the cashier", () => {
    const views = allowedViews("cashier");
    for (const v of ["pos", "cart", "sales", "more", "shift"] as const)
      expect(views).toContain(v);
    for (const v of ["reports", "menu", "product-new"] as const)
      expect(views).not.toContain(v);
    expect(allowedViews("owner")).toEqual(
      expect.arrayContaining(["reports", "menu", "product-new", "pos"]),
    );
  });

  it("sends each mode to its home view", () => {
    expect(homeView("cashier", "pin")).toBe("pos");
    expect(homeView("owner", "pin")).toBe("pos");
    expect(homeView("owner", "admin")).toBe("more");
  });
});
