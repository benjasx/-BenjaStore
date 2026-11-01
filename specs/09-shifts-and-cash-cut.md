# SPEC 09 — Turnos y corte de caja

> **Estado:** Aprobado.
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** 2026-11-01
> **Objetivo:** Persistir el turno de cada vendedor en Firestore (apertura con fondo inicial, retiros de efectivo y cierre con corte de caja calculado con las ventas reales del turno).

## Por qué existe esta spec

Hoy el turno es solo estado en memoria (`seller` + `shiftStart` en `App.tsx`) y `ShiftCloseScreen` muestra datos de ejemplo fijos. Al recargar se pierde el turno, las ventas no saben a qué turno pertenecen y no hay forma de cuadrar el efectivo. Esta spec hace real el ciclo abrir → vender → retirar → cerrar y deja guardado cada corte. Los "tickets de Pedidos y `ShiftCloseScreen` con datos de ejemplo" quedaron fuera en SPEC 07; el cierre de turno entra aquí.

## Alcance

**Dentro:**

- Apertura de turno:
  - Tras validar el PIN, `App.tsx` busca un turno abierto de ese vendedor. Si existe, lo retoma (misma `openedAt` y fondo) y va al POS; si no, muestra la hoja `src/components/OpenShiftSheet.tsx` que pide el **fondo inicial** (entero ≥ 0, máximo 99,999) y un botón "Abrir turno" con estados "Abriendo…" y error sin cerrar la hoja.
  - Sin turno abierto no se entra al POS. Cancelar la hoja vuelve al PIN.
  - `PosScreen` recibe la hora de apertura del turno persistido en lugar del `Date` local.
- Un turno abierto por vendedor; puede haber varios abiertos a la vez (distintos vendedores / dispositivos).
- Ventas del turno: `createSale` guarda `shiftId` del turno activo en cada venta nueva. Sin turno activo no se puede cobrar.
- Retiros de efectivo:
  - Botón "Retiro" de `ShiftCloseScreen` abre `src/components/WithdrawalSheet.tsx` con monto (entero > 0, no mayor al efectivo esperado actual) y motivo obligatorio (sin espacios en los extremos, máximo 60 caracteres).
  - Se guarda dentro del documento del turno y resta del efectivo esperado. Se listan en el corte con hora y motivo.
- `ShiftCloseScreen` con datos reales:
  - Encabezado: vendedor · hora de apertura – hora actual · número de tickets (ventas activas del turno).
  - Ventas totales y desglose por método (Efectivo, Tarjeta, Transfer.) sobre las ventas del turno **sin canceladas** (SPEC 07).
  - Efectivo en caja: fondo inicial + ventas en efectivo − retiros = esperado.
  - Campo "Efectivo contado" (entero ≥ 0, vacío al inicio, sin valor por defecto) y chip "Faltan $X" / "Sobran $X" según la diferencia.
  - Estados de lectura: carga, error con `ErrorBanner` y reintento, y turno sin ventas (todo en $0).
  - Botón "Cerrar turno" desactivado mientras no haya efectivo contado, con "Cerrando…" y error sin salir de la pantalla.
- Cierre:
  - Siempre se puede cerrar aunque haya diferencia; la diferencia se registra, sin nota ni autorización.
  - Se guarda un snapshot del corte en el documento del turno (ventas por método, tickets, esperado, contado, diferencia, `closedAt`). Una venta cancelada después del cierre **no** modifica el snapshot.
  - Tras cerrar se muestra un resumen final de solo lectura con el corte y un botón "Salir" que va al login (`onClose`).
  - El cierre es definitivo: no se reabre ni se edita. Cerrar un turno ya cerrado se rechaza.
- Cambio de usuario y cierre de sesión (`MoreScreen`): con turno abierto, ambas acciones llevan primero a `ShiftCloseScreen`; tras cerrar, "Cambiar usuario" va al PIN y "Cerrar sesión" al login. Un turno = un vendedor.
- `src/lib/shifts.ts` con la lógica y el acceso a Firestore; pruebas de la lógica pura en `src/lib/shifts.test.ts`.
- Hook `src/hooks/useShiftSales.ts` que lee las ventas de un `shiftId`.
- Actualizar `src/App.test.tsx` y añadir pruebas de `ShiftCloseScreen` / `OpenShiftSheet` / `WithdrawalSheet` para el nuevo flujo.

**Fuera de alcance (specs futuras):**

