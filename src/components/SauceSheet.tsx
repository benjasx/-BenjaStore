import { useState } from "react";
import { money } from "@/data/mock";
import type { Sauce } from "@/hooks/useSauces";
import type { SauceSelection } from "@/lib/pricing";

interface Props {
  name: string;
  slots: number;
  sauces: Sauce[];
  onClose: () => void;
  onConfirm: (selection: SauceSelection) => void;
}

type Counts = Record<string, number>;

const stepper =
  "grid size-11 place-items-center rounded-xl bg-surface-2 text-[22px] font-bold disabled:opacity-30";

const expand = (counts: Counts) =>
  Object.entries(counts).flatMap(([id, n]) => Array<string>(n).fill(id));

const sum = (counts: Counts) =>
  Object.values(counts).reduce((total, n) => total + n, 0);

interface RowProps {
  sauce: Sauce;
  count: number;
  hint?: string;
  addLabel: string;
  removeLabel: string;
  canAdd: boolean;
  onChange: (delta: number) => void;
}

const SauceRow = ({
  sauce,
  count,
  hint,
  addLabel,
  removeLabel,
  canAdd,
  onChange,
}: RowProps) => (
  <div className="border-line-soft flex min-h-14 items-center gap-2 border-b">
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-base font-extrabold uppercase">{sauce.name}</span>
      {hint && <span className="text-muted text-sm">{hint}</span>}
    </span>
    <button
      type="button"
      aria-label={removeLabel}
      disabled={count === 0}
      onClick={() => onChange(-1)}
      className={stepper}
    >
      −
    </button>
    <span className="w-6 text-center text-lg font-extrabold tabular-nums">
      {count}
    </span>
    <button
      type="button"
      aria-label={addLabel}
      disabled={!canAdd}
      onClick={() => onChange(1)}
      className={stepper}
    >
      +
    </button>
  </div>
);

export const SauceSheet = ({
  name,
  slots,
  sauces,
  onClose,
  onConfirm,
}: Props) => {
  const [included, setIncluded] = useState<Counts>({});
  const [extra, setExtra] = useState<Counts>({});

  const includedCount = sum(included);
  const extrasTotal = sauces.reduce(
    (total, s) => total + (extra[s.id] ?? 0) * s.extraPrice,
    0,
  );
  const change = (set: typeof setIncluded, id: string, delta: number) =>
    set((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end lg:fixed lg:items-center lg:justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(8,5,4,0.72)]"
      />
      <div
        role="dialog"
        aria-label={`Salsas de ${name}`}
        className="bg-surface relative flex max-h-[90dvh] flex-col gap-4 rounded-t-[28px] px-5 pt-2.5 pb-8 lg:w-full lg:max-w-md lg:rounded-[28px] lg:px-6 lg:pt-6"
      >
        <div className="h-[5px] w-11 self-center rounded-full bg-[#5a4a42] lg:hidden" />
        <h2 className="text-[22px] font-black uppercase">{name}</h2>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <section className="flex flex-col">
            <h3 className="text-gold text-[15px] font-extrabold">
              {slots === 1 ? "Elige 1 salsa" : `Elige ${slots} salsas`} ·{" "}
              {includedCount} de {slots}
            </h3>
            {sauces.map((s) => (
              <SauceRow
                key={s.id}
                sauce={s}
                count={included[s.id] ?? 0}
                addLabel={`Agregar salsa incluida ${s.name}`}
                removeLabel={`Quitar salsa incluida ${s.name}`}
                canAdd={includedCount < slots}
                onChange={(d) => change(setIncluded, s.id, d)}
              />
            ))}
          </section>
          <section className="flex flex-col">
            <h3 className="text-gold text-[15px] font-extrabold">
              Salsa extra (opcional)
            </h3>
            {sauces.map((s) => (
              <SauceRow
                key={s.id}
                sauce={s}
                count={extra[s.id] ?? 0}
                hint={`+${money(s.extraPrice)}`}
                addLabel={`Agregar extra ${s.name}`}
                removeLabel={`Quitar extra ${s.name}`}
                canAdd
                onChange={(d) => change(setExtra, s.id, d)}
              />
            ))}
          </section>
        </div>
        <button
          type="button"
          disabled={includedCount !== slots}
          onClick={() =>
            onConfirm({ included: expand(included), extra: expand(extra) })
          }
          className="bg-chili h-15 rounded-2xl text-xl font-black disabled:opacity-40"
        >
          Agregar{extrasTotal > 0 && ` · +${money(extrasTotal)} extra`}
        </button>
      </div>
    </div>
  );
};
