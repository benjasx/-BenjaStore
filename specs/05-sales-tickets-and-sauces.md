# SPEC 05 — Ventas, ticket y salsas

> **Estado:** Aprobado
> **Depende de:** SPEC 02, SPEC 04
> **Fecha:** 2026-11-01
> **Objetivo:** Guardar cada venta confirmada en Firestore con folio consecutivo y mostrar su ticket en pantalla, incorporando la selección de salsas incluidas y extras al agregar productos y combos al carrito.

## Por qué existe esta spec

Hoy confirmar una venta solo vacía el carrito en memoria (SPEC 04 dejó "persistir ventas" fuera) y el título "Ticket #0148" es un mock. Además el negocio vende productos y combos con salsa, y el cliente puede pedir salsas extra con costo; sin modelarlas, el ticket no puede reflejar lo que realmente se entregó ni lo que se cobró. Se hacen juntas en una sola spec porque el ticket debe mostrar las salsas y el total con extras. Se mitiga con pasos independientes: salsas primero (pasos 1–5), ventas y ticket después (pasos 6–7).

## Alcance

**Dentro:**

- Nueva colección `sauces` en Firestore, con sincronización en vivo y persistencia offline (mismo mecanismo que SPEC 02–04). Catálogo global: cada salsa tiene nombre, estado habilitada y precio de extra.
- Hook `src/hooks/useSauces.ts` con `loading`, `error` y `retry`. Operaciones: crear, editar (nombre y precio de extra), eliminar y habilitar/deshabilitar.
- Panel "Salsas" dentro de `MenuAdminScreen` (botón junto a "Combos" y "Promociones"), sin vista nueva en `App.tsx` ni entrada en `MoreScreen`.
- `Product.usesSauces?: boolean`: el producto lleva 1 salsa incluida por unidad. Se activa desde `ProductFormScreen` y `ProductEditor`.
- `Combo.sauceCount?: number` (0 a 3, ausente = 0): cuántas salsas incluidas lleva el combo por unidad. Se configura en `ComboEditor`.
- Hoja inferior `SauceSheet` en el POS: al tocar un producto con `usesSauces` o un combo con `sauceCount > 0` se eligen las salsas antes de agregar al carrito. Dos secciones:
  - **Incluidas:** exactamente N (1 en productos, `sauceCount` en combos), obligatorias, se puede repetir la misma salsa.
  - **Extra:** cualquier cantidad de cualquier salsa habilitada, cada una suma su `extraPrice`.
- Cada selección distinta de salsas es una línea distinta del carrito; la misma selección suma cantidad.
- Las promociones de item se calculan solo sobre el precio base. Los extras se suman después y sí cuentan en el subtotal para la promoción de venta y su compra mínima.
- Las promociones de item se calculan sobre la cantidad total del producto o combo, sumando todas sus líneas con distintas salsas.
- Nueva colección `sales` en Firestore: una venta confirmada es un documento con snapshot de nombres, precios, salsas, descuentos, total y pago.
- Folio consecutivo (`0001`, `0002`…) asignado en una transacción sobre `counters/sales` al confirmar.
- Se guardan método de pago, recibido y cambio (estos dos solo en efectivo) y el canal (`Mostrador`, etc.).
- `src/lib/sales.ts` con `buildSale` (puro, testeable) y `createSale` (transacción de Firestore).
- Vista de ticket en pantalla (`TicketSheet`) tras confirmar, con botón "Imprimir" (`window.print()`) y estilos `@media print` que dejan solo el ticket.
- `PaymentSheet` pasa a confirmar de forma asíncrona: muestra "Guardando…", deshabilita el botón mientras guarda y muestra el error sin vaciar el carrito si falla.
- El título "Ticket #0148" de `CartPanel` se reemplaza por "Nueva venta" (el folio no existe hasta confirmar).
- Se elimina el mock sin uso `modifierGroups` de `MenuAdminScreen`.

**Fuera de alcance (specs futuras):**