- Historial o listado de cortes pasados, y reportes de cortes en `ReportsScreen`.
- PDF o impresión del corte.
- Ingresos manuales de efectivo (entradas distintas al fondo inicial) y gastos con categorías.
- Corte parcial ("corte X") con el turno abierto, y arqueo de billetes/monedas por denominación.
- Reabrir o editar un turno cerrado; corregir el fondo inicial tras abrir.
- Cierre forzado de turnos huérfanos (vendedor que no volvió a cerrar) por un administrador.
- Permisos por rol, validar autorización para retiros o Firebase Auth.
- Asignar a un turno las ventas guardadas antes de esta spec.
- Turno compartido por caja entre varios vendedores.

## Modelo de datos

Nueva colección `shifts/{shiftId}`:

```ts
// src/lib/shifts.ts
export interface Withdrawal {
  amount: number; // entero > 0
  reason: string; // sin espacios en los extremos, no vacío, máximo 60
  at: Timestamp; // Timestamp.now() (dentro de arrays no se permite serverTimestamp)
}

export interface ShiftCut {
  tickets: number; // ventas activas del turno
  total: number;
  byMethod: Record<PaymentMethod, number>;
  expected: number; // openingFloat + byMethod.Efectivo − suma de retiros
  counted: number;
  difference: number; // counted − expected (negativo = faltan)
}

export interface Shift {
  id: string;
  seller: { id: string; name: string };
  openedAt: Timestamp; // serverTimestamp()
  openingFloat: number; // entero ≥ 0
  withdrawals: Withdrawal[];
  closedAt?: Timestamp; // presente = turno cerrado
  cut?: ShiftCut; // solo existe si closedAt existe
}

export const openShift: (
  seller: { id: string; name: string },
  openingFloat: number,
) => Promise<Shift>;

// where("seller.id", "==", id) y filtra en el cliente los que no tienen closedAt;
// un solo campo, sin índice compuesto. Si hay más de uno abierto devuelve el más reciente.
export const findOpenShift: (sellerId: string) => Promise<Shift | null>;

export const addWithdrawal: (
  shiftId: string,
  amount: number,
  reason: string,
) => Promise<void>; // rechaza si el turno está cerrado, el monto o el motivo son inválidos

export const buildCut: (
  shift: Pick<Shift, "openingFloat" | "withdrawals">,
  sales: Pick<Sale, "total" | "paymentMethod" | "cancelled">[],
  counted: number,
) => ShiftCut; // puro; ignora ventas canceladas

export const closeShift: (
  shiftId: string,
  counted: number,
) => Promise<ShiftCut>;
// transacción: lee el turno, rechaza si ya está cerrado, lee las ventas del turno,
// calcula buildCut y escribe closedAt + cut.
```

Cambio en `sales/{saleId}`: campo opcional `shiftId?: string` (en `Sale` y `SaleData`). Las ventas anteriores no lo tienen y no pertenecen a ningún turno.

Hook en `src/hooks/useShiftSales.ts`:

```ts
// Lee sales con where("shiftId", "==", shiftId). Un solo campo, sin índice compuesto.
// Lectura única; devuelve Sale[] (incluye canceladas, el cálculo las ignora).
export const useShiftSales: (shiftId: string | null) => {
  sales: Sale[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
};
```

Estado en `App.tsx`: se sustituye `shiftStart: Date | null` por `shift: Shift | null`. Los retiros se reflejan en ese estado al guardarse.

## Plan de implementación

1. `src/lib/shifts.ts`: tipos, `buildCut`, validaciones (fondo, retiro, motivo) con pruebas en `shifts.test.ts`. Sin Firestore todavía.
2. `openShift`, `findOpenShift`, `addWithdrawal`, `closeShift` contra Firestore; añadir `shiftId` a `Sale`/`SaleData`/`buildSale`/`createSale` con pruebas en `sales.test.ts`.
3. `OpenShiftSheet` y flujo de PIN en `App.tsx`: retomar turno abierto o pedir fondo; `shift` en estado; `PosScreen` usa `shift.openedAt`; `createSale` recibe `shiftId`. El POS sigue funcionando.
4. `useShiftSales` y `ShiftCloseScreen` con datos reales (ventas, desglose, esperado, contado, diferencia, estados de carga/error).
5. `WithdrawalSheet` y retiros reflejados en el corte.
6. Cierre: `closeShift`, resumen final y navegación a login; cambio de usuario y cierre de sesión pasan por el corte (`MoreScreen` / `App.tsx`).
7. Actualizar `App.test.tsx`, pruebas de pantallas y hojas; `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`.

## Criterios de aceptación

