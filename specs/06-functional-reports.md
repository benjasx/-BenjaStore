# SPEC 06 — Reportes funcionales

> **Estado:** Aprobado.
> **Depende de:** SPEC 05
> **Fecha:** 2026-11-01
> **Objetivo:** Reemplazar los datos de ejemplo de `ReportsScreen` por métricas calculadas con las ventas guardadas en Firestore, para los periodos Hoy, Semana, Mes y Rango, y poder descargarlas en PDF con el vendedor de cada venta.

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
- "Salsas más pedidas": cada salsa elegida (incluida o extra) cuenta 1 por línea de venta, sin multiplicar por la cantidad (14 piezas con una salsa son 1 porción, no 14); porcentaje sobre el total de salsas servidas; se muestran las 6 primeras. Se ignora el nombre `salsa eliminada`.
- "Por canal": los cuatro canales de `channels` (`src/data/mock.ts`) siempre visibles con `monto · tickets`, aunque sean `$0 · 0`; cualquier otro canal guardado se añade debajo.
- "Descuentos" (reemplaza "Cancelaciones y descuentos"): número de tickets con algún descuento y monto total ahorrado (suma de `saving` de las líneas más `saleSaving`).
- Nuevo módulo puro `src/lib/reports.ts` con el cálculo de rangos y de todas las métricas, sin Firestore ni React.
- Nuevo hook `src/hooks/useSalesRange.ts` que lee `sales` por rango de `createdAt`, con `loading`, `error` y `retry`. En vivo (`onSnapshot`) solo para el periodo actual de Hoy; lectura única (`getDocs`) para todo lo demás, incluida la comparación.
- Estados de pantalla: carga, error con `ErrorBanner` y reintento, y periodo sin ventas (tarjetas en cero y mensaje "Sin ventas en este periodo").
- Descarga en PDF con `pdfmake` desde un botón "PDF" de `ReportsScreen` que abre un menú con cuatro reportes del periodo seleccionado (ampliación pedida por el usuario durante la implementación):
  - **Productos más vendidos:** ranking completo de productos y combos por cantidad.
  - **Ventas por hora:** total vendido en cada hora del día, sumando todos los días del periodo.
  - **Total de tickets:** número de tickets, total vendido, ticket promedio, tickets por canal y por método de pago.
  - **Reporte general:** todas las ventas del periodo, una por ticket, con folio, fecha y hora, vendedor, canal, método de pago, cada producto vendido (cantidad, nombre, salsas, extras, ahorro, importe) y el total del ticket, y el total general al final.
  - Todos los PDF llevan el logo (`/logo_letras.jpeg`), la fecha y hora de generación, el nombre del reporte y el periodo cubierto, y numeración de páginas.
  - El archivo se descarga con nombre `reporte-{tipo}-{AAAA-MM-DD}.pdf`.
  - `pdfmake` se carga con `import()` dinámico, solo al generar el primer PDF.
- Vendedor en turno en la venta (ampliación pedida por el usuario durante la implementación):
  - `PinScreen` informa a `App.tsx` quién entró (`User`); `App.tsx` guarda el vendedor y la hora de entrada, y `PosScreen` los muestra en lugar de "Luis · turno desde 14:02".
  - Cada venta nueva guarda `seller: { id, name }` en `sales` (snapshot); si no hay vendedor en turno (entró como administrador) el campo se omite.
  - El ticket (`TicketSheet`) muestra "Vendedor: {nombre}" cuando existe.
  - El reporte general en PDF muestra el vendedor de cada ticket.

**Fuera de alcance (specs futuras):**

- Cancelaciones, anulaciones y devoluciones de ventas (el mockup las mostraba; hoy no existen).
- Totales pre-agregados por día en Firestore o Cloud Functions.
- Reporte en pantalla por método de pago, por usuario o por turno (el PDF de tickets sí desglosa por método de pago y el general muestra el vendedor).
- Autenticar al vendedor: el PIN sigue sin validarse (no hay PIN guardado), solo se registra quién eligió entrar.
- Conectar `ShiftCloseScreen` y la pestaña Pedidos a las ventas reales; siguen con datos de ejemplo.
- Exportar a CSV, enviar o compartir los PDF (correo, WhatsApp), imprimir reportes y gráficas de tendencia.
- Reportes de inventario, costos o utilidad.
- Zona horaria configurable o corte de día por turno.
- Cerrar turno o fijar la hora de salida; `ShiftCloseScreen` sigue con datos de ejemplo.
- Mostrar el vendedor en ventas guardadas antes de esta ampliación (quedan sin vendedor).
- Firebase Auth y reglas de seguridad por usuario.

## Modelo de datos

Esta spec no crea colecciones. Lee `sales` (`Sale`, SPEC 05) y añade un campo opcional a las ventas nuevas:

```ts
// src/lib/sales.ts
export interface Sale {
  // ...campos actuales
  seller?: { id: string; name: string }; // snapshot del vendedor en turno; omitido si no hay
}
```