- Conectar `ReportsScreen` ("Tickets", "Salsas más pedidas") y la pestaña Pedidos a las ventas reales; siguen con datos mock.
- Historial de ventas, buscar o reimprimir tickets pasados, anular o devolver ventas.
- Impresora térmica, PDF, WhatsApp o correo.
- Nombre, dirección o logo del negocio en el ticket; impuestos y propinas.
- Cobrar o guardar ventas sin conexión (la confirmación exige conexión por el folio consecutivo).
- Salsas distintas por producto (lista de salsas permitidas por producto) y cantidad de salsas incluidas configurable en productos.
- Salsas con inventario o descuento de stock.
- Registrar qué usuario (PIN) hizo la venta.
- Firebase Auth y reglas de seguridad por usuario.

## Modelo de datos

Colección `sauces`. Documento `sauces/{sauceId}`:

```ts
// src/hooks/useSauces.ts
export interface Sauce {
  id: string; // doc.id, no se guarda en el documento
  name: string; // normalizado con normalizeName, no vacío
  extraPrice: number; // entero >= 0, precio cuando se pide como extra
  enabled: boolean;
}
```

Cambios en tipos existentes:

```ts
// src/data/mock.ts
export interface Product {
  // ...campos actuales
  usesSauces?: boolean; // ausente = false; 1 salsa incluida por unidad
}

// src/hooks/useCombos.ts
export interface Combo {
  // ...campos actuales
  sauceCount?: number; // 0..3, ausente = 0
}
```

`ComboInput` y los inputs de `addProduct` / `updateProduct` aceptan los campos nuevos. Un valor `false` o `0` se elimina con `deleteField()` al editar, igual que `description`.

Carrito (`App.tsx`): sigue siendo `Record<string, number>`. La clave se amplía en `src/lib/pricing.ts`:

```ts
export interface SauceSelection {
  included: string[]; // ids de salsa, pueden repetirse
  extra: string[]; // ids de salsa, pueden repetirse
}

// Sin salsas: clave actual ("{productId}" o "combo:{comboId}").
// Con salsas: "{baseKey}#{included ordenadas}#{extra ordenadas}", ids separados por ",".
export const lineKey: (baseKey: string, selection?: SauceSelection) => string;
export const parseLineKey: (key: string) => {
  baseKey: string;
  selection?: SauceSelection;
};
```

Cálculo (`computeCart`) recibe además `sauces: Sauce[]` y amplía `CartLine`:

```ts
export interface CartLine {
  // ...campos actuales (key, name, qty, unitPrice, gross, saving, promotionName)
  sauces?: {
    included: string[]; // nombres
    extra: { name: string; price: number }[];
  };
  extras: number; // suma de precios extra de la línea * qty
}
// subtotal = suma de (gross - saving + extras); saleSaving se calcula sobre ese subtotal.
```

Colección `sales`. Documento `sales/{saleId}`:

```ts
// src/lib/sales.ts
export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transfer.";

export interface SaleLine {
  kind: "product" | "combo";
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  gross: number;
  saving: number;
  promotionName?: string;
  contents?: string; // texto de componentes en combos
  sauces?: { included: string[]; extra: { name: string; price: number }[] };
  extras: number;
}

export interface Sale {
  id: string; // doc.id, no se guarda en el documento
  folio: number; // consecutivo, 1..
  createdAt: Timestamp; // serverTimestamp()
  channel: string;
  lines: SaleLine[];
  subtotal: number;
  saleSaving: number;
  saleName?: string;
  total: number;
  paymentMethod: PaymentMethod;
  received?: number; // solo Efectivo
  change?: number; // solo Efectivo
}
```

Contador: documento `counters/sales` con `{ last: number }`; si no existe, la primera venta crea `last: 1`.

Convenciones:

- Los precios son enteros (convención de `money`).
- `name` de salsas se guarda con `normalizeName` y se muestra con `uppercase`, igual que SPEC 03 y 04.
- Salsa nueva: `enabled: true`. El cliente ordena `sauces` por `name`; sin índices compuestos.
- Todo lo que se guarda en `sales` es un snapshot (nombres y precios al momento de vender); editar o borrar productos, combos, salsas o promociones después no cambia ventas pasadas.
- Campos opcionales ausentes se omiten del documento (Firestore no admite `undefined`).
- Folio en pantalla: `String(folio).padStart(4, "0")`.
- Estado del hook: `{ sauces: Sauce[], loading, error, retry }`.

