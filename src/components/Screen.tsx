import type { ReactNode } from "react";

export const Screen = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-ink mx-auto flex min-h-dvh w-full max-w-md flex-col ${className}`}
  >
    {children}
  </div>
);

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}

export const Header = ({ title, subtitle, onBack, action }: HeaderProps) => (
  <header className="flex items-center gap-1 px-3 pt-4 pb-3">
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="grid size-12 place-items-center text-2xl font-bold"
      >
        ←
      </button>
    )}
    <div className={`flex flex-1 flex-col ${onBack ? "" : "px-2"}`}>
      <h1 className="text-2xl font-black tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted text-[15px]">{subtitle}</p>}
    </div>
    {action}
  </header>
);
