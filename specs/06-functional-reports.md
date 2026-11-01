# SPEC 06 — Reportes funcionales

> **Estado:** Aprobado.
> **Depende de:** SPEC 05
> **Fecha:** 2026-11-01
> **Objetivo:** Reemplazar los datos de ejemplo de `ReportsScreen` por métricas calculadas con las ventas guardadas en Firestore, para los periodos Hoy, Semana, Mes y Rango.

## Por qué existe esta spec

SPEC 05 dejó de guardar ventas pero `ReportsScreen` sigue mostrando números fijos (`$8,420`, `41 tickets`, salsas y canales de ejemplo). Ahora que cada venta confirmada queda en `sales` con su snapshot de líneas, salsas, descuentos y pago, los reportes pueden calcularse solos y crecer con los datos que se vayan cargando. No hace falta ningún dato nuevo: todo sale de `sales`.

## Alcance

**Dentro:**

- Calcular todo `ReportsScreen` desde la colección `sales` (SPEC 05); se eliminan los arreglos de ejemplo (`hours`, `topProducts`, `sauces`, `channelSales` y los textos fijos).
- Selector de periodo con cuatro opciones, por calendario y hora local del dispositivo (corte a medianoche):
  - **Hoy:** hoy 00:00 a 24:00.
  - **Semana:** del lunes de la semana actual hasta hoy.
  - **Mes:** del día 1 del mes actual hasta hoy.
  - **Rango:** dos fechas (`desde`, `hasta`, ambas incluidas) elegidas con campos de fecha; por defecto hoy y hoy; máximo 92 días.
- Comparación con el periodo anterior equivalente, en la tarjeta de ventas:
  - Hoy contra el mismo día de la semana pasada.
  - Semana contra la semana anterior hasta el mismo día de la semana.
  - Mes contra el mes anterior hasta el mismo día del mes (acotado a la longitud de ese mes).
  - Rango contra el periodo inmediatamente anterior de igual duración.
  - Sin ventas en el periodo anterior no se muestra porcentaje.
- Tarjeta de ventas: total vendido, número de tickets y ticket promedio (total / tickets, redondeado; 0 si no hay tickets).
- Gráfica de barras:
  - Hoy: "Ventas por hora", una barra por hora entre una hora antes de la primera venta y una hora después de la última (límites 0–23), pico resaltado y texto "Pico HH:00".
  - Semana, Mes y Rango: "Ventas por día", una barra por día del periodo, mejor día resaltado y texto "Pico {día}".
- "Más vendidos": productos y combos juntos, top 5 por cantidad vendida, agrupados por `kind` + `itemId` y mostrando el nombre guardado en la venta más reciente.
- "Salsas más pedidas": cada salsa elegida (incluida o extra) cuenta 1 por unidad vendida (cantidad de la línea × veces elegida); porcentaje sobre el total de salsas servidas; se muestran las 6 primeras. Se ignora el nombre `salsa eliminada`.
- "Por canal": los cuatro canales de `channels` (`src/data/mock.ts`) siempre visibles con `monto · tickets`, aunque sean `$0 · 0`; cualquier otro canal guardado se añade debajo.
- "Descuentos" (reemplaza "Cancelaciones y descuentos"): número de tickets con algún descuento y monto total ahorrado (suma de `saving` de las líneas más `saleSaving`).
- Nuevo módulo puro `src/lib/reports.ts` con el cálculo de rangos y de todas las métricas, sin Firestore ni React.
- Nuevo hook `src/hooks/useSalesRange.ts` que lee `sales` por rango de `createdAt`, con `loading`, `error` y `retry`. En vivo (`onSnapshot`) solo para el periodo actual de Hoy; lectura única (`getDocs`) para todo lo demás, incluida la comparación.
- Estados de pantalla: carga, error con `ErrorBanner` y reintento, y periodo sin ventas (tarjetas en cero y mensaje "Sin ventas en este periodo").

**Fuera de alcance (specs futuras):**

- Cancelaciones, anulaciones y devoluciones de ventas (el mockup las mostraba; hoy no existen).
- Totales pre-agregados por día en Firestore o Cloud Functions.
- Reporte por método de pago, por hora en periodos largos, por usuario o por turno.
- Conectar `ShiftCloseScreen` y la pestaña Pedidos a las ventas reales; siguen con datos de ejemplo.
- Exportar a CSV o PDF, imprimir reportes y gráficas de tendencia.
- Reportes de inventario, costos o utilidad.
- Zona horaria configurable o corte de día por turno.
- Firebase Auth y reglas de seguridad por usuario.

