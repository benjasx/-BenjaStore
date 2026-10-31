import { useRef, useState } from "react";

interface Props {
  name: string;
  onRename: (name: string) => void;
  className: string;
  textClassName: string;
}

export const NameField = ({
  name,
  onRename,
  className,
  textClassName,
}: Props) => {
  const [editing, setEditing] = useState(false);
  const cancelled = useRef(false);

  if (!editing) {
    return (
      <div className={className}>
        <span className={`truncate uppercase ${textClassName}`}>{name}</span>
        <button
          type="button"
          aria-label={`Editar nombre de ${name}`}
          onClick={() => {
            cancelled.current = false;
            setEditing(true);
          }}
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
      </div>
    );
  }

  return (
    <input
      autoFocus
      defaultValue={name}
      aria-label={`Nombre de ${name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const next = e.currentTarget.value.trim();
        if (!cancelled.current && next && next !== name) onRename(next);
        setEditing(false);
      }}
      className="bg-surface border-line focus:border-gold h-11 min-w-0 flex-1 rounded-[14px] border-[1.5px] px-3.5 text-base uppercase outline-none"
    />
  );
};
