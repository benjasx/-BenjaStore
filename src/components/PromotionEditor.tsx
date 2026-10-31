import { useState } from "react";
import { Segmented } from "@/components/Segmented";
import { Toggle } from "@/components/Toggle";
import { money, type Product } from "@/data/mock";
import type { Combo } from "@/hooks/useCombos";
import type {
  Discount,
  Promotion,
  PromotionInput,
} from "@/hooks/usePromotions";

interface Props {
  promotions: Promotion[];
  products: Product[];
  combos: Combo[];
  onCreate: (input: PromotionInput) => void;
  onUpdate: (id: string, input: PromotionInput) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

const field =
  "bg-surface-2 border-line focus:border-gold rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";
const label = "text-muted text-[15px] font-semibold";

const SCOPES = ["Producto o combo", "Toda la venta"] as const;
const KINDS = ["Producto", "Combo"] as const;
const DISCOUNTS = ["Porcentaje", "Monto", "N×M"] as const;
const SALE_DISCOUNTS = ["Porcentaje", "Monto"] as const;

const describeDiscount = (d: Discount, perUnit: boolean) => {
  switch (d.type) {
    case "percent":
      return `${d.value}%`;
    case "amount":
      return `${money(d.value)}${perUnit ? " por unidad" : ""}`;
    case "bundle":
      return `${d.buy}×${d.pay}`;
  }
};

interface FormProps {
  promotion?: Promotion;
  products: Product[];
  combos: Combo[];
  onSave: (input: PromotionInput) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const PromotionForm = ({
  promotion,
  products,
  combos,
  onSave,
  onDelete,
  onCancel,
}: FormProps) => {
  const d = promotion?.discount;
  const [name, setName] = useState(promotion?.name ?? "");
  const [scope, setScope] = useState<(typeof SCOPES)[number]>(
    promotion?.scope === "sale" ? SCOPES[1] : SCOPES[0],
  );
  const [kind, setKind] = useState<(typeof KINDS)[number]>(
    promotion?.scope === "item" && promotion.target.kind === "combo"
      ? "Combo"
      : "Producto",
  );
  const [targetId, setTargetId] = useState(
    promotion?.scope === "item" ? promotion.target.id : "",
  );
  const [dtype, setDtype] = useState<(typeof DISCOUNTS)[number]>(
    d?.type === "amount"
      ? "Monto"
      : d?.type === "bundle"
        ? "N×M"
        : "Porcentaje",
  );
  const [value, setValue] = useState(
    d && d.type !== "bundle" ? String(d.value) : "",
  );
  const [buy, setBuy] = useState(d?.type === "bundle" ? String(d.buy) : "2");
  const [pay, setPay] = useState(d?.type === "bundle" ? String(d.pay) : "1");
  const [minSubtotal, setMinSubtotal] = useState(
    promotion?.scope === "sale" && promotion.minSubtotal !== undefined
      ? String(promotion.minSubtotal)
      : "",
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isSale = scope === "Toda la venta";
  const dtypeEffective = isSale && dtype === "N×M" ? "Porcentaje" : dtype;
  const targets = kind === "Producto" ? products : combos;

  const build = (): PromotionInput | null => {
    if (!name.trim()) return null;
    let discount: Discount;
    if (dtypeEffective === "N×M") {
      discount = { type: "bundle", buy: Number(buy), pay: Number(pay) };
      if (
        !Number.isInteger(discount.buy) ||
        !Number.isInteger(discount.pay) ||
        discount.pay < 1 ||
        discount.buy <= discount.pay
      )
        return null;
    } else {
      const n = Number(value);
      if (value === "") return null;
      if (dtypeEffective === "Porcentaje") {
        if (n < 1 || n > 100) return null;
        discount = { type: "percent", value: n };
      } else {
        if (!(n > 0)) return null;
        discount = { type: "amount", value: n };
      }
    }
    if (discount.type === "bundle") {
      return !isSale && targetId
        ? {
            name,
            scope: "item",
            target: {
              kind: kind === "Combo" ? "combo" : "product",
              id: targetId,
            },
            discount,
          }
        : null;
    }
    if (isSale) {
      const min = Number(minSubtotal);
      if (minSubtotal !== "" && !(min >= 0)) return null;
      return {
        name,
        scope: "sale",
        discount,
        minSubtotal: minSubtotal === "" ? undefined : min,
      };
    }
    return targetId
      ? {
          name,
          scope: "item",
          target: {
            kind: kind === "Combo" ? "combo" : "product",
            id: targetId,
          },
          discount,
        }
      : null;
  };

  const input = build();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (input) onSave(input);
      }}
      className="bg-surface flex flex-col gap-3 rounded-[14px] p-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className={label}>Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre de la promoción"
          className={`${field} h-11 uppercase`}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className={label}>Aplica a</span>
        <Segmented options={SCOPES} value={scope} onChange={setScope} />
      </div>
      {!isSale && (
        <>
          <Segmented
            options={KINDS}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setTargetId("");
            }}
          />
          <label className="flex flex-col gap-1.5">
            <span className={label}>{kind}</span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              aria-label="Objetivo de la promoción"
              className={`${field} h-11 uppercase`}
            >
              <option value="">Elegir…</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <span className={label}>Descuento</span>
        <Segmented
          options={isSale ? SALE_DISCOUNTS : DISCOUNTS}
          value={dtypeEffective}
          onChange={setDtype}
        />
      </div>
      {dtypeEffective === "N×M" ? (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={label}>Lleva</span>
            <input
              type="number"
              inputMode="numeric"
              min="2"
              value={buy}
              onChange={(e) => setBuy(e.target.value)}
              aria-label="Lleva"
              className={`${field} h-11 tabular-nums`}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={label}>Paga</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
              aria-label="Paga"
              className={`${field} h-11 tabular-nums`}
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className={label}>
            {dtypeEffective === "Porcentaje" ? "Porcentaje (1–100)" : "Monto"}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Valor del descuento"
            className={`${field} h-11 tabular-nums`}
          />
        </label>
      )}
      {isSale && (
        <label className="flex flex-col gap-1.5">
          <span className={label}>Compra mínima (opcional)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
            aria-label="Compra mínima"
            className={`${field} h-11 tabular-nums`}
          />
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!input}
          className="bg-gold text-ink h-11 flex-1 rounded-xl text-base font-extrabold disabled:opacity-40"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-surface-3 h-11 rounded-xl px-4 text-base font-bold"
        >
          Cancelar
        </button>
      </div>
      {onDelete &&
        (confirmingDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-salmon text-[15px] font-bold">
              Se eliminará de forma permanente. No se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDelete}
                className="bg-chili h-11 flex-1 rounded-xl text-base font-extrabold"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="bg-surface-3 h-11 rounded-xl px-4 text-base font-bold"
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-salmon h-11 rounded-xl text-base font-bold"
          >
            Eliminar promoción
          </button>
        ))}
    </form>
  );
};

