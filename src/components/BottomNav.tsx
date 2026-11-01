import type { ReactNode } from "react";

export type NavTab =
  "pos" | "orders" | "inventory" | "reports" | "sales" | "more";

const icons: Record<NavTab, ReactNode> = {
  pos: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  orders: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  inventory: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  reports: (
    <>
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </>
  ),
  sales: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
};

const tabs: { id: NavTab; label: string }[] = [
  { id: "pos", label: "Vender" },
  { id: "orders", label: "Pedidos" },
  { id: "inventory", label: "Inventario" },
  { id: "reports", label: "Reportes" },
  { id: "sales", label: "Ventas" },
  { id: "more", label: "Más" },
];

interface Props {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

export const BottomNav = ({ active, onChange }: Props) => (
  <nav className="border-line-soft bg-ink-deep grid h-20 shrink-0 grid-cols-6 border-t px-1 pt-2 pb-5 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:h-auto lg:w-56 lg:flex-col lg:content-start lg:gap-1 lg:border-t-0 lg:border-r lg:p-3">
    <img
      src="/logo_solo.jpeg"
      alt="Doble Tentación"
      className="mx-auto mt-2 mb-6 hidden size-16 rounded-full object-cover lg:block"
    />
    {tabs.map(({ id, label }) => {
      const on = id === active;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex flex-col items-center justify-center gap-1 lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 ${on ? "text-gold lg:bg-surface" : "text-muted"}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={on ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {icons[id]}
          </svg>
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