`src/data/mock.ts` ya define `User`; `App.tsx` guarda `seller: User | null` y `shiftStart: Date | null` al entrar por PIN.

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
// Los campos opcionales solo los usa el PDF del reporte general.
export type ReportSale = Pick<
  Sale,
  "channel" | "lines" | "saleSaving" | "total"
> &
  Partial<Pick<Sale, "folio" | "paymentMethod" | "subtotal" | "seller">> & {
    createdAt: Date;
  };

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

PDF en `src/lib/reportPdf.ts` (el armado del documento es puro y se prueba sin `pdfmake`):

```ts
export type PdfKind = "top-items" | "hours" | "tickets" | "general";

export interface PdfMeta {
  periodLabel: string; // "miércoles 28 oct", "semana del 26 oct", "10 oct – 12 oct"
  generatedAt: Date;
  logo?: string; // data URL; sin logo el PDF se genera igual
}

export const buildPdfDefinition: (
  kind: PdfKind,
  sales: ReportSale[],
  range: DateRange,
  meta: PdfMeta,
) => TDocumentDefinitions;

export const downloadReportPdf: (
  kind: PdfKind,
  sales: ReportSale[],
  range: DateRange,
  periodLabel: string,
) => Promise<void>; // carga el logo, importa pdfmake y descarga
```

Además `reports.ts` exporta `hourlyBuckets(sales, range)` (suma por hora del día de todas las ventas del rango) y `rankItems(sales, range)` (lista completa de productos y combos por cantidad; `topItems` en pantalla sigue siendo su top 5).

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

