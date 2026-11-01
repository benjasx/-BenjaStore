export interface Product {
  id: string;
  group: string;
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  image?: string;
  soldOut?: boolean;
  usesSauces?: boolean;
}

export const DEFAULT_PRODUCT_IMAGE = "/mock-product.svg";

export const channels = [
  "Mostrador",
  "Llevar",
  "WhatsApp",
  "Domicilio",
] as const;

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