## Plan de implementación

1. Crear `src/hooks/useSauces.ts` con `Sauce`, `onSnapshot`, `loading`, `error`, `retry`, `createSauce`, `updateSauce`, `deleteSauce` y `setSauceEnabled`; cablearlo en `App.tsx`. Verificación: crear un documento en `sauces` desde la consola de Firestore y verlo en el hook sin recargar.
2. Crear `src/components/SauceEditor.tsx` (lista con toggle habilitada, formulario de nombre y precio de extra, editar y eliminar) y el botón "Salsas" en `MenuAdminScreen`; quitar el mock `modifierGroups`. Verificación: crear una salsa, recargar y seguir viéndola con su precio.
3. Añadir `usesSauces` a `Product` (`mock.ts`, `useProducts`, `ProductFormScreen`, `ProductEditor`) y `sauceCount` a `Combo` (`useCombos`, `ComboEditor`, selector 0–3). Verificación: activar la salsa en un producto y un combo, recargar y ver que el valor persiste; el POS todavía no cambia.
4. Extender `src/lib/pricing.ts`: `SauceSelection`, `lineKey`, `parseLineKey`, parámetro `sauces` en `computeCart`, campos `sauces` y `extras` en `CartLine`, promos de item sobre la cantidad total del item. Añadir casos a `src/lib/pricing.test.ts` (extras fuera de promo de item, extras dentro de la promo de venta y su mínimo, líneas con distinta salsa, 2×1 entre líneas, salsa eliminada, sin salsas = resultado idéntico al actual). Verificación: `npx vitest run src/lib/pricing.test.ts`.
5. Crear `src/components/SauceSheet.tsx` y cablearlo en `PosScreen`: tocar un producto con `usesSauces` o un combo con `sauceCount > 0` abre la hoja y al confirmar agrega `lineKey(...)` al carrito; si no hay salsas habilitadas se agrega directo. `CartPanel` y `CartScreen` pasan `sauces` a `computeCart` y muestran salsas y extras de cada línea. Verificación: agregar una alita con salsa y un extra, ver línea y total con extra.
6. Crear `src/lib/sales.ts` (`buildSale`, `createSale` con `runTransaction` sobre `counters/sales` y `sales`) y `src/lib/sales.test.ts` para `buildSale` (snapshot de líneas, campos opcionales omitidos, efectivo vs tarjeta). Nada lo usa todavía. Verificación: `npx vitest run src/lib/sales.test.ts`.
7. Cobro y ticket: `PaymentSheet` confirma de forma asíncrona (`onConfirm(payment): Promise<void>`) con estados guardando y error; `CartPanel` y `CartScreen` pasan canal y totales; `App.tsx` guarda la venta, limpia el carrito y guarda la venta confirmada en estado para mostrar `src/components/TicketSheet.tsx` (con "Imprimir" y "Nueva venta") sobre la vista activa; estilos `@media print` en `src/index.css`; título "Nueva venta" en `CartPanel`. Verificación: confirmar una venta en efectivo, ver el ticket con folio y el documento en `sales`, recargar y ver que el siguiente folio continúa.
8. Actualizar `App.test.tsx` mockeando `@/hooks/useSauces` y `@/lib/sales`; correr `npm run typecheck`, `npm run lint` y `npm test`.

## Criterios de aceptación

