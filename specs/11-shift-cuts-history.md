# SPEC 11 — Historial de cortes y faltantes

> **Estado:** Implemen tado
> **Depende de:** SPEC 06, SPEC 09, SPEC 10
> **Fecha:** 2026-11-03
> **Objetivo:** Dar al Dueño un módulo que liste los turnos (aperturas y cierres) por periodo con su diferencia de caja y resúmenes por vendedor y por periodo, y que se pueda exportar a PDF y XLSX, para saber dónde falta dinero.

## Por qué existe esta spec

SPEC 09 guarda un snapshot `cut` en cada turno cerrado, pero dejó fuera el historial: hoy solo se ve el corte del turno propio justo al cerrarlo. El Dueño no puede comparar turnos ni detectar quién o qué día cuadra mal. Esta spec solo **lee** lo que SPEC 09 ya guarda; no cambia cómo se abre o cierra un turno.

## Alcance

**Dentro:**

- Nueva vista `cuts` (`#/cortes`) en `src/screens/CutsScreen.tsx`, solo para el Dueño. Se llega desde una nueva tarjeta "Historial de cortes" (subtítulo "Faltantes y sobrantes") en `MoreScreen`, junto a "Menú" y "Corte". La tarjeta "Corte" existente (cierre del turno propio) no cambia.
- Selector de periodo con `PeriodPicker` y `getPeriodRanges` (Hoy / Semana / Mes / Rango, máximo `MAX_RANGE_DAYS`), igual que Reportes y Ventas. El periodo filtra por `openedAt` del turno.
- Filtros adicionales: vendedor (selector con los vendedores que tienen turnos en el periodo), interruptor "Solo con diferencia" y interruptor "Solo abiertos".
- Resumen del periodo (tarjetas): total faltante, total sobrante, neto y número de turnos cerrados con diferencia. Respeta periodo y vendedor; ignora "Solo con diferencia" y "Solo abiertos".
- Resumen por vendedor: por cada vendedor, turnos cerrados, turnos con diferencia, faltante acumulado, sobrante acumulado y neto, ordenado por faltante (mayor primero). Respeta el periodo; ignora el filtro de vendedor para poder comparar.
- Lista de turnos, más recientes primero. Cada fila: vendedor, fecha y horas de apertura – cierre, esperado, contado y chip "Faltan $X" / "Sobran $X" / "Cuadra". Los turnos sin `closedAt` se muestran con chip "Abierto", con fondo inicial y sin diferencia.
- Detalle de turno: al tocar una fila se abre `src/components/ShiftDetailSheet.tsx` (solo lectura) con fondo inicial, ventas por método, tickets, retiros (hora, monto, motivo), esperado, contado y diferencia. Para un turno abierto muestra solo fondo inicial y retiros hasta ahora.
- Estados: carga, error con `ErrorBanner` y reintento, periodo sin turnos, filtros sin resultados, rango inválido (mismo manejo que `SalesScreen`).
- Exportación (ampliación pedida por el usuario tras la implementación inicial): botones "Excel" y "PDF" en el encabezado de `CutsScreen`, con el mismo patrón que `SalesScreen` (`pdfmake` vía `loadPdfMake`/`loadLogo` de `reportPdf.ts` y `exceljs`).
  - Exportan lo que se ve: los turnos de la lista ya filtrada (periodo, vendedor, interruptores), más el resumen del periodo y el resumen por vendedor.
  - Columnas por turno: Vendedor, Fecha, Apertura, Cierre, Fondo inicial, Tickets, Efectivo, Tarjeta, Transfer., Retiros, Esperado, Contado, Diferencia, Estado. Los turnos abiertos llevan solo vendedor, fecha, apertura, fondo, retiros y Estado "Abierto"; el resto vacío.
  - Botones desactivados mientras carga, hay error, el rango es inválido, no hay turnos visibles o se está generando ("Generando…"); un fallo muestra "No se pudo generar el archivo. Inténtalo de nuevo." sin cerrar la pantalla.
  - Lógica en `src/lib/cutsExport.ts` con pruebas.
- Permisos: nuevo permiso `viewCuts` solo para `owner` en `src/lib/permissions.ts`; la vista `cuts` entra en `allowedViews` solo con ese permiso; la guarda de vista redirige al Cajero a su inicio.
- Ruta `#/cortes` en `src/lib/route.ts`.
- Lógica pura en `src/lib/shiftHistory.ts` con pruebas; hook `src/hooks/useShiftsRange.ts`.
- Diseño mobile-first con adaptación a escritorio (como en SPEC 01): lista y tarjetas apiladas en móvil; en escritorio las tarjetas en fila y el resumen por vendedor junto a la lista.

