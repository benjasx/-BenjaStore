import { channels } from "@/data/mock";
import { MISSING_SAUCE_NAME } from "@/lib/pricing";
import type { Sale } from "@/lib/sales";

export type Period = "Hoy" | "Semana" | "Mes" | "Rango";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PeriodRanges {
  current: DateRange;
  previous: DateRange;
}

// Los campos opcionales solo los usa el PDF del reporte general.
export type ReportSale = Pick<
  Sale,
  "channel" | "lines" | "saleSaving" | "total"
> &
  Partial<Pick<Sale, "folio" | "paymentMethod" | "subtotal" | "seller">> & {
    createdAt: Date;
  };

export interface Bucket {
  label: string;
  title: string;
  total: number;
  peak: boolean;
}

export interface Report {
  total: number;
  tickets: number;
  average: number;
  bucketUnit: "hour" | "day";
  buckets: Bucket[];
  topItems: { key: string; name: string; qty: number; pct: number }[];
  sauces: { name: string; count: number; pct: number }[];
  channels: { channel: string; total: number; tickets: number }[];
  discounts: { tickets: number; amount: number };
}

export interface Comparison {
  previousTotal: number;
  changePct: number | null;
}

export const MAX_RANGE_DAYS = 92;
const TOP_ITEMS = 5;
const TOP_SAUCES = 6;
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const startOfDay = (date: Date) => addDays(date, 0);

export const shortDate = (date: Date) =>
  `${date.getDate()} ${MONTHS[date.getMonth()]}`;

const daysBetween = (start: Date, end: Date) =>
  Math.round(
    (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86_400_000,
  );

export const getPeriodRanges = (
  period: Period,
  now: Date,
  custom?: { from: Date; to: Date },
): PeriodRanges | null => {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  switch (period) {
    case "Hoy":
      return {
        current: { start: today, end: tomorrow },
        previous: { start: addDays(today, -7), end: addDays(tomorrow, -7) },
      };
    case "Semana": {
      const monday = addDays(today, -((today.getDay() + 6) % 7));
      return {
        current: { start: monday, end: tomorrow },
        previous: { start: addDays(monday, -7), end: addDays(tomorrow, -7) },
      };
    }
    case "Mes": {
      const prevMonthDays = new Date(
        today.getFullYear(),
        today.getMonth(),
        0,
      ).getDate();
      const prevEndDay = Math.min(today.getDate(), prevMonthDays);
      return {
        current: {
          start: new Date(today.getFullYear(), today.getMonth(), 1),
          end: tomorrow,
        },
        previous: {
          start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
          end: new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            prevEndDay + 1,
          ),
        },
      };
    }
    case "Rango": {
      const from = startOfDay(custom?.from ?? today);
      const to = startOfDay(custom?.to ?? today);
      const days = daysBetween(from, to) + 1;
      if (days < 1 || days > MAX_RANGE_DAYS) return null;
      return {
        current: { start: from, end: addDays(to, 1) },
        previous: { start: addDays(from, -days), end: from },
      };
    }
  }
};

const inRange = (sale: ReportSale, range: DateRange) =>
  sale.createdAt >= range.start && sale.createdAt < range.end;

const pad = (n: number) => String(n).padStart(2, "0");

const withPeak = (
  items: { label: string; title: string; total: number }[],
): Bucket[] => {
  const max = Math.max(0, ...items.map((i) => i.total));
  const peakIndex = max > 0 ? items.findIndex((i) => i.total === max) : -1;
  return items.map((item, i) => ({ ...item, peak: i === peakIndex }));
};

const hourBuckets = (sales: ReportSale[]): Bucket[] => {
  if (sales.length === 0) return [];
  const totals = new Map<number, number>();
  for (const s of sales) {
    const hour = s.createdAt.getHours();
    totals.set(hour, (totals.get(hour) ?? 0) + s.total);
  }
  const hours = [...totals.keys()];
  const first = Math.max(0, Math.min(...hours) - 1);
  const last = Math.min(23, Math.max(...hours) + 1);
  const items = [];
  for (let h = first; h <= last; h++) {
    items.push({
      label: String(h),
      title: `${pad(h)}:00`,
      total: totals.get(h) ?? 0,
    });
  }
  return withPeak(items);
};

const dayBuckets = (sales: ReportSale[], range: DateRange): Bucket[] => {
  const totals = new Map<number, number>();
  for (const s of sales) {
    const index = daysBetween(range.start, s.createdAt);
    totals.set(index, (totals.get(index) ?? 0) + s.total);
  }
  const days = daysBetween(range.start, range.end);
  const items = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(range.start, i);
    items.push({
      label: String(day.getDate()),
      title: shortDate(day),
      total: totals.get(i) ?? 0,
    });
  }
  return withPeak(items);
};

