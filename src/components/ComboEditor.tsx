import { useState } from "react";
import { ImagePicker } from "@/components/ImagePicker";
import { Toggle } from "@/components/Toggle";
import { money, type Product } from "@/data/mock";
import {
  comboContents,
  isComboSoldOut,
  type Combo,
  type ComboInput,
} from "@/hooks/useCombos";

interface Props {
  combos: Combo[];
  products: Product[];
  onCreate: (input: ComboInput) => void;
  onUpdate: (id: string, input: ComboInput) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

const field =
  "bg-surface-2 border-line focus:border-gold rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";
const label = "text-muted text-[15px] font-semibold";
const step =
  "bg-surface-3 grid size-11 shrink-0 place-items-center rounded-xl text-lg disabled:opacity-30";

interface FormProps {
  combo?: Combo;
  products: Product[];
  onSave: (input: ComboInput) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const ComboForm = ({
  combo,
  products,
  onSave,
  onDelete,
  onCancel,
}: FormProps) => {
  const [name, setName] = useState(combo?.name ?? "");
  const [price, setPrice] = useState(combo ? String(combo.price) : "");
  const [description, setDescription] = useState(combo?.description ?? "");
  const [image, setImage] = useState(combo?.image);
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries((combo?.items ?? []).map((i) => [i.productId, i.qty])),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const items = products
    .filter((p) => (qtys[p.id] ?? 0) > 0)
    .map((p) => ({ productId: p.id, qty: qtys[p.id] }));
  const amount = Number(price);
  const valid =
    name.trim() !== "" && price !== "" && amount >= 0 && items.length > 0;

  const changeQty = (id: string, delta: number) =>
    setQtys((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ name, price: amount, items, description, image });
      }}
      className="bg-surface flex flex-col gap-3 rounded-[14px] p-3"
    >
      <ImagePicker value={image} onChange={setImage} />
      <label className="flex flex-col gap-1.5">
        <span className={label}>Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del combo"
          className={`${field} h-11 uppercase`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Precio</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          aria-label="Precio del combo"
          className={`${field} h-11 tabular-nums`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Descripción (opcional)</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué incluye"
          aria-label="Descripción del combo"
          className={`${field} resize-none py-2.5`}
        />
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className={label}>Productos</legend>
        <div className="flex max-h-72 flex-col overflow-y-auto">
          {products.map((p) => {
            const qty = qtys[p.id] ?? 0;
            return (
              <div
                key={p.id}
                className="border-line-soft flex items-center gap-2 border-b py-1"
              >
                <span
                  className={`min-w-0 flex-1 truncate text-base uppercase ${qty > 0 ? "font-extrabold" : "text-sand"}`}
                >
                  {p.name}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ${p.name}`}
                  disabled={qty === 0}
                  onClick={() => changeQty(p.id, -1)}
                  className={step}
                >
                  −
                </button>
                <span className="w-6 text-center text-base font-bold tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={`Agregar ${p.name}`}
                  onClick={() => changeQty(p.id, 1)}
                  className={step}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
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
            Eliminar combo
          </button>
        ))}
    </form>
  );
};

export const ComboEditor = ({
  combos,
  products,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
}: Props) => {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="mx-5 mb-3 flex flex-col gap-2.5">
      {editing === "new" ? (
        <ComboForm
          products={products}
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
          + Combo
        </button>
      )}
      {combos.length === 0 && (
        <p className="text-muted text-[15px]">Sin combos todavía.</p>
      )}
      {combos.map((c) => (
        <div key={c.id} className="flex flex-col gap-2">
          <div
            className={`bg-surface flex items-center gap-2 rounded-[14px] p-2 pl-3.5 ${c.enabled ? "" : "opacity-60"}`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-extrabold uppercase">
                {c.name}
              </span>
              <span className="text-muted text-[15px]">
                {isComboSoldOut(c, products) ? (
                  <span className="text-salmon font-bold">Agotado</span>
                ) : (
                  money(c.price)
                )}
                {" · "}
                {comboContents(c, products)}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Editar ${c.name}`}
              onClick={() => setEditing(editing === c.id ? null : c.id)}
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
              checked={c.enabled}
              onChange={(v) => onToggle(c.id, v)}
              label={`Habilitado: ${c.name}`}
            />
          </div>
          {editing === c.id && (
            <ComboForm
              combo={c}
              products={products}
              onSave={(input) => {
                onUpdate(c.id, input);
                setEditing(null);
              }}
              onDelete={() => {
                onDelete(c.id);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
};