6. Vendedor en turno: `PinScreen` llama a `onSuccess(user)`, `App.tsx` guarda vendedor y hora de entrada, `PosScreen` muestra el vendedor y la hora reales (con "Sin turno" si no hay), `confirmSale` agrega `seller` a la venta, `Sale.seller` en `sales.ts` y "Vendedor" en `TicketSheet`; `useSalesRange` pasa `folio`, `paymentMethod`, `subtotal` y `seller` a `ReportSale`. Verificación: entrar con el PIN de Ana, confirmar una venta y ver "Vendedor: Ana" en el ticket y el campo `seller` en el documento.
7. PDF puro: instalar `pdfmake` y `@types/pdfmake`; añadir `hourlyBuckets` y `rankItems` a `src/lib/reports.ts`; crear `src/lib/reportPdf.ts` con `buildPdfDefinition` para los cuatro tipos (logo, fecha de generación, periodo, numeración de páginas) y `src/lib/reportPdf.test.ts`. Verificación: `npx vitest run src/lib/reportPdf.test.ts`.
8. Botón PDF: `downloadReportPdf` (logo a data URL, `import()` dinámico de `pdfmake` con las fuentes, `download`) y botón "PDF" con menú de cuatro reportes en `ReportsScreen`, desactivado mientras carga o con rango inválido, con estado "Generando…" y mensaje de error si falla; tests en `ReportsScreen.test.tsx`. Verificación: descargar los cuatro PDF de Hoy y abrirlos.

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
- [ ] "Salsas más pedidas": una línea de cantidad 14 con salsa incluida `bbq` suma 1 a `bbq`, y con salsa incluida `bbq` más extra `bbq` suma 2; los porcentajes se calculan sobre el total de salsas y se muestran como máximo 6.
- [ ] Una salsa con nombre `salsa eliminada` no aparece en "Salsas más pedidas" ni cuenta en el total de porcentajes.
- [ ] "Por canal" siempre lista Mostrador, Llevar, WhatsApp y Domicilio con `monto · tickets`, y un canal guardado fuera de esa lista aparece debajo.
- [ ] "Descuentos" muestra el número de tickets con descuento y el monto ahorrado: una venta con un ahorro de $20 en una línea y $10 de promo de venta da `1 · −$30`.
- [ ] Ya no existe el texto "Cancelaciones" en la pantalla.
- [ ] Hoy se actualiza en vivo al confirmar una venta desde otro dispositivo, en menos de 3 s, sin recargar; Semana, Mes y Rango se leen al cambiar de periodo o al reintentar.
- [ ] Mientras carga se muestra un estado de carga; si la consulta falla se muestra el `ErrorBanner` y "Reintentar" vuelve a consultar.
- [ ] Con la red cortada, los periodos ya consultados cargan desde la caché de Firestore.
- [ ] `grep` no encuentra `$8,420`, `topProducts` ni `channelSales` en `src/screens/ReportsScreen.tsx`.
- [ ] `ShiftCloseScreen` y Pedidos no cambian.
- [ ] Entrar con el PIN de Ana muestra "Ana" y la hora real de entrada en el POS; entrar como administrador muestra "Sin turno".
- [ ] Una venta confirmada con Ana en turno guarda `seller: { id: "an", name: "Ana" }` y el ticket muestra "Vendedor: Ana"; sin vendedor en turno el documento no tiene `seller` y el ticket no muestra la línea.
- [ ] `ReportsScreen` tiene un botón "PDF" que abre un menú con "Productos más vendidos", "Ventas por hora", "Total de tickets" y "Reporte general".
- [ ] Cada opción descarga un archivo `reporte-{tipo}-{AAAA-MM-DD}.pdf` del periodo seleccionado.
- [ ] Los cuatro PDF incluyen el logo, la fecha y hora de generación, el nombre del reporte y el periodo cubierto.
- [ ] El PDF de productos más vendidos lista todos los productos y combos del periodo ordenados por cantidad, no solo cinco.
- [ ] El PDF de ventas por hora suma cada hora del día entre todos los días del periodo y muestra su total y número de tickets.
- [ ] El PDF de tickets muestra el total de tickets, el total vendido, el ticket promedio y el desglose por canal y por método de pago.
- [ ] El PDF general lista cada ticket con folio, fecha y hora, vendedor, canal, método de pago, cada producto con cantidad, salsas, extras, ahorro e importe, y el total del ticket; cierra con el total general igual al de la pantalla.
- [ ] Con un periodo sin ventas el PDF se genera con el mensaje "Sin ventas en este periodo".
- [ ] El botón "PDF" está desactivado mientras carga o con un rango inválido, muestra "Generando…" al descargar y un mensaje de error si falla.
- [ ] `pdfmake` no se carga hasta generar el primer PDF (importación dinámica).
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
- **Sí:** las salsas cuentan una vez por línea de venta (por selección), incluidas y extras juntas, sin multiplicar por la cantidad. Los productos por pieza (por ejemplo 14 piezas de boneless) llevan una sola porción y multiplicarla inflaba el reporte; cambio pedido por el usuario durante la implementación. Costo: dos unidades iguales con la misma salsa en una línea (2 burritos con bbq) cuentan 1; un indicador "se vende por pieza" en el producto lo resolvería con exactitud.
- **Sí:** los cuatro canales siempre visibles. La tarjeta no cambia de tamaño entre días.
- **Sí:** renombrar a "Descuentos". Sin función de cancelaciones, mostrarlas sería un dato inventado.
- **Sí:** Rango limitado a 92 días. Acota las lecturas de Firestore de una sola consulta.
- **Sí:** el nombre en pantalla es el guardado en la venta. Renombrar o borrar un producto después no cambia los reportes pasados, igual que el ticket.
- **Sí:** PDF dentro de esta spec y no en otra, por pedido explícito del usuario durante la implementación, aunque la spec lo excluía. El armado del documento queda en `buildPdfDefinition`, puro, para probarlo sin `pdfmake`.
- **Sí:** un botón "PDF" con menú de cuatro reportes y no cuatro botones. Ocupa un solo lugar en una pantalla ya cargada.
- **Sí:** los PDF cubren el periodo seleccionado en pantalla, incluida la venta por hora sumada entre días. Es la lectura más simple de "reporte del periodo".
- **Sí:** PDF con el ranking completo, no el top 5. En papel el espacio no es problema y sirve para revisar el menú entero.
- **Sí:** `import()` dinámico de `pdfmake` y sus fuentes. Pesan cientos de KB y solo se usan al descargar.
- **Sí:** si el logo no se puede leer, el PDF se genera sin él en vez de fallar. El reporte es más útil que el adorno.
- **Sí:** vendedor guardado como snapshot `{ id, name }` y tomado de quien eligió entrar por PIN. No hay autenticación real ni PIN guardado, así que se registra quién eligió entrar, no se verifica.
- **Sí:** el campo `seller` es opcional. Ventas anteriores y ventas hechas como administrador quedan sin vendedor.
- **No:** compartir o enviar el PDF. Solo se descarga.
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
| `pdfmake` aumenta el peso de la app                                                       | Importación dinámica; el bundle inicial no cambia                                                           |
| El PIN no se valida, así que el vendedor registrado es quien eligió entrar                | Documentado; la spec de Auth lo reemplazará por el usuario autenticado                                       |
| El reporte general con miles de ventas genera un PDF lento o muy pesado                   | Rango máximo de 92 días y botón con estado "Generando…"; paginar o resumir si el volumen lo exige           |
| Las reglas abiertas de Firestore vencen el 30-nov-2026 y la app deja de leer o escribir         | La spec de Auth debe reemplazarlas antes de esa fecha                                                     |

## Lo que **no** está en esta spec

- Cancelaciones, anulaciones y devoluciones.
- Totales pre-agregados, Cloud Functions o cambios al documento de venta.
- Cierre de turno y Pedidos con datos reales.
- Compartir o enviar PDF, exportar a CSV, imprimir reportes, tendencias y reportes de costos o utilidad.
- Autenticación real del vendedor.
- Zona horaria configurable o corte de día por turno.
- Firebase Auth o reglas por usuario.
