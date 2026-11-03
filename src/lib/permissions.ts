export type Role = "owner" | "cashier";

export type View =
  | "login"
  | "pin"
  | "pos"
  | "cart"
  | "reports"
  | "sales"
  | "more"
  | "menu"
  | "product-new"
  | "shift"
  | "cuts"
  | "advertising";

export type Permission =
  | "sell"
  | "viewSales"
  | "viewAllSales"
  | "cancelAnySale"
  | "viewReports"
  | "manageMenu"
  | "manageUsers"
  | "closeShift"
  | "switchUser"
  | "viewCuts"
  | "manageAdvertising";

const cashierPermissions: ReadonlySet<Permission> = new Set([
  "sell",
  "viewSales",
  "closeShift",
]);

export const can = (role: Role, permission: Permission) =>
  role === "owner" || cashierPermissions.has(permission);

const publicViews: View[] = ["login", "pin"];

export const allowedViews = (role: Role): View[] => {
  const views: View[] = [...publicViews, "more"];
  if (can(role, "sell")) views.push("pos", "cart");
  if (can(role, "viewSales")) views.push("sales");
  if (can(role, "closeShift")) views.push("shift");
  if (can(role, "viewReports")) views.push("reports");
  if (can(role, "viewCuts")) views.push("cuts");
  if (can(role, "manageAdvertising")) views.push("advertising");
  if (can(role, "manageMenu")) views.push("menu", "product-new");
  return views;
};

export const homeView = (role: Role, mode: "admin" | "pin"): View =>
  mode === "pin" && can(role, "sell") ? "pos" : "more";
