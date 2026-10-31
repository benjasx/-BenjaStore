import { useState } from "react";
import { Header } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { channels, money, type Product } from "@/data/mock";
import { comboContents, type Combo } from "@/hooks/useCombos";
import type { Promotion } from "@/hooks/usePromotions";
import { COMBO_KEY_PREFIX, computeCart } from "@/lib/pricing";
import { PaymentSheet } from "@/screens/PaymentSheet";

interface Props {
  products: Product[];
  combos: Combo[];
  promotions: Promotion[];
  cart: Record<string, number>;
  onChangeQty: (id: string, delta: number) => void;
  onClear: () => void;
  onBack?: () => void;
  onConfirm: () => void;
}

const stepper =
  "grid h-11 w-12 place-items-center rounded-xl bg-surface text-[22px] font-bold";

export const CartPanel = ({
  products,
  combos,
  promotions,
  cart,
  onChangeQty,
  onClear,
  onBack,
  onConfirm,
}: Props) => {
  const [channel, setChannel] =
    useState<(typeof channels)[number]>("Mostrador");
  const [paying, setPaying] = useState(false);
  const { lines, saleSaving, saleName, total } = computeCart(
    cart,
    products,
    combos,
    promotions,
  );

  const detail = (key: string) => {
    if (!key.startsWith(COMBO_KEY_PREFIX)) {
      return products.find((p) => p.id === key)?.group;
    }
    const combo = combos.find(
      (c) => c.id === key.slice(COMBO_KEY_PREFIX.length),
    );
    return combo && comboContents(combo, products);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Header
        title="Ticket #0148"
        onBack={onBack}
        action={
          <button
            type="button"
            onClick={onClear}
            className="text-salmon h-12 px-3.5 text-base font-bold"
          >
            Vaciar
          </button>
        }
      />
      <div className="px-5 pb-4">
        <Segmented options={channels} value={channel} onChange={setChannel} />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-5">
        {lines.map((line) => (
          <div
            key={line.key}
            className="border-line-soft flex flex-col gap-1 border-b py-3.5"
          >
            <div className="flex justify-between text-lg font-extrabold">
              <span className="uppercase">{line.name}</span>
              <span className="tabular-nums">
                {money(line.gross - line.saving)}
              </span>
            </div>
            <div className="text-muted text-[15px]">{detail(line.key)}</div>
            {line.saving > 0 && (
              <div className="text-ok flex justify-between text-[15px] font-bold">
                <span className="uppercase">{line.promotionName}</span>
                <span className="tabular-nums">−{money(line.saving)}</span>
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label={`Quitar ${line.name}`}
                onClick={() => onChangeQty(line.key, -1)}
                className={stepper}
              >
                −
              </button>
              <span className="w-11 text-center text-lg font-extrabold">
                {line.qty}
              </span>
              <button
                type="button"
                aria-label={`Agregar ${line.name}`}
                onClick={() => onChangeQty(line.key, 1)}
                className={stepper}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <footer className="border-line-soft bg-ink-deep flex flex-col gap-3.5 border-t px-5 pt-4 pb-8">
        {saleSaving > 0 && (
          <div className="text-ok flex justify-between text-base font-bold">
            <span className="uppercase">{saleName}</span>
            <span className="tabular-nums">−{money(saleSaving)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-extrabold">Total</span>
          <span className="font-marker text-gold text-[40px] leading-none">
            {money(total)}
          </span>
        </div>
        <button
          type="button"
          disabled={total === 0}
          onClick={() => setPaying(true)}
          className="bg-chili h-15 rounded-2xl text-xl font-black disabled:opacity-40"
        >
          Cobrar {money(total)}
        </button>
      </footer>
      {paying && (
        <PaymentSheet
          total={total}
          onClose={() => setPaying(false)}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
};