## Modelo de datos

Esta spec no crea colecciones ni cambia documentos. Lee `sales` (`Sale`, SPEC 05) sin modificarla.

Tipos nuevos en `src/lib/reports.ts`:

```ts
export type Period = "Hoy" | "Semana" | "Mes" | "Rango";

export interface DateRange {
  start: Date; // inclusive
  end: Date; // exclusive
}

export interface PeriodRanges {
  current: DateRange;
  previous: DateRange;
}

// Una venta tal como la consume el cálculo (createdAt ya convertido a Date).
export type ReportSale = Pick<
  Sale,
  "channel" | "lines" | "saleSaving" | "total"
> & { createdAt: Date };

export interface Bucket {
  label: string; // "14" (hora) o "28" (día del mes)
  title: string; // "20:00" o "28 oct", para el pico
  total: number;
  peak: boolean;
}

export interface Report {
  total: number;
  tickets: number;
  average: number;
  bucketUnit: "hour" | "day";
  buckets: Bucket[];
  topItems: { key: string; name: string; qty: number; pct: number }[]; // pct relativo al primero
  sauces: { name: string; count: number; pct: number }[]; // pct sobre el total de salsas
  channels: { channel: string; total: number; tickets: number }[];
  discounts: { tickets: number; amount: number };
}

export interface Comparison {
  previousTotal: number;
  changePct: number | null; // null si previousTotal es 0
}
```

Funciones públicas de `reports.ts`:

```ts
export const getPeriodRanges: (
  period: Period,
  now: Date,
  custom?: { from: Date; to: Date }, // días calendario inclusivos, solo Rango
) => PeriodRanges | null; // null si Rango es inválido (desde > hasta o > 92 días)

export const buildReport: (
  sales: ReportSale[],
  range: DateRange,
  period: Period,
) => Report;
export const compare: (
  currentTotal: number,
  previousSales: ReportSale[],
) => Comparison;
```

Hook en `src/hooks/useSalesRange.ts`:

```ts
// Lee sales con where("createdAt", ">=", start) y where("createdAt", "<", end).
// Un solo campo, sin índice compuesto. Estado: { sales, loading, error, retry }.
export const useSalesRange: (range: DateRange | null, live: boolean) => State;
```

Convenciones:

- Semana empieza en lunes.
- Todas las fechas se calculan con la hora local del dispositivo; `createdAt` se convierte con `toDate()`. Con `onSnapshot` se lee con `serverTimestamps: "estimate"` para que una venta recién creada y aún no confirmada por el servidor no llegue con `createdAt` nulo.
- Los importes son enteros (convención de `money`); el porcentaje de cambio se redondea a entero.
- Un ticket es un documento de `sales`; el total vendido es la suma de `Sale.total` (ya con descuentos y extras).
- Empates en rankings se desempatan por nombre.
- Textos y nombres de productos, combos y salsas se muestran con `uppercase`, igual que en el resto de la app.

## Plan de implementación

1. Crear `src/lib/reports.ts` con los tipos, `getPeriodRanges`, `buildReport` y `compare`, y `src/lib/reports.test.ts` con casos de: rangos de cada periodo y de su periodo anterior (incluido un mes que termina en día 31 contra uno de 30 días), Rango inválido, totales y ticket promedio, barras por hora y por día con pico, ranking de más vendidos con combos, conteo de salsas por cantidad e ignorar `salsa eliminada`, canales fijos más canal extra, descuentos y `changePct` nulo con periodo anterior en cero. Nada lo usa todavía. Verificación: `npx vitest run src/lib/reports.test.ts`.
2. Crear `src/hooks/useSalesRange.ts` (`getDocs` o `onSnapshot` según `live`, `loading`, `error`, `retry`, `range` nulo = sin consulta). Verificación: con una venta real en `sales`, ver en consola del navegador que el hook devuelve esa venta para el rango de hoy; la pantalla todavía no cambia.
3. Reescribir la parte superior de `ReportsScreen`: selector de periodo con campos `desde` / `hasta` en Rango, llamada al hook para el periodo actual y el anterior, `buildReport` y `compare`, tarjeta de ventas (total, comparación, tickets, ticket promedio) y gráfica por hora o por día, con estados de carga, error y sin ventas. Las demás tarjetas siguen con los datos de ejemplo hasta el paso 4. Verificación: confirmar una venta de $110 y ver `$110`, 1 ticket y barra de la hora actual en Hoy.
4. Conectar las tarjetas restantes de `ReportsScreen` a `Report`: "Más vendidos", "Salsas más pedidas", "Por canal" y "Descuentos"; eliminar los arreglos de ejemplo. Verificación: vender un combo con 2 salsas y ver combo, salsas y canal en sus tarjetas.
5. Añadir `src/screens/ReportsScreen.test.tsx` mockeando `@/hooks/useSalesRange` (periodo Hoy con ventas, sin ventas, error con reintento, cambio de periodo y Rango inválido), actualizar `App.test.tsx` si hace falta; correr `npm run typecheck`, `npm run lint` y `npm test`.

