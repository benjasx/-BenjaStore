# SPEC 07 — Historial de ventas y cancelación

> **Estado:** Implementado.
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-01
> **Objetivo:** Añadir el módulo "Ventas" con una tabla paginada de todas las ventas guardadas y la opción de cancelar una venta con motivo, dejando el registro pero sin contar su dinero en reportes ni totales.

## Por qué existe esta spec

SPEC 05 guarda cada venta y SPEC 06 las suma en reportes, pero hoy no hay dónde ver las ventas una por una ni forma de corregir un pedido que el cliente se arrepiente. Borrar el documento rompe el folio consecutivo y el historial; dejarlo infla el ingreso. Esta spec añade la lista y una cancelación que conserva el registro y saca la venta de las métricas. Las "Cancelaciones y anulaciones" estaban fuera de alcance en SPEC 05 y 06; aquí entran.

## Alcance

**Dentro:**

- Nueva pestaña "Ventas" en `BottomNav`, entre "Reportes" y "Más" (escritorio y móvil). La barra móvil pasa de 5 a 6 columnas. Nuevo `NavTab` `"sales"` y nueva vista en `App.tsx`; `MoreScreen` no cambia.
- Pantalla `src/screens/SalesScreen.tsx`:
  - Filtro de periodo Hoy, Semana, Mes y Rango con las mismas reglas que SPEC 06 (`getPeriodRanges`; Rango inclusivo, máximo 92 días, aviso si es inválido); por defecto Hoy.
  - Tabla con una fila por venta, de la más reciente a la más antigua, con folio, fecha y hora, vendedor, canal, método de pago, total y estado (`Activa` / `Cancelada`). En móvil cada fila se muestra como tarjeta con los mismos datos.
  - Paginación de 20 ventas por página con "Anterior" / "Siguiente" y texto "Página X de Y"; al cambiar de periodo vuelve a la página 1.
  - Resumen sobre la tabla: número de ventas activas, número de canceladas y total vendido (solo activas).
  - Estados: carga, error con `ErrorBanner` y reintento, y periodo sin ventas ("Sin ventas en este periodo").
  - Tocar una fila abre el ticket de esa venta (`TicketSheet`).
- Cancelación:
  - `TicketSheet` recibe un `onCancel` opcional; solo `SalesScreen` lo pasa, así que el ticket tras cobrar no cambia. Si la venta está activa muestra el botón "Cancelar venta".
  - Hoja `src/components/CancelSaleSheet.tsx`: pide un motivo obligatorio (texto sin espacios en los extremos, máximo 120 caracteres) y un botón de confirmación "Cancelar venta" con estados "Cancelando…" y error sin cerrar la hoja.
  - Cancelación definitiva: no se puede reactivar.
  - La venta cancelada se muestra con estado `Cancelada`, total tachado y, en su ticket, la marca "CANCELADA" con fecha, motivo y quién canceló; sin botón de cancelar.
  - Cualquier usuario en turno puede cancelar; se registra el vendedor en turno (`App.tsx`) como `by`, omitido si no hay.
- Efecto en reportes: una venta cancelada no cuenta en ninguna métrica de `ReportsScreen` (total, tickets, ticket promedio, gráfica, más vendidos, salsas, canales, descuentos, comparación) ni aparece en ningún PDF. El filtro vive en un solo lugar, `useSalesRange`.
- `src/lib/sales.ts`: `cancelSale` (transacción que lee la venta, rechaza si ya está cancelada y escribe `cancelled`) y `isCancelled`.
- Nuevo hook `src/hooks/useSalesList.ts` que lee `sales` por rango de `createdAt` y devuelve `Sale[]` completas (con `id`) ordenadas de más reciente a más antigua, con `loading`, `error` y `retry`. En vivo (`onSnapshot`) solo para Hoy; lectura única para el resto. La paginación se hace en el cliente sobre ese resultado.
- Exportación de la lista (ampliación pedida por el usuario durante la implementación): dos botones en el encabezado de `SalesScreen`, "Excel" y "PDF", que exportan todas las ventas del periodo seleccionado (no solo la página visible), canceladas incluidas y marcadas:
  - Columnas: folio, fecha y hora, vendedor, canal, pago, total, estado y motivo de cancelación.
  - Excel: archivo `.xlsx` (formato actual de Excel) `ventas-{AAAA-MM-DD}.xlsx`, con encabezado fijo, totales numéricos y una fila final "Total vendido (sin canceladas)".
  - PDF: `ventas-{AAAA-MM-DD}.pdf` vertical, con logo, periodo, fecha de generación, resumen (ventas, canceladas, total vendido) y numeración de páginas.
  - Botones desactivados mientras carga, con error, con rango inválido o sin ventas; "Generando…" mientras se crea el archivo y mensaje de error si falla.
  - `exceljs` y `pdfmake` se cargan con `import()` dinámico al exportar.
  - Lógica pura en `src/lib/salesExport.ts` (`buildExportRows`, `summarize`, `buildSalesPdfDefinition`), con pruebas.
