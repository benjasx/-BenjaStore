interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const Toggle = ({ checked, onChange, label }: Props) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative h-[30px] w-[52px] shrink-0 rounded-full ${checked ? "bg-ok" : "bg-surface-3"}`}
  >
    <span
      className={`absolute top-[3px] size-6 rounded-full ${checked ? "bg-cream right-[3px]" : "bg-faint left-[3px]"}`}
    />
  </button>
);