## Criterios de aceptación

- [ ] Con la colección `sales` vacía, `ReportsScreen` muestra `$0`, 0 tickets, ticket promedio `$0` y el mensaje "Sin ventas en este periodo", sin ningún dato de ejemplo.
- [ ] Tras confirmar una venta de $110 en efectivo por Mostrador, Hoy muestra total `$110`, 1 ticket y ticket promedio `$110` sin recargar la página.
- [ ] Dos ventas de $100 y $50 dan total `$150`, 2 tickets y ticket promedio `$75`.
- [ ] En Hoy la gráfica muestra barras por hora, resalta la hora con más ventas y el texto "Pico HH:00" coincide con ella.
- [ ] En Semana, Mes y Rango la gráfica se titula "Ventas por día" y muestra una barra por día; el día con más ventas queda resaltado y se indica en "Pico".
- [ ] Semana abarca desde el lunes de la semana actual; una venta del domingo anterior no cuenta.
- [ ] Mes abarca desde el día 1 del mes actual; una venta del último día del mes anterior no cuenta.
- [ ] En Rango, al elegir `desde` mayor que `hasta` o más de 92 días, se muestra un aviso y no se hace ninguna consulta.
- [ ] En Rango, una venta en la fecha `hasta` cuenta (la fecha final es inclusiva).
- [ ] La comparación de Hoy usa el mismo día de la semana anterior: con $100 hoy y $80 el miércoles pasado muestra `+25%`.
- [ ] Si la comparación es negativa se muestra en color de alerta con el signo `−`; si el periodo anterior vendió $0 no se muestra porcentaje.
- [ ] La comparación de Mes el día 31 contra un mes anterior de 30 días compara hasta el día 30 sin error.
- [ ] "Más vendidos" muestra como máximo 5 elementos ordenados por cantidad, mezcla productos y combos, y la barra del primero ocupa el 100%.
- [ ] Un combo vendido 2 veces aparece como un solo elemento con cantidad 2, no por sus componentes.
- [ ] "Salsas más pedidas": una línea de cantidad 2 con salsa incluida `bbq` y extra `bbq` suma 4 a `bbq`; los porcentajes se calculan sobre el total de salsas y se muestran como máximo 6.
- [ ] Una salsa con nombre `salsa eliminada` no aparece en "Salsas más pedidas" ni cuenta en el total de porcentajes.
- [ ] "Por canal" siempre lista Mostrador, Llevar, WhatsApp y Domicilio con `monto · tickets`, y un canal guardado fuera de esa lista aparece debajo.
- [ ] "Descuentos" muestra el número de tickets con descuento y el monto ahorrado: una venta con un ahorro de $20 en una línea y $10 de promo de venta da `1 · −$30`.
- [ ] Ya no existe el texto "Cancelaciones" en la pantalla.
- [ ] Hoy se actualiza en vivo al confirmar una venta desde otro dispositivo, en menos de 3 s, sin recargar; Semana, Mes y Rango se leen al cambiar de periodo o al reintentar.
- [ ] Mientras carga se muestra un estado de carga; si la consulta falla se muestra el `ErrorBanner` y "Reintentar" vuelve a consultar.
- [ ] Con la red cortada, los periodos ya consultados cargan desde la caché de Firestore.
- [ ] `grep` no encuentra `$8,420`, `topProducts` ni `channelSales` en `src/screens/ReportsScreen.tsx`.
- [ ] `ShiftCloseScreen` y Pedidos no cambian.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** calendario actual para los periodos, con comparación contra el periodo equivalente. Es lo que muestra el mockup ("vs. miércoles pasado") y es más intuitivo que ventanas móviles para un negocio que cierra por día y semana.
- **Sí:** consulta por rango sobre `createdAt` y suma en el cliente. Con las ventas de un restaurante (cientos al mes) es barato, no necesita índices compuestos ni cambiar la transacción de SPEC 05.
- **Sí:** `onSnapshot` solo para el periodo actual de Hoy; lectura única para el resto. Lo que se mira durante el servicio se mantiene al día y los periodos largos no pagan lecturas continuas.
- **Sí:** cálculo en el módulo puro `reports.ts`. Toda la regla de negocio de los reportes se prueba sin Firestore ni React, como `pricing.ts` y `buildSale`.
- **Sí:** corte de día a medianoche en hora local del dispositivo. Es lo esperable para quien abre en la tarde y cierra de noche, y evita un ajuste de horarios.
- **Sí:** Hoy por hora y los demás por día. Mezclar horas de muchos días sirve para ver picos pero no tendencia.
- **Sí:** barras por hora entre la primera y la última venta con una hora de margen. No obliga a un horario fijo y no pierde ventas fuera de él.
- **Sí:** "Más vendidos" mezcla productos y combos y un combo cuenta como 1. Refleja lo que el cajero vendió, sin repartir ventas entre componentes.
- **Sí:** las salsas cuentan por unidad vendida, incluidas y extras juntas. Mide cuál prefiere la gente, que es la pregunta del reporte.
- **Sí:** los cuatro canales siempre visibles. La tarjeta no cambia de tamaño entre días.
- **Sí:** renombrar a "Descuentos". Sin función de cancelaciones, mostrarlas sería un dato inventado.
- **Sí:** Rango limitado a 92 días. Acota las lecturas de Firestore de una sola consulta.
- **Sí:** el nombre en pantalla es el guardado en la venta. Renombrar o borrar un producto después no cambia los reportes pasados, igual que el ticket.
- **No:** totales pre-agregados por día. Lecturas mínimas, pero obligan a cambiar la transacción de ventas y a migrar ventas ya guardadas; se revisa si el volumen lo pide.
- **No:** Cloud Functions. El proyecto no tiene backend y no se necesita para este volumen.
- **No:** conectar `ShiftCloseScreen` ni Pedidos. Cada uno tiene su propia lógica (caja, retiros, estados de pedido) y merece su spec.
- **No:** horario de corte por turno. Se pidió por día calendario.
- **No:** mostrar cancelaciones en 0. Un dato fijo que parece real confunde.

