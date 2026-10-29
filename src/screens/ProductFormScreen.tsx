import { useState } from "react";
import { Header, Screen } from "@/components/Screen";
import { Toggle } from "@/components/Toggle";
import { categories, type Category, type Product } from "@/data/mock";

interface Props {
  onSave: (product: Omit<Product, "id">) => void;
  onBack: () => void;
}

const field =
  "bg-surface border-line focus:border-gold h-14 rounded-[14px] border-[1.5px] px-4 text-[17px] outline-none";
const label = "text-muted text-[15px] font-semibold";

export const ProductFormScreen = ({ onSave, onBack }: Props) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category>("Alitas");
  const [group, setGroup] = useState("");
  const [available, setAvailable] = useState(true);

  const amount = Number(price);
  const valid = name.trim() !== "" && amount > 0;

  return (
    <Screen className="lg:max-w-160">
      <Header title="Nuevo producto" onBack={onBack} />
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave({
            name: name.trim(),
            price: amount,
            category,
            group: group.trim() || "Producto",
            soldOut: !available,
          });
        }}
      >
        <div className="flex flex-1 flex-col gap-4 px-5 pt-2">
          <label className="flex flex-col gap-2">
            <span className={label}>Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. 12 Alitas"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className={label}>Precio</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$0"
              className={`${field} tabular-nums`}
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className={label}>Categoría</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`h-11 rounded-full px-[18px] text-base ${
                    c === category
                      ? "bg-chili font-extrabold"
                      : "bg-surface text-sand font-semibold"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className={label}>Etiqueta (opcional)</span>
            <input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Ej. Paquete"
              className={field}
            />
          </label>
          <div className="bg-surface flex min-h-16 items-center justify-between rounded-[14px] px-4">
            <span className="text-[17px] font-extrabold">Disponible hoy</span>
            <Toggle
              checked={available}
              onChange={setAvailable}
              label="Disponible hoy"
            />
          </div>
        </div>
        <div className="px-5 pt-4 pb-8">
          <button
            type="submit"
            disabled={!valid}
            className="bg-gold text-ink h-15 w-full rounded-2xl text-lg font-black disabled:opacity-40"
          >
            Guardar producto
          </button>
        </div>
      </form>
    </Screen>
  );
};
