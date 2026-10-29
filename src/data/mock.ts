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

export const products: Product[] = [
  {
    id: "a6",
    group: "Paquete",
    name: "6 Alitas",
    price: 97,
    category: "Alitas",
  },
  {
    id: "a10",
    group: "Paquete",
    name: "10 Alitas",
    price: 150,
    category: "Alitas",
  },
  {
    id: "a15",
    group: "Paquete",
    name: "15 Alitas",
    price: 215,
    category: "Alitas",
  },
  {
    id: "a20",
    group: "Paquete",
    name: "20 Alitas",
    price: 280,
    category: "Alitas",
  },
  {
    id: "a30",
    group: "Paquete",
    name: "30 Alitas",
    price: 410,
    category: "Alitas",
    soldOut: true,
  },
  {
    id: "cd",
    group: "Mitad y mitad",
    name: "Combo Doble",
    price: 189,
    category: "Alitas",
  },
  {
    id: "b10",
    group: "Paquete",
    name: "10 Boneless",
    price: 165,
    category: "Boneless",
  },
  {
    id: "b15",
    group: "Paquete",
    name: "15 Boneless",
    price: 230,
    category: "Boneless",
  },
  {
    id: "pf",
    group: "Complemento",
    name: "Papas a la francesa",
    price: 55,
    category: "Más",
  },
  {
    id: "r600",
    group: "Refresco",
    name: "Refresco 600 ml",
    price: 30,
    category: "Bebidas",
  },
  {
    id: "qx",
    group: "Extra",
    name: "Queso extra",
    price: 15,
    category: "Extras",
  },
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
