import { Segmented } from "@/components/Segmented";
import { MAX_RANGE_DAYS, type Period } from "@/lib/reports";

const periods: readonly Period[] = ["Hoy", "Semana", "Mes", "Rango"];

const dateField =
  "bg-surface border-line focus:border-gold h-12 rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";

interface Props {
  period: Period;
  onPeriod: (period: Period) => void;
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  invalid: boolean;
}

export const PeriodPicker = ({
  period,
  onPeriod,
  from,
  to,
  onFrom,
  onTo,
  invalid,
}: Props) => (
  <>
    <div className="px-5">
      <Segmented options={periods} value={period} onChange={onPeriod} />
    </div>
    {period === "Rango" && (
      <div className="grid grid-cols-2 gap-2.5 px-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-[15px] font-semibold">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
            aria-label="Desde"
            className={dateField}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-[15px] font-semibold">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onTo(e.target.value)}
            aria-label="Hasta"
            className={dateField}
          />
        </label>
      </div>
    )}
    {period === "Rango" && invalid && (
      <p role="alert" className="text-salmon px-5 text-[15px] font-bold">
        Elige un rango válido de hasta {MAX_RANGE_DAYS} días.
      </p>
    )}
  </>
);
