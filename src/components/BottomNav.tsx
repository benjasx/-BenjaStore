export type NavTab = "pos" | "orders" | "inventory" | "reports" | "more";

const tabs: { id: NavTab; label: string }[] = [
  { id: "pos", label: "Vender" },
  { id: "orders", label: "Pedidos" },
  { id: "inventory", label: "Inventario" },
  { id: "reports", label: "Reportes" },
  { id: "more", label: "Más" },
];

interface Props {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

export const BottomNav = ({ active, onChange }: Props) => (
  <nav className="border-line-soft bg-ink-deep grid h-20 shrink-0 grid-cols-5 border-t px-1 pt-2 pb-5">
    {tabs.map(({ id, label }) => {
      const on = id === active;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex flex-col items-center justify-center gap-1 ${on ? "text-gold" : "text-muted"}`}
        >
          <span
            className={`size-[22px] rounded-[7px] ${on ? "bg-gold" : "border-muted border-2"}`}
          />
          <span
            className={`text-[13px] ${on ? "font-extrabold" : "font-semibold"}`}
          >
            {label}
          </span>
        </button>
      );
    })}
  </nav>
);
