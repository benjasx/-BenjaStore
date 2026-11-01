import { money } from "@/data/mock";
import { formatFolio, type Sale } from "@/lib/sales";

interface Props {
  sale: Sale;
  onClose: () => void;
}

const row = "flex justify-between gap-3";

export const TicketSheet = ({ sale, onClose }: Props) => (
  <div className="fixed inset-0 z-20 flex flex-col items-center justify-end lg:justify-center">
    <div className="no-print absolute inset-0 bg-[rgba(8,5,4,0.72)]" />
    <div
      role="dialog"
      aria-label={`Ticket #${formatFolio(sale.folio)}`}
      className="relative flex max-h-[92dvh] w-full max-w-md flex-col gap-4 rounded-t-[28px] bg-[#f6ead2] px-5 pt-5 pb-6 text-[#17110f] lg:rounded-[28px]"
    >
      <div className="ticket-print flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto text-[15px]">
        <div className="flex flex-col items-center gap-0.5 border-b border-dashed border-current pb-3">
          <h2 className="text-2xl font-black">
            Ticket #{formatFolio(sale.folio)}
          </h2>
          <span>{sale.createdAt.toDate().toLocaleString("es-MX")}</span>
          <span className="font-bold">{sale.channel}</span>
        </div>
        <div className="flex flex-col gap-2.5 border-b border-dashed border-current pb-3">
          {sale.lines.map((line, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className={`${row} font-extrabold`}>
                <span className="uppercase">
                  {line.qty}× {line.name}
                </span>
                <span className="tabular-nums">
                  {money(line.gross - line.saving + line.extras)}
                </span>
              </div>
              {line.contents && <span>{line.contents}</span>}
              {line.sauces && line.sauces.included.length > 0 && (
                <span className="uppercase">
                  Salsa: {line.sauces.included.join(", ")}
                </span>
              )}
              {line.sauces && line.sauces.extra.length > 0 && (
                <div className={row}>
                  <span className="uppercase">
                    Extra: {line.sauces.extra.map((e) => e.name).join(", ")}
                  </span>
                  <span className="tabular-nums">+{money(line.extras)}</span>
                </div>
              )}
              {line.saving > 0 && (
                <div className={row}>
                  <span className="uppercase">{line.promotionName}</span>
                  <span className="tabular-nums">−{money(line.saving)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <div className={row}>
            <span>Subtotal</span>
            <span className="tabular-nums">{money(sale.subtotal)}</span>
          </div>
          {sale.saleSaving > 0 && (
            <div className={row}>
              <span className="uppercase">{sale.saleName}</span>
              <span className="tabular-nums">−{money(sale.saleSaving)}</span>
            </div>
          )}
          <div className={`${row} text-xl font-black`}>
            <span>Total</span>
            <span className="tabular-nums">{money(sale.total)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t border-dashed border-current pt-3">
          <div className={row}>
            <span>Pago</span>
            <span className="font-bold">{sale.paymentMethod}</span>
          </div>
          {sale.reference && (
            <div className={row}>
              <span>Folio transacción</span>
              <span className="font-bold">{sale.reference}</span>
            </div>
          )}
          {sale.received !== undefined && (
            <div className={row}>
              <span>Recibido</span>
              <span className="tabular-nums">{money(sale.received)}</span>
            </div>
          )}
          {sale.change !== undefined && (
            <div className={row}>
              <span>Cambio</span>
              <span className="tabular-nums">{money(sale.change)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="no-print grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="h-14 rounded-2xl bg-[#17110f] text-lg font-extrabold text-[#f6ead2]"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-14 rounded-2xl bg-[#d42c1f] text-lg font-black text-[#f6ead2]"
        >
          Nueva venta
        </button>
      </div>
    </div>
  </div>
);
