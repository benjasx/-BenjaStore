import { useState } from "react";
import { Toggle } from "@/components/Toggle";
import { money } from "@/data/mock";
import type { Sauce, SauceInput } from "@/hooks/useSauces";

interface Props {
  sauces: Sauce[];
  onCreate: (input: SauceInput) => void;
  onUpdate: (id: string, input: SauceInput) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

const field =
  "bg-surface-2 border-line focus:border-gold rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";
const label = "text-muted text-[15px] font-semibold";

interface FormProps {
  sauce?: Sauce;
  onSave: (input: SauceInput) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const SauceForm = ({ sauce, onSave, onDelete, onCancel }: FormProps) => {
  const [name, setName] = useState(sauce?.name ?? "");
  const [extraPrice, setExtraPrice] = useState(
    sauce ? String(sauce.extraPrice) : "0",
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const price = Number(extraPrice);
  const valid =
    !!name.trim() &&
    extraPrice !== "" &&
    Number.isInteger(price) &&
    price >= 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ name, extraPrice: price });
      }}
      className="bg-surface flex flex-col gap-3 rounded-[14px] p-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className={label}>Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre de la salsa"
          className={`${field} h-11 uppercase`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Precio como extra</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={extraPrice}
          onChange={(e) => setExtraPrice(e.target.value)}
          aria-label="Precio como extra"
          className={`${field} h-11 tabular-nums`}
        />
      </label>
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
            Eliminar salsa
          </button>
        ))}
    </form>
  );
};

export const SauceEditor = ({
  sauces,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
}: Props) => {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="mx-5 mb-3 flex flex-col gap-2.5">
      {editing === "new" ? (
        <SauceForm
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
          + Salsa
        </button>
      )}
      {sauces.length === 0 && (
        <p className="text-muted text-[15px]">Sin salsas todavía.</p>
      )}
      {sauces.map((s) => (
        <div key={s.id} className="flex flex-col gap-2">
          <div
            className={`bg-surface flex items-center gap-2 rounded-[14px] p-2 pl-3.5 ${s.enabled ? "" : "opacity-60"}`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-extrabold uppercase">
                {s.name}
              </span>
              <span className="text-muted text-[15px]">
                Extra {money(s.extraPrice)}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Editar ${s.name}`}
              onClick={() => setEditing(editing === s.id ? null : s.id)}
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
              checked={s.enabled}
              onChange={(v) => onToggle(s.id, v)}
              label={`Habilitada: ${s.name}`}
            />
          </div>
          {editing === s.id && (
            <SauceForm
              sauce={s}
              onSave={(input) => {
                onUpdate(s.id, input);
                setEditing(null);
              }}
              onDelete={() => {
                onDelete(s.id);
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
