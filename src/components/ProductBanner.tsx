import type { Ref } from "react";
import { money } from "@/data/mock";
import {
  PRODUCT_SIZE,
  type AdvertisingBrand,
  type ProductBlock,
} from "@/lib/advertising";

interface Props {
  brand: AdvertisingBrand;
  block: ProductBlock;
  ref?: Ref<HTMLDivElement>;
}

// Nombre largo = letra menor, para que quepa en dos líneas sin recortarse.
const nameSize = (name: string) => (name.length <= 20 ? 72 : 56);

export const ProductBanner = ({ brand, block, ref }: Props) => {
  const { product, image } = block;
  return (
    <div
      ref={ref}
      style={{ ...PRODUCT_SIZE, backgroundColor: "#c8102e" }}
      className="flex flex-col gap-6 overflow-hidden p-10 text-[#2a0a0a]"
    >
      <header className="flex items-center gap-6">
        <img
          src="/logo_letras.jpeg"
          alt=""
          crossOrigin="anonymous"
          className="h-24 w-24 rounded-full object-cover"
        />
        <h1 className="font-display text-6xl leading-none tracking-wide text-[#ffc21a] uppercase">
          {brand.name}
        </h1>
      </header>
      <section className="flex flex-1 flex-col overflow-hidden rounded-[48px] bg-[#2a0a0a]">
        {image && (
          <img
            src={image}
            alt=""
            className="min-h-0 w-full flex-1 object-cover"
          />
        )}
        <div
          className={`flex flex-col gap-4 p-9 ${image ? "" : "flex-1 justify-center"}`}
        >
          <h2
            style={{ fontSize: nameSize(product.name) }}
            className="font-display line-clamp-2 leading-none tracking-wide text-[#ffc21a] uppercase"
          >
            {product.name}
          </h2>
          {product.description && (
            <p className="line-clamp-2 text-[32px] leading-snug font-extrabold tracking-tight text-[#fdf0d9] uppercase">
              {product.description}
            </p>
          )}
          <span className="font-display w-fit rounded-full bg-[#ffc21a] px-9 pt-2 pb-1 text-6xl leading-tight tracking-wide">
            {money(product.price)}
          </span>
        </div>
      </section>
      <footer className="flex items-center justify-between gap-6 text-3xl font-extrabold tracking-tight text-[#fdf0d9]">
        <span>{brand.phone && `Ordena al ${brand.phone}`}</span>
        <span className="text-right">{brand.address}</span>
      </footer>
    </div>
  );
};
