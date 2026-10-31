export type Category = "Alitas" | "Boneless" | "Más" | "Bebidas" | "Extras";

export interface Product {
  id: string;
  group: string;
  name: string;
  price: number;
  category: Category;
  soldOut?: boolean;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  role: string;
  active: boolean;
}

export const categories: Category[] = [
  "Alitas",
  "Boneless",
  "Más",
  "Bebidas",
  "Extras",
];

export const users: User[] = [
  { id: "ro", name: "Rodrigo", initials: "RO", role: "Dueño", active: true },
  { id: "lu", name: "Luis", initials: "LU", role: "Cajero", active: true },
  { id: "an", name: "Ana", initials: "AN", role: "Cajera", active: true },
  { id: "ma", name: "Mari", initials: "MA", role: "Cajera", active: false },
];

export const channels = [
  "Mostrador",
  "Llevar",
  "WhatsApp",
  "Domicilio",
] as const;

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