**Fuera de alcance (specs futuras):**

- Cierre forzado de turnos huérfanos por el Dueño (sigue pendiente de SPEC 09).
- Reabrir, editar o anotar un corte cerrado, o añadir notas/justificación a una diferencia.
- Exportar a CSV u otros formatos distintos de PDF y XLSX, y enviar el archivo por correo o compartirlo.
- Vista de cortes propios para el Cajero.
- Alertas o notificaciones por diferencias, o umbrales de tolerancia.
- Gráficas de tendencia.
- Ingresos manuales de efectivo, gastos y arqueo por denominación (ya fuera en SPEC 09).
- Corregir ventas canceladas tras el cierre; el snapshot `cut` es inmutable.
- Turnos abiertos antes del periodo seleccionado (un huérfano de hace meses no aparece si el rango no lo cubre).

## Modelo de datos

Esta spec no introduce colecciones ni campos nuevos. Lee `shifts/{shiftId}` tal como lo define SPEC 09 (`Shift`, `ShiftCut`, `Withdrawal`). El snapshot `cut` ya trae todo lo necesario, así que no se leen `sales`.

Hook en `src/hooks/useShiftsRange.ts`:

```ts
// where("openedAt", ">=", start) y where("openedAt", "<", end): un solo campo, sin índice compuesto.
// Vendedor y estado se filtran en el cliente. Mismo patrón live/getDocs que useSalesList (live solo con "Hoy").
export const useShiftsRange: (
  range: DateRange | null,
  live: boolean,
) => {
  shifts: Shift[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
};
```

Lógica pura en `src/lib/shiftHistory.ts`:

```ts
export interface ShiftFilters {
  sellerId: string | null;
  onlyDifference: boolean;
  onlyOpen: boolean;
}

export interface CutTotals {
  closed: number; // turnos cerrados
  withDifference: number; // cerrados con difference !== 0
  shortage: number; // suma de |difference| donde difference < 0 (número positivo)
  surplus: number; // suma de difference donde difference > 0
  net: number; // surplus − shortage
}

export interface SellerCutTotals extends CutTotals {
  seller: { id: string; name: string };
}

export const summarize: (shifts: Shift[]) => CutTotals; // ignora turnos abiertos
export const summarizeBySeller: (shifts: Shift[]) => SellerCutTotals[]; // orden: shortage desc, luego nombre
export const filterShifts: (shifts: Shift[], filters: ShiftFilters) => Shift[];
export const sellersOf: (shifts: Shift[]) => { id: string; name: string }[];
```

Convención: `difference` de `ShiftCut` es `counted − expected`; negativo = faltan. Un turno con `difference === 0` es "Cuadra". Un turno sin `closedAt` o sin `cut` cuenta como abierto y nunca entra en los totales.

Exportación en `src/lib/cutsExport.ts` (sin Firestore):

```ts
export const CUTS_EXPORT_HEAD: readonly string[]; // las 14 columnas, en orden
export interface CutsExportRow {
  seller: string;
  date: Date;
  opened: Date;
  closed: Date | null;
  openingFloat: number;
  tickets: number | null; // null en turnos abiertos
  cash: number | null;
  card: number | null;
  transfer: number | null;
  withdrawals: number; // suma de retiros
  expected: number | null;
  counted: number | null;
  difference: number | null;
  status: "Faltan" | "Sobran" | "Cuadra" | "Abierto";
}
export const buildCutsRows: (shifts: Shift[]) => CutsExportRow[];
export const cutsFileName: (date: Date, ext: "pdf" | "xlsx") => string; // cortes-YYYY-MM-DD.ext
export const buildCutsPdfDefinition: (
  data: { shifts: Shift[]; totals: CutTotals; bySeller: SellerCutTotals[] },
  meta: { periodLabel: string; generatedAt: Date; logo?: string },
) => TDocumentDefinitions;
export const downloadCutsPdf: (data, periodLabel: string) => Promise<void>;
export const downloadCutsXlsx: (data) => Promise<void>; // hoja "Cortes" y hoja "Por vendedor"
```