- Se elimina de los textos de SPEC 06 la nota "Cancelaciones fuera de alcance" solo a nivel de spec (no se edita ese archivo); `ReportsScreen` no añade ningún texto de cancelaciones.

**Fuera de alcance (specs futuras):**

- Reactivar o deshacer una cancelación.
- Cancelar solo una línea, devoluciones parciales o editar una venta ya guardada.
- Devolución del dinero al cliente (efectivo, tarjeta o transferencia): solo se registra la cancelación.
- Búsqueda por folio, vendedor, canal o método de pago, y filtros por estado.
- Reimprimir la lista y exportar a CSV.
- Mostrar cancelaciones en `ReportsScreen` o en los PDF (conteo o monto cancelado).
- Cancelaciones en la pestaña Pedidos y en `ShiftCloseScreen`, que siguen con datos de ejemplo.
- Permisos por rol, validar el PIN o Firebase Auth.
- Inventario o stock de lo vendido.
- Paginación de servidor por cursor.

## Modelo de datos

Sin colecciones nuevas. Se añade un campo opcional a `sales/{saleId}`:

```ts
// src/lib/sales.ts
export interface SaleCancellation {
  at: Timestamp; // serverTimestamp()
  reason: string; // sin espacios en los extremos, no vacío, máximo 120
  by?: { id: string; name: string }; // snapshot del vendedor en turno; omitido si no hay
}

export interface Sale {
  // ...campos actuales
  cancelled?: SaleCancellation; // presente = venta cancelada
}

export const isCancelled: (sale: Pick<Sale, "cancelled">) => boolean;

export const cancelSale: (
  saleId: string,
  reason: string,
  by?: { id: string; name: string },
) => Promise<void>; // rechaza si la venta no existe, el motivo es inválido o ya estaba cancelada
```

`SaleData` (entrada de `createSale`) no incluye `cancelled`: las ventas nacen activas. Las ventas guardadas antes de esta spec no tienen `cancelled` y son activas.

Hook en `src/hooks/useSalesList.ts`:

```ts
// Lee sales con where("createdAt", ">=", start) y where("createdAt", "<", end).
// Un solo campo, sin índice compuesto. Ordena en el cliente por createdAt descendente.
export const useSalesList: (
  range: DateRange | null,
  live: boolean,
) => {
  sales: Sale[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
};
```

Cambio en `src/hooks/useSalesRange.ts`: `toReportSales` descarta los documentos con `cancelled`.

Cambios de navegación: `NavTab` suma `"sales"` y `App.tsx` suma la vista `"sales"` y la entrada en `tabView`. Paginación pura en `src/lib/salesList.ts`:

```ts
export const PAGE_SIZE = 20;
export const paginate: <T>(
  items: T[],
  page: number, // 1-based; se acota a [1, pages]
) => { items: T[]; page: number; pages: number }; // pages >= 1 aunque no haya items
```

Convenciones:

- Los importes son enteros (`money`); el folio se muestra con `formatFolio`.
- Fecha y hora con la hora local del dispositivo, como SPEC 06.
- Textos de productos, canales y vendedores con `uppercase`, como el resto de la app.
- La cancelación se hace en transacción para que dos dispositivos no la apliquen dos veces.
- Campos opcionales ausentes se omiten del documento (Firestore no admite `undefined`).

## Plan de implementación