const byCountThenName = <T extends { name: string }>(
  a: T & { n: number },
  b: T & { n: number },
) => b.n - a.n || a.name.localeCompare(b.name);

export const rankItems = (allSales: ReportSale[], range: DateRange) => {
  const items = new Map<
    string,
    { name: string; qty: number; latest: number }
  >();
  for (const sale of allSales.filter((s) => inRange(s, range))) {
    const time = sale.createdAt.getTime();
    for (const line of sale.lines) {
      const key = `${line.kind}:${line.itemId}`;
      const item = items.get(key);
      if (!item) {
        items.set(key, { name: line.name, qty: line.qty, latest: time });
      } else {
        item.qty += line.qty;
        if (time >= item.latest) {
          item.name = line.name;
          item.latest = time;
        }
      }
    }
  }
  return [...items.entries()]
    .map(([key, i]) => ({ key, name: i.name, qty: i.qty, n: i.qty }))
    .sort(byCountThenName)
    .map(({ key, name, qty }) => ({ key, name, qty }));
};

export const hourlyBuckets = (
  allSales: ReportSale[],
  range: DateRange,
): { hour: number; total: number; tickets: number }[] => {
  const hours = new Map<number, { total: number; tickets: number }>();
  for (const sale of allSales.filter((s) => inRange(s, range))) {
    const hour = sale.createdAt.getHours();
    const entry = hours.get(hour) ?? { total: 0, tickets: 0 };
    entry.total += sale.total;
    entry.tickets += 1;
    hours.set(hour, entry);
  }
  return [...hours.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, v]) => ({ hour, ...v }));
};

export const buildReport = (
  allSales: ReportSale[],
  range: DateRange,
  period: Period,
): Report => {
  const sales = allSales.filter((s) => inRange(s, range));
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const tickets = sales.length;

  const sauceCounts = new Map<string, number>();
  const channelTotals = new Map<string, { total: number; tickets: number }>();
  for (const c of channels) channelTotals.set(c, { total: 0, tickets: 0 });
  let discountTickets = 0;
  let discountAmount = 0;

  for (const sale of sales) {
    let saved = sale.saleSaving;
    for (const line of sale.lines) {
      saved += line.saving;
      if (line.sauces) {
        const names = [
          ...line.sauces.included,
          ...line.sauces.extra.map((e) => e.name),
        ];
        for (const name of names) {
          if (name === MISSING_SAUCE_NAME) continue;
          // Una porción por selección de salsa: las piezas (qty) no la multiplican.
          sauceCounts.set(name, (sauceCounts.get(name) ?? 0) + 1);
        }
      }
    }
    if (saved > 0) {
      discountTickets += 1;
      discountAmount += saved;
    }
    const channel = channelTotals.get(sale.channel) ?? {
      total: 0,
      tickets: 0,
    };
    channel.total += sale.total;
    channel.tickets += 1;
    channelTotals.set(sale.channel, channel);
  }

  const ranked = rankItems(sales, range).slice(0, TOP_ITEMS);
  const topQty = ranked[0]?.qty ?? 0;

  const sauceTotal = [...sauceCounts.values()].reduce((a, b) => a + b, 0);
  const sauces = [...sauceCounts.entries()]
    .map(([name, count]) => ({ name, count, n: count }))
    .sort(byCountThenName)
    .slice(0, TOP_SAUCES)
    .map(({ name, count }) => ({
      name,
      count,
      pct: Math.round((count / sauceTotal) * 100),
    }));

  const known: string[] = [...channels];
  const extra = [...channelTotals.keys()]
    .filter((c) => !known.includes(c))
    .sort((a, b) => a.localeCompare(b));

  return {
    total,
    tickets,
    average: tickets > 0 ? Math.round(total / tickets) : 0,
    bucketUnit: period === "Hoy" ? "hour" : "day",
    buckets: period === "Hoy" ? hourBuckets(sales) : dayBuckets(sales, range),
    topItems: ranked.map(({ key, name, qty }) => ({
      key,
      name,
      qty,
      pct: Math.round((qty / topQty) * 100),
    })),
    sauces,
    channels: [...known, ...extra].map((channel) => ({
      channel,
      ...(channelTotals.get(channel) ?? { total: 0, tickets: 0 }),
    })),
    discounts: { tickets: discountTickets, amount: discountAmount },
  };
};

export const compare = (
  currentTotal: number,
  previousSales: ReportSale[],
): Comparison => {
  const previousTotal = previousSales.reduce((sum, s) => sum + s.total, 0);
  return {
    previousTotal,
    changePct:
      previousTotal === 0
        ? null
        : Math.round(((currentTotal - previousTotal) / previousTotal) * 100),
  };
};
