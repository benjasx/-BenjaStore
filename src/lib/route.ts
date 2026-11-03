import type { View } from "@/lib/permissions";

const paths: Record<View, string> = {
  login: "/login",
  pin: "/pin",
  pos: "/vender",
  cart: "/carrito",
  reports: "/reportes",
  sales: "/ventas",
  more: "/mas",
  menu: "/menu",
  "product-new": "/menu/nuevo",
  shift: "/turno",
  cuts: "/cortes",
  advertising: "/publicidad",
};

export const viewToHash = (view: View) => `#${paths[view]}`;

export const hashToView = (hash: string): View | null => {
  const path = hash.replace(/^#/, "");
  const entry = (Object.entries(paths) as [View, string][]).find(
    ([, p]) => p === path,
  );
  return entry ? entry[0] : null;
};

// Vistas con estado que no se puede reconstruir al refrescar vuelven a su padre.
export const restorable = (view: View): View =>
  view === "cart" ? "pos" : view === "product-new" ? "menu" : view;
