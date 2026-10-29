import { useState } from "react";
import { Header, Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { channels, money, type Product } from "@/data/mock";
import { PaymentSheet } from "./PaymentSheet";

interface Props {
  products: Product[];
  cart: Record<string, number>;
  onChangeQty: (id: string, delta: number) => void;
  onClear: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

const stepper =
  "grid h-11 w-12 place-items-center rounded-xl bg-surface text-[22px] font-bold";

export const CartScreen = ({
  products,
  cart,
  onChangeQty,
  onClear,
  onBack,
  onConfirm,
}: Props) => {
  const [channel, setChannel] =
    useState<(typeof channels)[number]>("Mostrador");
  const [paying, setPaying] = useState(false);
  const lines = Object.entries(cart).flatMap(([id, qty]) => {
    const product = products.find((p) => p.id === id);
    return product ? [{ product, qty }] : [];
  });
  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  return (
    <Screen className="relative h-dvh overflow-hidden">
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
        {lines.map(({ product, qty }) => (
          <div
            key={product.id}
            className="border-line-soft flex flex-col gap-1 border-b py-3.5"
          >
            <div className="flex justify-between text-lg font-extrabold">
              <span>{product.name}</span>
              <span className="tabular-nums">{money(product.price * qty)}</span>
            </div>
            <div className="text-muted text-[15px]">{product.group}</div>
            <div className="mt-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label={`Quitar ${product.name}`}
                onClick={() => onChangeQty(product.id, -1)}
                className={stepper}
              >
                −
              </button>
              <span className="w-11 text-center text-lg font-extrabold">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Agregar ${product.name}`}
                onClick={() => onChangeQty(product.id, 1)}
                className={stepper}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <footer className="border-line-soft bg-ink-deep flex flex-col gap-3.5 border-t px-5 pt-4 pb-8">
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
    </Screen>
  );
};