- [ ] Crear la salsa " BBQ " con extra $10 crea `sauces/{id}` con `name: "bbq"`, `extraPrice: 10`, `enabled: true`, se ve "BBQ" en pantalla y sigue ahí tras recargar.
- [ ] No se puede guardar una salsa sin nombre o con precio de extra negativo o no entero.
- [ ] Deshabilitar una salsa la oculta de `SauceSheet`; en el panel "Salsas" sigue visible atenuada y se puede reactivar.
- [ ] Eliminar una salsa la quita de Firestore y de `SauceSheet`.
- [ ] Un producto con `usesSauces: true` abre `SauceSheet` al tocarlo; "Agregar" está desactivado hasta elegir 1 salsa incluida.
- [ ] Un combo con `sauceCount: 3` exige 3 salsas incluidas; con `sauceCount: 0` o ausente se agrega directo sin hoja.
- [ ] Se puede elegir la misma salsa dos veces como incluida.
- [ ] Un producto de $100 con 1 salsa incluida y 1 extra de $10 muestra la línea en $110; con cantidad 2 y la misma selección, $220.
- [ ] Dos selecciones de salsa distintas del mismo producto generan dos líneas; la misma selección repetida suma cantidad en una sola línea.
- [ ] Un producto sin `usesSauces` se agrega al carrito con tocar y su clave es su `id` (comportamiento actual).
- [ ] Con `usesSauces` y sin salsas habilitadas, el producto se agrega directo sin hoja.
- [ ] Una promo `percent` de 20 sobre un producto de $100 con un extra de $10 ahorra $20 (no $22) y la línea queda en $90.
- [ ] Una promo `bundle` 2×1 sobre un producto de $100 con dos líneas de cantidad 1 y distinta salsa ahorra $100 y el ahorro se muestra en la primera línea de ese producto.
- [ ] Una promo de venta de 10% con compra mínima $500 aplica con subtotal $500 formado por $480 de productos y $20 de extras.
- [ ] Una salsa deshabilitada o eliminada después de agregar la línea no rompe el carrito: la línea sigue visible y una salsa eliminada se muestra como "salsa eliminada" con extra $0.
- [ ] Cada línea del carrito muestra sus salsas incluidas y sus extras con precio; el título de `CartPanel` es "Nueva venta".
- [ ] Sin productos ni combos con salsas, los totales del carrito son idénticos a los de SPEC 04.
- [ ] Confirmar una venta crea `sales/{id}` con folio, `createdAt`, canal, líneas, subtotal, descuento de venta, total y método de pago, y actualiza `counters/sales` en la misma transacción.
- [ ] Dos ventas seguidas reciben folios consecutivos (ej. `1` y `2`); tras recargar el siguiente folio continúa la secuencia.
- [ ] En efectivo la venta guarda `received` y `change`; en tarjeta y transferencia esos campos no existen en el documento.
- [ ] Cambiar después el nombre o precio de un producto, combo o salsa no cambia el documento de ventas ya guardadas.
- [ ] Mientras guarda, "Confirmar venta" está desactivado y muestra "Guardando…"; tocarlo dos veces crea una sola venta.
- [ ] Si la transacción falla (sin red), `PaymentSheet` muestra el error, el carrito sigue intacto, no se crea ninguna venta y se puede reintentar.
- [ ] Al confirmar con éxito el carrito se vacía y se muestra el ticket con folio de 4 dígitos, fecha y hora, canal, cada línea con cantidad, nombre, salsas, extras y ahorro, subtotal, descuento de venta (si hay), total, método de pago y, en efectivo, recibido y cambio.
- [ ] "Imprimir" llama a `window.print()` y con `@media print` solo el ticket es visible.
- [ ] "Nueva venta" cierra el ticket y deja el POS listo con carrito vacío.
- [ ] `ReportsScreen` y Pedidos siguen mostrando sus datos mock, sin cambios.
- [ ] Un cambio de salsas en un dispositivo se ve en otro abierto, sin recargar, en menos de 3 s.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** catálogo global de salsas. Un solo lugar para precios y disponibilidad; listas por producto multiplicarían el trabajo de administración.
- **Sí:** 1 salsa incluida fija por unidad en productos y `sauceCount` (0–3) por combo. Cubre lo pedido sin un campo de cantidad en cada producto.
- **Sí:** salsa extra con precio propio de la salsa (`extraPrice`). Salsas distintas pueden costar distinto.
- **Sí:** incluidas obligatorias y repetibles. Evita ventas sin salsa por olvido y permite "2 de BBQ" en un combo de 2.
- **Sí:** selección en hoja inferior al tocar el producto. Es el momento en que el cliente la dice y no hay líneas incompletas en el carrito.
- **Sí:** clave de línea con la selección codificada (`{baseKey}#…`). Mantiene `Record<string, number>` y deja las claves de productos sin salsa idénticas a las actuales.
- **Sí:** promos de item sobre el precio base y la cantidad total del item. Los extras no se descuentan por producto, y variar la salsa no rompe un 2×1.
- **Sí:** extras dentro del subtotal de venta. Es dinero cobrado y cuenta para la compra mínima.
- **Sí:** los combos con salsa modifican el alcance de SPEC 04 ("combos sin espacios a elegir"), solo para salsas por pedido del usuario; no se abren otros modificadores.
- **Sí:** folio consecutivo con transacción en `counters/sales`. Folios sin huecos ni repetidos entre dispositivos; el costo es exigir conexión al confirmar.
- **Sí:** snapshot completo en `sales`. Sin él, editar precios cambiaría el historial.
- **Sí:** guardar canal, método, recibido y cambio. Permite reabrir el ticket completo en una spec futura.
- **Sí:** ticket como hoja en pantalla con `window.print()`. Cubre papel y PDF del navegador sin integrar hardware.
- **Sí:** `createSale` en `src/lib/sales.ts` y `buildSale` puro. La regla de snapshot se prueba sin Firestore.
- **Sí:** el estado del ticket vive en `App.tsx`. `CartScreen` se desmonta al volver al POS, y el ticket debe sobrevivir a eso.
- **No:** confirmar ventas sin conexión. Con folio consecutivo no se puede garantizar unicidad offline.
- **No:** folio por código corto o por conteo diario en cliente. Se pidió consecutivo y el conteo en cliente repite folios entre dispositivos.
- **No:** conectar Reportes ni Pedidos. Es otra spec que consume `sales`.
- **No:** anulaciones, reimpresión o historial. Primero hay que tener ventas guardadas.
- **No:** validar nombres de salsa duplicados. Se distingue por id, igual que SPEC 03.
- **No:** descontar inventario de salsas. No hay inventario modelado.

