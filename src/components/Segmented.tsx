interface Props<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: Props<T>) => (
  <div
    className="bg-surface grid gap-1 rounded-[14px] p-1"
    style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
  >
    {options.map((o) => (
      <button
        key={o}
        type="button"
        onClick={() => onChange(o)}
        className={`h-11 rounded-[10px] text-[15px] ${
          o === value
            ? "bg-cream text-ink font-extrabold"
            : "text-sand font-semibold"
        }`}
      >
        {o}
      </button>
    ))}
  </div>
);
