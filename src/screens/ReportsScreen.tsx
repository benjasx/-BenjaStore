import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Header, Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";

const periods = ["Hoy", "Semana", "Mes", "Rango"] as const;
const hours = [18, 30, 24, 20, 46, 72, 100, 84, 40];
const peakHour = 6;
const topProducts = [
  { name: "6 Alitas", qty: 24, pct: 100 },
  { name: "10 Boneless", qty: 17, pct: 71 },
  { name: "10 Alitas", qty: 13, pct: 54 },
  { name: "Papas a la francesa", qty: 11, pct: 46 },
];
const sauces = [
  "Búfalo 31%",
  "Mango Habanero 22%",
  "BBQ 19%",
  "Adobo Lemon Pepper 12%",
  "Casera 9%",
  "Ranch 7%",
];
const channelSales = [
  ["Mostrador", "$4,630 · 23"],
  ["Para llevar", "$1,940 · 9"],
  ["WhatsApp", "$1,210 · 6"],
  ["A domicilio", "$640 · 3"],
];

const card = "flex flex-col gap-3 rounded-[18px] bg-surface p-[18px]";

export const ReportsScreen = ({
  onNavigate,
}: {
  onNavigate: (tab: NavTab) => void;
}) => {
  const [period, setPeriod] = useState<(typeof periods)[number]>("Hoy");

  return (
    <Screen>
      <div className="flex flex-col gap-3.5 pb-3.5">
        <Header title="Reportes" />
        <div className="px-5">
          <Segmented options={periods} value={period} onChange={setPeriod} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-6">
        <section className={`${card} gap-3.5`}>
          <div className="flex flex-col gap-0.5">
            <p className="text-muted text-[15px] font-semibold">
              Ventas · miércoles 28 oct
            </p>
            <p className="font-marker text-gold text-5xl leading-[1.1]">
              $8,420
            </p>
            <p className="text-ok text-[15px] font-bold">
              +12% vs. miércoles pasado ($7,510)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ["Tickets", "41"],
              ["Ticket promedio", "$205"],
            ].map(([label, value]) => (
              <div key={label} className="bg-ink rounded-xl p-3">
                <p className="text-muted text-sm">{label}</p>
                <p className="text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <section className={`${card} gap-3.5`}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-extrabold">Ventas por hora</h2>
            <span className="text-muted text-sm">Pico 20:00</span>
          </div>
          <div className="grid h-30 grid-cols-9 items-end gap-1.5">
            {hours.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`rounded ${i === peakHour ? "bg-gold" : "bg-surface-3"}`}
              />
            ))}
          </div>
          <div className="text-muted grid grid-cols-9 gap-1.5 text-center font-mono text-xs">
            {hours.map((_, i) => (
              <span key={i} className={i === peakHour ? "text-gold" : ""}>
                {14 + i}
              </span>
            ))}
          </div>
        </section>
        <section className={card}>
          <h2 className="text-[17px] font-extrabold">Más vendidos</h2>
          {topProducts.map((p) => (
            <div key={p.name} className="flex flex-col gap-[5px]">
              <div className="flex justify-between text-base">
                <span>{p.name}</span>
                <span className="font-extrabold">{p.qty}</span>
              </div>
              <div className="bg-ink h-2 rounded">
                <div
                  className="bg-chili h-full rounded"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
            </div>
          ))}
        </section>
        <section className={card}>
          <h2 className="text-[17px] font-extrabold">Salsas más pedidas</h2>
          <div className="flex flex-wrap gap-2">
            {sauces.map((s, i) => (
              <span
                key={s}
                className={`flex h-10 items-center rounded-full px-3.5 text-[15px] ${
                  i === 0
                    ? "bg-gold text-ink font-extrabold"
                    : "bg-surface-3 font-bold"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
        <section className={`${card} tabular-nums`}>
          <h2 className="text-[17px] font-extrabold">Por canal</h2>
          {channelSales.map(([label, value]) => (
            <div key={label} className="flex justify-between text-base">
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>
        <div className="border-line flex h-14 items-center justify-between rounded-[14px] border-[1.5px] px-[18px] text-base font-bold">
          <span>Cancelaciones y descuentos</span>
          <span className="text-salmon">2 · −$140</span>
        </div>
      </div>
      <BottomNav active="reports" onChange={onNavigate} />
    </Screen>
  );
};