1. Añadir a `src/lib/sales.ts` `SaleCancellation`, `Sale.cancelled`, `isCancelled` y `cancelSale` (`runTransaction` sobre `sales/{id}`), y los casos en `src/lib/sales.test.ts` para lo que sea puro (`isCancelled`, validación del motivo). Crear `src/lib/salesList.ts` con `paginate` y `src/lib/salesList.test.ts` (página 1, última página parcial, página fuera de rango, lista vacía). Nada lo usa todavía. Verificación: `npx vitest run src/lib/sales.test.ts src/lib/salesList.test.ts`.
2. Filtrar canceladas en reportes: `toReportSales` en `useSalesRange.ts` descarta documentos con `cancelled`. Verificación: marcar a mano `cancelled` en una venta de prueba desde la consola de Firestore y ver que `ReportsScreen` (Hoy) baja su total y sus tickets; quitar el campo y verla volver.
3. Crear `src/hooks/useSalesList.ts` (`getDocs` o `onSnapshot` según `live`, mapea `id`, ordena de más reciente a más antigua, `loading`, `error`, `retry`, `range` nulo = sin consulta). Verificación: con ventas reales, ver en la consola del navegador que devuelve las ventas de Hoy con su `id`.
4. Crear `src/screens/SalesScreen.tsx` con filtro de periodo (extraer el selector de `ReportsScreen` a un componente compartido si hace falta, sin cambiar su comportamiento), resumen, tabla y tarjetas en móvil, paginación y estados de carga, error, vacío y rango inválido; tocar una fila abre `TicketSheet`. Añadir la pestaña "Ventas" en `BottomNav` (icono, 6 columnas) y la vista en `App.tsx`. Verificación: confirmar 25 ventas de prueba y ver 2 páginas de 20 y 5, más recientes primero.
5. Cancelación en la interfaz: `TicketSheet` con `onCancel` opcional, botón "Cancelar venta" y marca "CANCELADA" con motivo, fecha y quién canceló; crear `src/components/CancelSaleSheet.tsx` con motivo obligatorio y estados "Cancelando…" y error; `SalesScreen` conecta `cancelSale` con el vendedor en turno de `App.tsx`, y la fila queda como `Cancelada` con total tachado. Verificación: cancelar una venta de $110 con motivo "Cliente se arrepintió", ver la fila cancelada, el resumen sin esos $110 y, en `ReportsScreen`, el total sin ella.
6. Pruebas de pantalla: `src/screens/SalesScreen.test.tsx` mockeando `@/hooks/useSalesList` y `@/lib/sales` (tabla con ventas, paginación, vacío, error con reintento, rango inválido, abrir ticket, cancelar con motivo vacío bloqueado, cancelar con éxito y error al cancelar), caso en `src/hooks` o `ReportsScreen.test.tsx` si hace falta para el filtro de canceladas, y actualizar `App.test.tsx` por la nueva pestaña; correr `npm run typecheck`, `npm run lint` y `npm test`.

## Criterios de aceptación

