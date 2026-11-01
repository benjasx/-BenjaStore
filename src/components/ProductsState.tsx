export const ProductsSkeleton = ({ rows }: { rows: number }) =>
  Array.from({ length: rows }, (_, i) => (
    <div
      key={i}
      aria-hidden
      className="bg-surface h-19 animate-pulse rounded-[18px]"
    />
  ));

export const ErrorBanner = ({
  onRetry,
  message = "No se pudieron cargar los productos.",
}: {
  onRetry: () => void;
  message?: string;
}) => (
  <div
    role="alert"
    className="bg-surface mx-5 mb-3 flex items-center justify-between gap-3 rounded-[14px] px-4 py-3"
  >
    <span className="text-salmon text-[15px] font-bold">{message}</span>
    <button
      type="button"
      onClick={onRetry}
      className="bg-gold text-ink h-11 shrink-0 rounded-xl px-4 text-base font-extrabold"
    >
      Reintentar
    </button>
  </div>
);
