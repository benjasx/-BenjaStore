import { useState } from "react";
import { ImagePicker } from "@/components/ImagePicker";
import { Toggle } from "@/components/Toggle";
import type { Product } from "@/data/mock";

export interface ProductChanges {
  name: string;
  price: number;
  description: string;
  image?: string;
  usesSauces?: boolean;
}

interface Props {
  product: Product;
  onSave: (changes: ProductChanges) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const field =
  "bg-surface-2 border-line focus:border-gold rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";
const label = "text-muted text-[15px] font-semibold";

export const ProductEditor = ({
  product,
  onSave,
  onDelete,
  onCancel,
}: Props) => {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? "");
  const [image, setImage] = useState(product.image);
  const [usesSauces, setUsesSauces] = useState(!!product.usesSauces);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const amount = Number(price);
  const valid = name.trim() !== "" && price !== "" && amount >= 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onSave({ name, price: amount, description, image, usesSauces });
      }}
      className="bg-surface mb-3 flex flex-col gap-3 rounded-[14px] p-3"
    >
      <ImagePicker value={image} onChange={setImage} />
      <label className="flex flex-col gap-1.5">
        <span className={label}>Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Nombre de ${product.name}`}
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
          aria-label={`Precio de ${product.name}`}
          className={`${field} h-11 tabular-nums`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Descripción (opcional)</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué es y qué contiene"
          aria-label={`Descripción de ${product.name}`}
          className={`${field} resize-none py-2.5`}
        />
      </label>
      <div className="flex min-h-11 items-center justify-between">
        <span className={label}>Lleva salsa</span>
        <Toggle
          checked={usesSauces}
          onChange={setUsesSauces}
          label={`Lleva salsa: ${product.name}`}
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
      {confirmingDelete ? (
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
          Eliminar producto
        </button>
      )}
    </form>
  );
};