- [ ] La barra de navegación muestra "Vender", "Pedidos", "Inventario", "Reportes", "Ventas" y "Más" en ese orden, en escritorio y en móvil, sin scroll horizontal a 360 px de ancho.
- [ ] "Ventas" abre `SalesScreen` en Hoy; `MoreScreen`, Pedidos e Inventario no cambian.
- [ ] La tabla muestra folio, fecha y hora, vendedor, canal, método de pago, total y estado por venta, de la más reciente a la más antigua; en móvil se ve como tarjetas.
- [ ] Con 45 ventas en el periodo se ven 3 páginas (20, 20 y 5), "Página 2 de 3" en la segunda y "Anterior" / "Siguiente" desactivados en los extremos.
- [ ] Cambiar de periodo vuelve a la página 1.
- [ ] Semana, Mes y Rango usan las mismas fechas que `ReportsScreen`; Rango con `desde` mayor que `hasta` o más de 92 días muestra un aviso y no hace ninguna consulta; la fecha `hasta` es inclusiva.
- [ ] Una venta sin vendedor guardado muestra un guion en la columna de vendedor.
- [ ] Un periodo sin ventas muestra "Sin ventas en este periodo"; mientras carga se ve un estado de carga; si la consulta falla se ve el `ErrorBanner` y "Reintentar" vuelve a consultar.
- [ ] Hoy se actualiza en vivo al confirmar o cancelar una venta desde otro dispositivo, en menos de 3 s.
- [ ] Tocar una fila abre el ticket de esa venta con el mismo contenido que SPEC 05 y SPEC 06.
- [ ] El ticket que aparece tras cobrar en el POS no tiene botón "Cancelar venta".
- [ ] El ticket de una venta activa abierto desde "Ventas" tiene el botón "Cancelar venta", que abre `CancelSaleSheet`.
- [ ] "Cancelar venta" está desactivado con el motivo vacío o solo con espacios, y el motivo no pasa de 120 caracteres.
- [ ] Al confirmar, la venta guarda `cancelled: { at, reason, by }` con el motivo sin espacios en los extremos y `by` igual al vendedor en turno; sin vendedor en turno `by` no existe en el documento.
- [ ] Mientras cancela, el botón está desactivado y muestra "Cancelando…"; tocarlo dos veces cancela una sola vez.
- [ ] Si la cancelación falla (sin red) se muestra el error, la hoja sigue abierta y se puede reintentar; la venta sigue activa.
- [ ] Cancelar una venta ya cancelada desde otro dispositivo falla con un mensaje y no cambia `cancelled`.
- [ ] La venta cancelada sigue en la tabla con estado `Cancelada` y total tachado; su ticket muestra "CANCELADA" con fecha, motivo y quién canceló, y no tiene botón de cancelar.
- [ ] El documento cancelado conserva folio, líneas, total y pago sin cambios; no se borra nada de `sales` ni de `counters/sales`.
- [ ] El resumen de `SalesScreen` cuenta solo las activas en "ventas" y en "total vendido", y muestra aparte el número de canceladas.
- [ ] Tras cancelar una venta de $110, `ReportsScreen` (Hoy) baja $110 del total, 1 de los tickets y recalcula ticket promedio, gráfica, más vendidos, salsas, canales, descuentos y la comparación sin contar esa venta.
- [ ] Los cuatro PDF de `ReportsScreen` no incluyen la venta cancelada ni su total en el total general.
- [ ] Una venta cancelada de la semana pasada también deja de contar en la comparación de Hoy contra el mismo día de la semana anterior.
- [ ] Una venta sin campo `cancelled` (anterior a esta spec) se muestra como `Activa` y cuenta en reportes como antes.
- [ ] No existe ninguna acción para reactivar una venta cancelada.
- [ ] `grep` no encuentra `deleteDoc` sobre `sales` en `src/`.
- [ ] "Excel" y "PDF" descargan `ventas-{AAAA-MM-DD}.xlsx` y `.pdf` con todas las ventas del periodo, no solo la página visible, incluidas las canceladas con su estado y motivo.
- [ ] El total del Excel y del PDF excluye las canceladas y coincide con "Total vendido" de la pantalla.
- [ ] Los botones de exportar están desactivados mientras carga, con error, con rango inválido o sin ventas, y muestran "Generando…" al exportar.
- [ ] `exceljs` no se carga hasta exportar el primer Excel.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** cancelar marcando `cancelled` en el mismo documento y no borrarlo. El usuario pidió que quede el registro, y borrar rompería el folio consecutivo.
- **Sí:** el estado se deduce de la presencia de `cancelled`. Un solo campo, ventas anteriores quedan activas sin migración y no puede haber un estado y un detalle que se contradigan.
- **Sí:** excluir canceladas en `toReportSales` y no en cada métrica. Un solo punto cubre pantalla, comparación y los cuatro PDF, y evita que una métrica nueva olvide el filtro.
- **Sí:** el filtro se aplica al leer, en el cliente, y no con `where("cancelled", "==", null)`. Las ventas anteriores no tienen el campo y Firestore no las devolvería; además mantiene la consulta de un solo campo, sin índice compuesto.
- **Sí:** motivo obligatorio (máx. 120) y confirmación. Evita toques accidentales y deja contexto para quien revise la caja.
- **Sí:** cualquier usuario en turno puede cancelar y se guarda quién. El PIN aún no se valida (SPEC 06), así que restringir por rol sería aparente; el registro de quién lo hizo sí tiene valor.
- **Sí:** cancelación definitiva. Si fue un error se hace una venta nueva; reactivar obligaría a registrar y auditar el regreso y complica los reportes.
- **Sí:** transacción en `cancelSale`. Dos dispositivos no pueden cancelar la misma venta dos veces ni pisar el motivo.
- **Sí:** cancelar desde el ticket de la fila y no con un botón en cada fila. Evita cancelaciones por un toque erróneo en una lista y reutiliza `TicketSheet`.
- **Sí:** paginación en el cliente de 20 en 20 sobre el periodo leído. Con las ventas de un restaurante y un máximo de 92 días es barato, evita cursores y permite el total del resumen sin otra consulta.
- **Sí:** filtro de periodo como en `ReportsScreen`, por defecto Hoy. Es lo que se mira durante el servicio y reutiliza `getPeriodRanges` y su validación.
- **Sí:** Hoy en vivo y el resto con lectura única, igual que SPEC 06.
- **Sí:** barra móvil de 6 columnas en vez de mover "Ventas" a "Más". Es el acceso diario y se decidió así; cada pestaña queda más angosta pero con el mismo ícono y etiqueta corta.
- **Sí:** el mismo `TicketSheet` para ver y reabrir ventas. No se duplica la vista del ticket.
- **Sí:** exportación a Excel y PDF dentro de esta spec, por pedido explícito del usuario durante la implementación, aunque la spec la excluía. Exporta el periodo completo y no la página, porque la paginación es de pantalla.
- **Sí:** Excel en formato `.xlsx` con `exceljs` y no `.xls` antiguo. Es el formato que Excel abre hoy sin avisos; `.xls` binario exigiría una librería sin mantenimiento.
- **Sí:** las canceladas aparecen en el archivo marcadas y fuera del total. El archivo es el registro; el total sigue la regla de ingresos.
- **No:** reactivar. Ver arriba.
- **No:** mostrar el monto cancelado en reportes o PDF. No se pidió; "no cuente como ingreso" se cumple excluyéndolas. Si hace falta auditar canceladas, es una spec de reporte.
- **No:** devolución de dinero ni lógica de caja. El registro no mueve el cierre de turno, que sigue con datos de ejemplo.
- **No:** búsqueda por folio ni otros filtros. El filtro de periodo basta para la primera versión; se añaden cuando haya volumen.
- **No:** Cloud Functions ni totales pre-agregados. Sigue siendo innecesario para este volumen.

