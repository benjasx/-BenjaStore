import type { Ref } from "react";
import { money } from "@/data/mock";
import type { Sauce } from "@/hooks/useSauces";
import {
  MENU_SIZE,
  type AdvertisingBrand,
  type MenuBlock,
} from "@/lib/advertising";

interface Props {
  brand: AdvertisingBrand;
  blocks: MenuBlock[];
  sauces: Sauce[];
  ref?: Ref<HTMLDivElement>;
}

const Title = ({ children }: { children: string }) => (
  <h2 className="font-display mb-3 inline-block border-b-8 border-[#ffc21a] text-5xl leading-none tracking-wide text-[#ffc21a] uppercase">
    {children}
  </h2>
);

export const MenuBanner = ({ brand, blocks, sauces, ref }: Props) => (
  <div
    ref={ref}
    style={{ ...MENU_SIZE, backgroundColor: "#c8102e" }}
    className="flex flex-col gap-5 overflow-hidden p-8 text-[#2a0a0a]"
  >
    <header className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-5">
        <img
          src="/logo_letras.jpeg"
          alt=""
          crossOrigin="anonymous"
          className="h-20 w-20 rounded-full object-cover"
        />
        <h1 className="font-display text-5xl leading-none tracking-wide text-[#fdf0d9] uppercase">
          {brand.name}
        </h1>
      </div>
      <div className="text-right text-2xl font-extrabold text-[#fdf0d9]">
        {brand.phone && <p>Ordena al {brand.phone}</p>}
        {brand.address && <p>{brand.address}</p>}
      </div>
    </header>
    <div className="flex-1 columns-3 gap-6 overflow-hidden">
      {blocks.map(({ category, products }) => (
        <section
          key={category.id}
          className="mb-6 break-inside-avoid rounded-[32px] bg-[#fdf0d9] p-6"
        >
          <Title>{category.name}</Title>
          <ul className="flex flex-col gap-3">
            {products.map((p) => (
              <li key={p.id}>
                <div className="flex items-baseline justify-between gap-3 text-2xl font-extrabold uppercase">
                  <span>{p.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {money(p.price)}
                  </span>
                </div>
                {p.description && (
                  <p className="line-clamp-2 text-lg leading-snug">
                    {p.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {sauces.length > 0 && (
        <section className="mb-6 break-inside-avoid rounded-[32px] bg-[#fdf0d9] p-6">
          <Title>Salsas</Title>
          <ul className="text-2xl font-extrabold uppercase">
            {sauces.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  </div>
);
