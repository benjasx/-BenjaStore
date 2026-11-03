import type { Ref } from "react";
import { money, type Product } from "@/data/mock";
import {
  PROMO_SIZE,
  type AdvertisingBrand,
  type PromoBlock,
} from "@/lib/advertising";

interface Props {
  brand: AdvertisingBrand;
  blocks: PromoBlock[];
  products: Product[];
  ref?: Ref<HTMLDivElement>;
}

const lines = (block: PromoBlock, products: Product[]) => {
  const { combo } = block;
  if (combo.items.length === 0)
    return combo.description ? [combo.description] : [];
  return combo.items.map((item) => {
    const name =
      products.find((p) => p.id === item.productId)?.name ?? "Producto";
    return `${item.qty} ${name}`;
  });
};

// Texto largo = letra menor, para que los 3 bloques quepan sin recortarse.
const textSize = (items: string[]) => {
  const length = items.reduce((sum, line) => sum + line.length + 6, 0);
  return length <= 60 ? 32 : length <= 100 ? 28 : 25;
};

export const PromoBanner = ({ brand, blocks, products, ref }: Props) => (
  <div
    ref={ref}
    style={{ ...PROMO_SIZE, backgroundColor: "#c8102e" }}
    className="flex flex-col gap-8 overflow-hidden p-10 text-[#2a0a0a]"
  >
    <header className="flex items-center gap-8">
      <img
        src="/logo_letras.jpeg"
        alt=""
        crossOrigin="anonymous"
        className="h-28 w-28 rounded-full object-cover"
      />
      <h1 className="font-display text-7xl leading-none tracking-wide text-[#ffc21a] uppercase">
        {brand.promoTitle || brand.name}
      </h1>
    </header>
    <div className="flex flex-1 flex-col gap-8">
      {blocks.map(({ combo, image }, index) => (
        <section
          key={combo.id}
          // La foto alterna: derecha en bloques pares, izquierda en impares.
          className={`flex flex-1 overflow-hidden rounded-[48px] bg-[#2a0a0a] ${
            index % 2 === 1 ? "flex-row-reverse" : ""
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 p-7">
            <h2 className="font-display text-[52px] leading-none tracking-wide text-[#ffc21a] uppercase">
              {combo.name}
            </h2>
            <ul
              style={{ fontSize: textSize(lines({ combo, image }, products)) }}
              className="flex flex-col gap-0.5 leading-snug font-extrabold tracking-tight text-[#fdf0d9] uppercase"
            >
              {lines({ combo, image }, products).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <span className="font-display w-fit rounded-full bg-[#ffc21a] px-8 pt-1.5 pb-0.5 text-5xl leading-tight tracking-wide">
              {money(combo.price)}
            </span>
          </div>
          {image && (
            <img
              src={image}
              alt=""
              className="h-full w-[380px] shrink-0 object-cover"
            />
          )}
        </section>
      ))}
    </div>
    <footer className="flex items-center justify-between gap-6 text-3xl font-extrabold tracking-tight text-[#fdf0d9]">
      <span>{brand.phone && `Ordena al ${brand.phone}`}</span>
      <span className="text-right">{brand.address}</span>
    </footer>
  </div>
);