## Riesgos

| Riesgo                                                                                          | Mitigación                                                                                                |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Un Mes o Rango con muchas ventas lee muchos documentos y tarda o cuesta                         | Lectura única fuera de Hoy, Rango máximo de 92 días y revisión de pre-agregados si el volumen crece       |
| Dispositivos con zona horaria u hora mal configuradas mueven ventas de día                      | Se usa la hora local del dispositivo (decisión explícita); un reloj incorrecto desplaza el corte          |
| Una venta recién creada llega al reporte con `createdAt` nulo antes de que el servidor responda | Lectura con `serverTimestamps: "estimate"` en `onSnapshot`                                                |
| La comparación mezcla un periodo parcial con uno completo                                       | El periodo anterior se acota al mismo día de la semana o del mes, y el mes corto se recorta a su longitud |
| Ventas guardadas antes de SPEC 05 (sin folio o sin campos nuevos) distorsionan los totales      | No existen ventas previas a SPEC 05; un documento sin `lines` o `total` se ignora en el cálculo           |
| Cambiar el nombre de un canal en `channels` deja ventas viejas con el nombre anterior           | Cualquier canal guardado fuera de la lista aparece como fila extra en "Por canal"                         |
| Las reglas abiertas de Firestore vencen el 30-nov-2026 y la app deja de leer o escribir         | La spec de Auth debe reemplazarlas antes de esa fecha                                                     |

## Lo que **no** está en esta spec

- Cancelaciones, anulaciones y devoluciones.
- Totales pre-agregados, Cloud Functions o cambios al documento de venta.
- Cierre de turno y Pedidos con datos reales.
- Exportar o imprimir reportes, tendencias y reportes de costos o utilidad.
- Zona horaria configurable o corte de día por turno.
- Firebase Auth o reglas por usuario.