## Riesgos

| Riesgo                                                                                      | Mitigación                                                                                                    |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Spec grande (salsas, cambios de carrito/pricing, ventas y ticket)                           | Pasos 1–3 solo admin, 4 aislado en `pricing.ts`, 6 sin UI; cada paso es commiteable                           |
| Sin red la venta no se puede confirmar (la transacción falla)                               | Error visible en `PaymentSheet`, carrito intacto y reintento; cobrar offline queda para otra spec             |
| Doble toque en "Confirmar venta" crea dos ventas                                            | Botón desactivado mientras la promesa está pendiente                                                          |
| Una salsa se elimina o cambia de precio con líneas ya en el carrito                         | Salsa eliminada = "salsa eliminada" con extra $0; precios de extra se leen en vivo y se congelan al confirmar |
| El ahorro de una promo agrupada entre líneas se muestra solo en la primera línea del item   | Documentado; el total es correcto y el ticket guarda el ahorro en esa línea                                   |
| El navegador imprime la app entera en vez de solo el ticket                                 | `@media print` oculta todo salvo el ticket; criterio de aceptación explícito                                  |
| SPEC 04 documenta componentes de combo en texto libre pero el código actual usa `productId` | Esta spec se basa en el código actual (`ComboItem.productId`, `comboContents`); `contents` guarda su texto    |
| Las reglas abiertas de Firestore vencen el 30-nov-2026 y la app deja de leer o escribir     | La spec de Auth debe reemplazarlas antes de esa fecha                                                         |

## Lo que **no** está en esta spec

- Reportes y Pedidos con datos reales, historial, reimpresión, anulaciones o devoluciones.
- Impresora térmica, PDF, WhatsApp o correo; datos del negocio en el ticket.
- Ventas sin conexión.
- Salsas por producto, otros modificadores o inventario de salsas.
- Usuario que realiza la venta.
- Firebase Auth o reglas por usuario.