El XLSX lleva dos hojas: "Cortes" (una fila por turno, encabezado fijo, formato `"$"#,##0` y fecha `dd/mm/yyyy hh:mm`) y "Por vendedor" (más una fila de totales del periodo). El PDF lleva logo, periodo, fecha de generación, resumen del periodo, resumen por vendedor y la tabla de turnos en horizontal (`pageOrientation: "landscape"`), con paginación.

Permisos: `Permission` suma `"viewCuts"`; `View` suma `"cuts"`; `paths.cuts = "/cortes"`.

## Plan de implementación

1. `src/lib/shiftHistory.ts` con `summarize`, `summarizeBySeller`, `filterShifts` y `sellersOf`, y `shiftHistory.test.ts` (sin turnos, solo abiertos, mezcla de faltantes/sobrantes, varios vendedores, filtros combinados).
2. `viewCuts` en `permissions.ts`, vista `cuts` en `View`/`allowedViews`, ruta en `route.ts`, con sus pruebas; `App.tsx` renderiza una `CutsScreen` vacía con "Volver" a Más y la guarda redirige al Cajero.
3. Hook `useShiftsRange` y `CutsScreen` con periodo y lista (vendedor, horas, esperado, contado, chip), estados de carga/error/vacío.
4. Filtros de vendedor, "Solo con diferencia" y "Solo abiertos" sobre la lista.
5. Resumen del periodo y resumen por vendedor.
6. `ShiftDetailSheet` abierta desde cada fila.
7. Tarjeta "Historial de cortes" en `MoreScreen` solo para el Dueño; pruebas de `CutsScreen`, `ShiftDetailSheet` y `MoreScreen`; `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`.
8. `src/lib/cutsExport.ts` con `buildCutsRows`, `cutsFileName` y pruebas (turno cerrado con y sin diferencia, abierto, con retiros), sin generar archivos todavía.
9. `buildCutsPdfDefinition` y `downloadCutsPdf` con pruebas de la definición; botón "PDF" en `CutsScreen` con estados.
10. `downloadCutsXlsx` y botón "Excel" en `CutsScreen`; pruebas de la pantalla (botones desactivados, error); `npm run typecheck`, `npm run lint`, `npm test`.

## Criterios de aceptación

