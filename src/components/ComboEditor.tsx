import { useState } from "react";
import { ImagePicker } from "@/components/ImagePicker";
import { Segmented } from "@/components/Segmented";
import { Toggle } from "@/components/Toggle";
import { money, type Product } from "@/data/mock";
import type { ImageMap } from "@/hooks/useImages";
import { pickImage } from "@/lib/image";
import {
  comboContents,
  isComboSoldOut,
  type Combo,
  type ComboInput,
} from "@/hooks/useCombos";

interface Props {
  combos: Combo[];
  products: Product[];
  images: ImageMap;
  onCreate: (input: ComboInput) => void;
  onUpdate: (id: string, input: ComboInput) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

const field =
  "bg-surface-2 border-line focus:border-gold rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";
const label = "text-muted text-[15px] font-semibold";

const SAUCE_COUNTS = ["0", "1", "2", "3"] as const;

interface FormProps {
  combo?: Combo;
  onSave: (input: ComboInput) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const ComboForm = ({ combo, onSave, onDelete, onCancel }: FormProps) => {
  const [name, setName] = useState(combo?.name ?? "");
  const [price, setPrice] = useState(combo ? String(combo.price) : "");
  const [description, setDescription] = useState(combo?.description ?? "");
  const [image, setImage] = useState(combo?.image);
  const [sauceCount, setSauceCount] = useState<(typeof SAUCE_COUNTS)[number]>(
    () => SAUCE_COUNTS[combo?.sauceCount ?? 0] ?? "0",
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const amount = Number(price);
  const valid =
    name.trim() !== "" &&
    price !== "" &&
    amount >= 0 &&
    description.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onSave({
            name,
            price: amount,
            items: [],
            description,
            image,
            sauceCount: Number(sauceCount),
          });
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
        <span className={label}>Descripción</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué incluye"
          aria-label="Descripción del combo"
          className={`${field} resize-none py-2.5`}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className={label}>Salsas incluidas</span>
        <Segmented
          options={SAUCE_COUNTS}
          value={sauceCount}
          onChange={setSauceCount}
        />
      </div>
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
  images,
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
              combo={{ ...c, image: pickImage(c.id, images, c.image) }}
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
