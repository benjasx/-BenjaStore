import { useState, type SubmitEvent } from "react";
import { NameField } from "@/components/NameField";
import { Toggle } from "@/components/Toggle";
import type { Category } from "@/hooks/useCategories";

interface Props {
  categories: Category[];
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

const field =
  "bg-surface border-line focus:border-gold h-11 min-w-0 flex-1 rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";
const arrow =
  "bg-surface-3 grid size-11 shrink-0 place-items-center rounded-xl text-lg disabled:opacity-30";

export const CategoryEditor = ({
  categories,
  onCreate,
  onRename,
  onToggle,
  onMove,
}: Props) => {
  const [name, setName] = useState("");

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name);
    setName("");
  };

  return (
    <div className="mx-5 mb-3 flex flex-col gap-2.5">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría"
          aria-label="Nueva categoría"
          className={field}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="bg-gold text-ink h-11 shrink-0 rounded-xl px-4 text-base font-extrabold disabled:opacity-40"
        >
          Agregar
        </button>
      </form>
      {categories.map((c, i) => (
        <div
          key={c.id}
          className={`bg-surface flex items-center gap-2 rounded-[14px] p-2 ${c.enabled ? "" : "opacity-60"}`}
        >
          <NameField
            name={c.name}
            onRename={(next) => onRename(c.id, next)}
            className="flex min-w-0 flex-1 items-center gap-1 pl-1.5"
            textClassName="text-base font-semibold"
          />
          <button
            type="button"
            aria-label={`Subir ${c.name}`}
            disabled={i === 0}
            onClick={() => onMove(c.id, -1)}
            className={arrow}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Bajar ${c.name}`}
            disabled={i === categories.length - 1}
            onClick={() => onMove(c.id, 1)}
            className={arrow}
          >
            ↓
          </button>
          <Toggle
            checked={c.enabled}
            onChange={(v) => onToggle(c.id, v)}
            label={`Habilitada: ${c.name}`}
          />
        </div>
      ))}
    </div>
  );
};