- [ ] El Dueño ve la tarjeta "Historial de cortes" en Más y al tocarla abre `#/cortes`; el Cajero no la ve.
- [ ] Un Cajero que abre `#/cortes` es redirigido a su vista de inicio.
- [ ] Refrescar en `#/cortes` con sesión de Dueño válida conserva la vista.
- [ ] La lista muestra solo turnos con `openedAt` dentro del periodo elegido, más recientes primero.
- [ ] Un turno cerrado con `cut.difference = -150` muestra "Faltan $150"; con `+80`, "Sobran $80"; con `0`, "Cuadra".
- [ ] Un turno sin `closedAt` muestra chip "Abierto", no muestra esperado ni diferencia y no suma en ningún total.
- [ ] El resumen del periodo: faltante, sobrante, neto y turnos con diferencia coinciden con `summarize` sobre los turnos cerrados del periodo y vendedor elegidos (verificado con casos de prueba).
- [ ] El resumen por vendedor lista cada vendedor del periodo con sus totales, ordenado por faltante descendente, y no cambia al elegir un vendedor en el filtro.
- [ ] "Solo con diferencia" oculta los turnos con `difference === 0` y los abiertos; "Solo abiertos" muestra únicamente los abiertos; ninguno altera los resúmenes.
- [ ] Elegir un vendedor deja en la lista y en el resumen del periodo solo sus turnos.
- [ ] Tocar una fila abre `ShiftDetailSheet` con fondo inicial, ventas por método, tickets, retiros (hora, monto, motivo), esperado, contado y diferencia, igual a lo guardado en `cut`.
- [ ] Cancelar una venta después del cierre no cambia el corte mostrado en el historial.
- [ ] Periodo sin turnos muestra estado vacío; filtros sin resultados muestran un mensaje distinto; error de lectura muestra `ErrorBanner` con reintento; un rango inválido no consulta Firestore.
- [ ] La consulta usa solo `openedAt` (sin índice compuesto) y no lee la colección `sales`.
- [ ] En un teléfono de 375 px la pantalla no tiene scroll horizontal; en escritorio las tarjetas se muestran en fila.
- [ ] "Excel" y "PDF" están desactivados con carga, error, rango inválido o sin turnos visibles, y muestran "Generando…" mientras se crea el archivo.
- [ ] El XLSX descargado se llama `cortes-YYYY-MM-DD.xlsx`, tiene las hojas "Cortes" y "Por vendedor" y una fila por turno visible con las 14 columnas.
- [ ] El PDF descargado se llama `cortes-YYYY-MM-DD.pdf` y trae periodo, resumen del periodo, resumen por vendedor y la tabla de turnos visibles.
- [ ] Con vendedor o "Solo con diferencia" activos, la exportación contiene solo los turnos visibles; los resúmenes coinciden con los de pantalla.
- [ ] En un turno abierto, esperado, contado y diferencia quedan vacíos y el estado es "Abierto"; en uno cerrado con diferencia −150 el estado es "Faltan" y la diferencia −150.
- [ ] Un fallo al generar muestra "No se pudo generar el archivo. Inténtalo de nuevo." y la pantalla sigue usable.
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` pasan.

## Decisiones tomadas y descartadas

- **Tarjeta en Más, solo Dueño:** la barra inferior ya tiene muchas pestañas en móvil y esto es consulta ocasional. Descartada una pestaña nueva y descartada la vista del Cajero (puede verse como una acusación y su propio corte ya lo ve al cerrar).
- **Filtrar por `openedAt`:** un único campo evita el índice compuesto (patrón de SPEC 07 y 09). Descartado filtrar por `closedAt` porque los turnos abiertos no lo tienen y desaparecerían.
- **Leer solo `shifts` y el snapshot `cut`:** es exacto y barato. Descartado recalcular desde `sales`, que cambiaría el corte si luego se cancela una venta.
- **Resumen por vendedor ignora el filtro de vendedor:** su propósito es comparar; el filtro afecta lista y resumen del periodo.
- **Faltante y sobrante se muestran por separado además del neto:** un neto de $0 puede esconder un faltante y un sobrante que se compensan.
- **Turnos abiertos visibles y de solo lectura:** el Dueño ve quién tiene caja abierta sin ampliar el alcance. Cierre forzado queda para otra spec.
- **Nueva vista y permiso propios (`cuts`, `viewCuts`):** mantiene la matriz de `permissions.ts` explícita en lugar de reutilizar `viewReports`.
- **Detalle en hoja, no en vista:** sin ruta con parámetros ni estado que restaurar al refrescar, coherente con la decisión de rutas por hash de SPEC 10.
- **Exportación PDF (`pdfmake`) y XLSX (`exceljs`) dentro de esta spec** (pedido del usuario tras la implementación inicial): reutiliza las dependencias y `reportPdf.ts` de Ventas, sin librerías nuevas. Descartado CSV.
- **Exporta lo que se ve, con resúmenes:** igual que Ventas, que exporta la lista filtrada. Descartado exportar siempre el periodo completo.
- **Columnas completas (14):** permiten auditar el faltante sin abrir cada turno. Descartado el formato básico.
- **PDF en horizontal:** 14 columnas no caben en vertical a 8 pt.
- **Dos hojas en el XLSX** ("Cortes" y "Por vendedor"): la segunda permite comparar vendedores en Excel sin fórmulas.

## Riesgos identificados

- **Turnos huérfanos fuera del periodo:** un turno abierto hace semanas no aparece con "Hoy". Mitigación: elegir un rango mayor; el cierre forzado y una vista de abiertos sin periodo quedan para otra spec.
- **Turnos de SPEC 09 sin `cut` válido o con datos incompletos:** se tratan como abiertos y no suman. La lectura valida `openedAt` y `seller` y descarta documentos malformados, como `useSalesList`.
- **Diferencias no atribuibles:** retiros mal registrados o ventas en efectivo en vuelo al cierre (riesgo aceptado en SPEC 09) pueden mostrar faltantes que no son del vendedor. El módulo muestra el dato, no la causa.
- **Sin seguridad real en el servidor:** igual que SPEC 10, el permiso solo oculta la interfaz; los datos de `shifts` siguen legibles con la configuración de Firebase.

## Qué **no** entra en esta spec

- Cierre forzado de turnos huérfanos.
- Notas, justificaciones o edición de cortes.
- Exportar a CSV u otros formatos.
- Vista del Cajero.
- Alertas, umbrales y gráficas de tendencia.
- Cualquier cambio al flujo de apertura, retiro o cierre de SPEC 09.