export const PromotionEditor = ({
  promotions,
  products,
  combos,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
}: Props) => {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const targetName = (p: Promotion) => {
    if (p.scope !== "item") return "Toda la venta";
    const list = p.target.kind === "combo" ? combos : products;
    return list.find((t) => t.id === p.target.id)?.name;
  };

  return (
    <div className="mx-5 mb-3 flex flex-col gap-2.5">
      {editing === "new" ? (
        <PromotionForm
          products={products}
          combos={combos}
          onSave={(input) => {
            onCreate(input);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="bg-gold text-ink h-11 self-start rounded-xl px-4 text-base font-extrabold"
        >
          + Promoción
        </button>
      )}
      {promotions.length === 0 && (
        <p className="text-muted text-[15px]">Sin promociones todavía.</p>
      )}
      {promotions.map((p) => {
        const target = targetName(p);
        return (
          <div key={p.id} className="flex flex-col gap-2">
            <div
              className={`bg-surface flex items-center gap-2 rounded-[14px] p-2 pl-3.5 ${p.enabled ? "" : "opacity-60"}`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-base font-extrabold uppercase">
                  {p.name}
                </span>
                <span className="text-muted text-[15px]">
                  {describeDiscount(p.discount, p.scope === "item")}
                  {p.scope === "sale" &&
                    p.minSubtotal !== undefined &&
                    ` desde ${money(p.minSubtotal)}`}
                  {" · "}
                  {target === undefined ? (
                    <span className="text-salmon font-bold">
                      Elemento eliminado
                    </span>
                  ) : (
                    <span className={p.scope === "item" ? "uppercase" : ""}>
                      {target}
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Editar ${p.name}`}
                onClick={() => setEditing(editing === p.id ? null : p.id)}
                className="text-muted grid size-11 shrink-0 place-items-center"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <Toggle
                checked={p.enabled}
                onChange={(v) => onToggle(p.id, v)}
                label={`Activa: ${p.name}`}
              />
            </div>
            {editing === p.id && (
              <PromotionForm
                promotion={p}
                products={products}
                combos={combos}
                onSave={(input) => {
                  onUpdate(p.id, input);
                  setEditing(null);
                }}
                onDelete={() => {
                  onDelete(p.id);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