- [ ] Tras un PIN válido sin turno abierto aparece `OpenShiftSheet`; no se llega al POS hasta abrir el turno.
- [ ] Abrir con fondo 500 crea un doc en `shifts` con `seller`, `openedAt`, `openingFloat: 500` y `withdrawals: []`.
- [ ] El fondo vacío, negativo, decimal o mayor a 99,999 deshabilita "Abrir turno".
- [ ] Recargar la página y entrar con el mismo PIN retoma el turno abierto (no crea otro) y conserva la hora de apertura.
- [ ] Dos vendedores pueden tener turno abierto al mismo tiempo; cada corte solo suma sus ventas.
- [ ] Toda venta nueva guarda el `shiftId` del turno activo; las anteriores no se ven afectadas.
- [ ] `ShiftCloseScreen` ya no muestra montos ni textos de ejemplo: total, desglose por método y tickets coinciden con las ventas del turno.
- [ ] Una venta cancelada antes del cierre no cuenta en total, desglose, tickets ni efectivo esperado.
- [ ] Esperado = fondo + ventas en efectivo − retiros; verificado en `buildCut` con casos de prueba (sin ventas, solo tarjeta, con retiros, con cancelada).
- [ ] Un retiro con monto 0, mayor al esperado o sin motivo no se guarda; uno válido aparece en el corte y baja el esperado.
- [ ] "Cerrar turno" está desactivado hasta capturar efectivo contado; con diferencia ≠ 0 se muestra "Faltan"/"Sobran" y aun así cierra.
- [ ] Al cerrar, el doc del turno tiene `closedAt` y `cut` con esperado, contado y diferencia; cancelar después una venta no cambia `cut`.
- [ ] Cerrar un turno ya cerrado y registrar un retiro en uno cerrado se rechazan.
- [ ] "Cambiar usuario" y "Cerrar sesión" con turno abierto llevan al corte; tras cerrar, van al PIN y al login respectivamente.
- [ ] Con error de lectura de ventas se muestra `ErrorBanner` con reintento y no se permite cerrar.
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` pasan.

## Decisiones tomadas y descartadas

- **Turno en Firestore (`shifts`)** en lugar de solo memoria: sobrevive a recargas y deja base para historial de cortes. Descartado el modo en memoria porque pierde el dato al recargar.
- **Fondo inicial obligatorio tras el PIN** en lugar de apertura automática: sin fondo no hay cuadre de caja posible. Descartada la apertura silenciosa.
- **`shiftId` en cada venta** en lugar de filtrar por fechas y vendedor: exacto aunque se recargue o cambie el usuario. Descartado el filtro por rango porque cruza ventas de turnos distintos.
- **Un turno por vendedor, varios simultáneos permitidos**, retomado por PIN: soporta dos teléfonos sin bloqueos. Descartado el turno global único.
- **Cambiar usuario cierra el turno** (un turno = un vendedor): descartado el turno compartido de la caja. Aplicado también a "Cerrar sesión" por coherencia, decisión derivada de la anterior y no preguntada por separado.
- **Cierre con diferencia sin bloqueo ni nota**: la diferencia queda registrada. Descartado exigir nota para mantener el cierre rápido.
- **Corte = fondo + ventas en efectivo − retiros**: los retiros entran porque el botón "Retiro" ya existía en la pantalla de ejemplo. No hay ingresos extra.
- **Resumen en pantalla + doc guardado, sin PDF**: el PDF ampliaría el alcance; puede venir en una spec futura.
- **Snapshot inmutable en `cut`**: el corte cerrado no cambia si luego se cancela una venta; la diferencia contable se resolvería fuera de esta spec.
- **Filtrado de turno abierto en el cliente** (`where("seller.id")` + descartar con `closedAt`) para evitar índice compuesto, igual que en SPEC 07.
- **`Timestamp.now()` en retiros**: `serverTimestamp()` no está permitido dentro de arrays.

## Riesgos identificados

- **Turnos huérfanos:** un vendedor que no cierra deja el turno abierto indefinidamente; al volver con el PIN lo retoma, aunque sea de otro día. Mitigación diferida a una spec de cierre forzado.
- **Doble cierre desde dos dispositivos:** mitigado con la transacción de `closeShift` que rechaza si ya hay `closedAt`.
- **Ventas guardadas offline o en vuelo al cerrar:** una venta que llegue a Firestore después de calcular el corte queda fuera del snapshot. Aceptado; el cierre lee las ventas dentro de la transacción.
- **Pruebas existentes:** `App.test.tsx` asume entrar al POS justo tras el PIN; hay que simular el turno abierto o el fondo inicial.