## Riesgos

| Riesgo                                                                                        | Mitigación                                                                                                             |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede cancelar y el PIN no se valida, así que un empleado podría ocultar una venta | Se guarda motivo, fecha y quién cancela, y la venta sigue visible; la spec de Auth añadirá permisos por rol            |
| Un reporte nuevo futuro lee `sales` por otro camino y cuenta las canceladas                   | Regla: todo cálculo de ingresos pasa por `useSalesRange`; criterio de aceptación explícito para reportes y PDF         |
| Dos dispositivos cancelan a la vez la misma venta                                             | `cancelSale` en transacción; el segundo intento falla con mensaje y no sobrescribe                                     |
| Un periodo largo carga muchas ventas completas y la tabla se siente lenta                     | Rango máximo de 92 días, lectura única fuera de Hoy y paginación de 20; revisar paginación por cursor si crece         |
| Barra móvil de 6 columnas con etiquetas apretadas en pantallas angostas                       | Criterio de 360 px sin scroll horizontal; si no cabe, texto más corto o reducir padding, sin quitar la pestaña         |
| Cancelar por error una venta correcta                                                         | Motivo obligatorio, hoja de confirmación aparte del ticket y registro que permite rehacer la venta                     |
| Firestore con reglas abiertas permite editar `cancelled` desde fuera de la app                | Las reglas abiertas vencen el 30-nov-2026; la spec de Auth debe reemplazarlas y restringir la escritura de `cancelled` |

## Lo que **no** está en esta spec

- Reactivar ventas, devoluciones parciales o editar ventas guardadas.
- Devolución de dinero, caja o cierre de turno con datos reales.
- Cancelaciones o su monto en `ReportsScreen` o en los PDF.
- Búsqueda por folio, vendedor o método; filtros por estado; exportar a CSV o reimprimir la lista.
- Pedidos con datos reales y cancelación de pedidos.
- Permisos por rol, validación de PIN, Firebase Auth o reglas por usuario.
- Paginación de servidor, totales pre-agregados o Cloud Functions.
