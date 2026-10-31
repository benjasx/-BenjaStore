# SPEC 04 — Combos y promociones

> **Estado:** Implementado.
> **Depende de:** SPEC 02, SPEC 03
> **Fecha:** 2026-10-31
> **Objetivo:** Permitir crear y gestionar combos libres (componentes que el usuario escribe, con cantidad, a precio fijo) y promociones automáticas (%, monto fijo, N×M y descuento a toda la venta) desde Menú admin, y aplicarlos en el carrito del POS.

## Por qué existe esta spec

SPEC 03 dejó los productos organizados en categorías y aplazó los paquetes. El negocio quiere vender paquetes (ej. burrito + refresco a un precio) armados a mano, sin depender de que cada componente sea un producto registrado y ofrecer descuentos sin tocar el precio de cada producto. Se decidió hacer ambos en una sola spec aunque son dos modelos de datos; por eso el plan los separa en pasos independientes (combos primero, promociones después) y el cálculo de precios vive en un módulo puro y testeable.

## Alcance

**Dentro:**

- Nueva colección `combos` en Firestore, con sincronización en vivo y persistencia offline (mismo mecanismo que SPEC 02 y 03).
- Nueva colección `promotions` en Firestore, mismo mecanismo.
- Combo libre = lista de componentes escritos a mano con cantidad (`{ name, qty }`) a un precio fijo. Los componentes no son productos registrados ni se vinculan a ellos. Sin opciones a elegir.
- Operaciones de combos: crear, editar (nombre, precio, descripción, imagen, componentes), eliminar y habilitar/deshabilitar.
- Combo agotado manual: el combo tiene su propio `soldOut`, que se cambia con un toggle en Menú admin (como los productos). Un combo agotado se ve en el POS pero no se puede agregar.
- Pestaña fija "Combos" en `PosScreen` y `MenuAdminScreen`, fuera de `categories` y al final de las pestañas. En POS aparece si hay al menos un combo habilitado; en Menú admin aparece siempre.
- Promociones automáticas, aplicadas mientras estén activas (toggle manual `enabled`, sin fechas ni horarios):
  - Sobre un producto o combo concreto: porcentaje, monto fijo por unidad, o N×M (lleva N, paga M; el 2×1 es N=2, M=1).
  - Sobre toda la venta: porcentaje o monto fijo, con compra mínima opcional.
- Operaciones de promociones: crear, editar, eliminar y activar/desactivar.
- Si varias promociones de producto/combo aplican a la misma línea, gana la de mayor ahorro. Lo mismo entre promociones de venta. La de venta se calcula después, sobre el subtotal ya descontado.
- Gestión desde `MenuAdminScreen` con botones "Combos" y "Promociones" que abren paneles dentro de la misma pantalla (sin vista nueva en `App.tsx` ni entrada en `MoreScreen`).
- El carrito (`CartPanel`, `CartScreen`) y la barra "Cobrar" de `PosScreen` muestran y cobran el total con descuentos; cada línea con descuento muestra el ahorro, y hay una línea de descuento de venta.
- Nuevos hooks `src/hooks/useCombos.ts` y `src/hooks/usePromotions.ts`, con `loading`, `error` y `retry`.
- Nuevo módulo puro `src/lib/pricing.ts` con el cálculo del carrito.
- Pestañas de `MenuAdminScreen` y `PosScreen` (categorías y "Combos") en cuadrícula de 6 columnas que salta de fila (3 columnas en pantallas estrechas), sin scroll horizontal.
- Iconos SVG en `BottomNav` (Vender, Pedidos, Inventario, Reportes, Más) en lugar de los cuadrados de relleno, en la barra lateral y la inferior.
- Nombres de combos y promociones: se guardan con `normalizeName` y se muestran con `uppercase`, igual que SPEC 03.

**Fuera de alcance (specs futuras):**

- Combos con espacios a elegir ("elige 1 bebida") y modificadores.
- Promociones con fechas, días u horarios, o con cupones/códigos.
- Promociones sobre una categoría completa o sobre varios items a la vez.
- Que el cajero elija o aplique una promoción a mano en el carrito.
- Apilar promociones sobre una misma línea o bloquear promociones solapadas al guardar.
- Persistir ventas o tickets (el carrito sigue en memoria), por lo que no hay historial de precios ni reportes de descuentos.
- Cobertura de impuestos o propinas sobre el total con descuento.
- Descontar inventario de los componentes del combo.
- Reordenar combos o promociones.
- Firebase Auth y reglas de seguridad por usuario.

## Modelo de datos

Colección `combos`. Documento `combos/{comboId}`:

```ts
// src/hooks/useCombos.ts
export interface ComboItem {
  name: string; // texto libre, normalizado con normalizeName, no vacío
  qty: number; // entero >= 1
}

export interface Combo {
  id: string; // doc.id, no se guarda en el documento
  name: string;
  price: number; // precio fijo del combo, >= 0
  items: ComboItem[]; // al menos 1
  enabled: boolean;
  soldOut?: boolean; // ausente = disponible
  description?: string;
  image?: string;
}
```

Colección `promotions`. Documento `promotions/{promotionId}`:

```ts
// src/hooks/usePromotions.ts
export type Discount =
  | { type: "percent"; value: number } // 1..100
  | { type: "amount"; value: number } // > 0
  | { type: "bundle"; buy: number; pay: number }; // buy > pay >= 1, solo en promos de item

export type PromotionTarget = { kind: "product" | "combo"; id: string };

export type Promotion =
  | {
      id: string;
      name: string;
      enabled: boolean;
      scope: "item";
      target: PromotionTarget;
      discount: Discount;
    }
  | {
      id: string;
      name: string;
      enabled: boolean;
      scope: "sale";
      discount: Exclude<Discount, { type: "bundle" }>;
      minSubtotal?: number; // compra mínima sobre el subtotal ya descontado por promos de item
    };
```

Carrito (`App.tsx`): sigue siendo `Record<string, number>`. Los productos usan su `id` como clave; los combos usan `combo:{comboId}`.

Cálculo en `src/lib/pricing.ts` (sin Firestore, sin React):

```ts
export interface CartLine {
  key: string; // clave del carrito
  name: string;
  qty: number;
  unitPrice: number;
  gross: number; // unitPrice * qty
  saving: number; // ahorro de la mejor promo de item, 0 si no hay
  promotionName?: string;
}

export interface CartTotals {
  lines: CartLine[];
  subtotal: number; // suma de (gross - saving)
  saleSaving: number;
  saleName?: string;
  total: number; // subtotal - saleSaving, nunca negativo
}
```

Reglas de cálculo:

- `percent`: ahorro de línea = `round(gross * value / 100)`.
- `amount` (item): ahorro de línea = `min(value * qty, gross)`.
- `bundle`: ahorro de línea = `floor(qty / buy) * (buy - pay) * unitPrice`.
- `amount` (venta): ahorro = `min(value, subtotal)`; `percent` (venta): `round(subtotal * value / 100)`.
- Una promo de venta solo aplica si `subtotal >= minSubtotal` (o no hay mínimo).
- Una promo de item cuyo `target` ya no existe, o una promo deshabilitada, no tiene efecto. En Menú admin se marca "Elemento eliminado".
- `total` nunca es negativo.

Convenciones:

- Los precios son enteros (misma convención de `money` en `src/data/mock.ts`).
- `name` se guarda sin espacios en los extremos y en minúsculas con `normalizeName` (`src/lib/text.ts`); no puede quedar vacío.
- Combo nuevo y promoción nueva: `enabled: true`. Combo nuevo: sin `soldOut`.
- Los nombres de los componentes se guardan con `normalizeName`; se descartan los componentes con nombre vacío.
- Editar un combo o promoción usa `updateDoc`; `description` e `image` vacíos se eliminan con `deleteField()`, como `updateProduct`.
- El cliente ordena `combos` y `promotions` por `name`; no hay índices compuestos.
- Estado de cada hook: `{ <combos|promotions>: [...], loading, error, retry }`.

## Plan de implementación

1. Crear `src/lib/pricing.ts` con `computeCart` y sus tipos, y `src/lib/pricing.test.ts` con los casos de las reglas de cálculo (percent, amount, bundle, venta con y sin mínimo, mejor promo gana, target faltante, total nunca negativo). Nada lo usa todavía. Verificación: `npx vitest run src/lib/pricing.test.ts`.
2. Crear `src/hooks/useCombos.ts` con `Combo`, `onSnapshot`, `loading`, `error`, `retry`, `createCombo`, `updateCombo`, `deleteCombo`, `setComboEnabled` y `setComboSoldOut`. Verificación: crear un documento en `combos` desde la consola y verlo aparecer en el hook sin recargar.
3. Crear `src/hooks/usePromotions.ts` con `Promotion`, `Discount`, `onSnapshot`, `loading`, `error`, `retry`, `createPromotion`, `updatePromotion`, `deletePromotion` y `setPromotionEnabled`. Verificación: igual que el paso 2 con `promotions`.
4. Cablear ambos hooks en `App.tsx` y crear `src/components/ComboEditor.tsx`: lista de combos con toggle habilitado, formulario de crear/editar (nombre, precio, descripción, `ImagePicker`, lista editable de componentes con nombre libre y cantidad) y eliminar, más un toggle de agotado. Añadir el botón "Combos" y la pestaña fija "Combos" a `MenuAdminScreen`; los combos agotados se marcan "Agotado". Verificación: crear un combo, recargar y seguir viéndolo; el POS todavía no lo muestra.
5. Crear `src/components/PromotionEditor.tsx` y el botón "Promociones" en `MenuAdminScreen`: lista con toggle activa, formulario de crear/editar (tipo de promo, objetivo producto o combo, descuento, compra mínima para venta) y eliminar. Verificación: crear una promo de cada tipo y ver los documentos en Firestore; el carrito todavía no las aplica.
6. Aplicar el pricing en el carrito: `PosScreen`, `CartPanel` y `CartScreen` reciben `combos` y `promotions`, calculan con `computeCart`, muestran el ahorro por línea, la línea de descuento de venta y el total descontado en "Cobrar" y en `PaymentSheet`. Sin combos ni promociones el comportamiento es idéntico al actual. Verificación: con una promo del 20% activa en un producto, el total del carrito baja un 20% de esa línea.
7. Pestaña "Combos" en `PosScreen`: tarjetas con la misma presentación que los productos, que agregan `combo:{id}` al carrito; combos agotados deshabilitados con etiqueta "AGOTADO". Verificación: agregar un combo, ver sus componentes en el detalle de la línea y su precio fijo en el total.
8. Actualizar `App.test.tsx` mockeando `@/hooks/useCombos` y `@/hooks/usePromotions`; correr `npm run typecheck`, `npm run lint` y `npm test`.

## Criterios de aceptación

- [ ] Crear un combo con nombre, precio y al menos un componente (nombre libre y cantidad) crea un documento en `combos` con `enabled: true` y sigue ahí tras recargar.
- [ ] No se puede guardar un combo sin nombre, con precio negativo o sin componentes.
- [ ] Un combo guardado como " Combo Uno " queda en Firestore como `combo uno` y se ve "COMBO UNO" en pantalla.
- [ ] Editar un combo cambia solo los campos modificados; vaciar descripción o imagen elimina el campo en Firestore.
- [ ] Eliminar un combo lo quita de Firestore y del POS.
- [ ] Deshabilitar un combo lo quita de la pestaña "Combos" del POS; en Menú admin sigue visible atenuado y se puede reactivar.
- [ ] Al marcar un combo como agotado, se ve "AGOTADO" en POS y Menú admin y no se puede agregar al carrito; al reactivarlo vuelve a estar disponible.
- [ ] Un combo puede incluir componentes que no existen como productos registrados.
- [ ] La pestaña "Combos" no aparece en el POS sin combos habilitados y sí aparece en Menú admin.
- [ ] Agregar un combo al carrito suma su precio fijo (no la suma de sus productos) y la línea muestra qué componentes incluye.
- [ ] Una promo `percent` de 20 sobre un producto de $100 con cantidad 2 muestra ahorro $40 y total $160.
- [ ] Una promo `amount` de $15 sobre un producto de $100 con cantidad 2 muestra ahorro $30; con un producto de $10 el ahorro nunca supera el precio de la línea.
- [ ] Una promo `bundle` 2×1 sobre un producto de $100: cantidad 3 muestra ahorro $100 y total $200; cantidad 1 no tiene ahorro.
- [ ] Una promo de venta de 10% con compra mínima $500 no aplica con subtotal $499 y sí con $500.
- [ ] Con dos promos activas sobre el mismo item, solo se aplica la de mayor ahorro.
- [ ] Una promo de venta se calcula sobre el subtotal ya descontado por las promos de item.
- [ ] Desactivar una promoción la quita del cálculo del carrito sin recargar; reactivarla la devuelve.
- [ ] Una promo de item cuyo producto o combo fue eliminado no afecta el total y se marca "Elemento eliminado" en Menú admin.
- [ ] El total nunca es negativo.
- [ ] El total mostrado en la barra "Cobrar" de `PosScreen`, en `CartPanel` y en `PaymentSheet` es el mismo valor con descuentos.
- [ ] Un cambio de combos o promociones en un dispositivo se ve en otro abierto, sin recargar, en menos de 3 s.
- [ ] Con la red cortada, combos y promociones cargan desde caché y los cambios sincronizan al reconectar.
- [ ] Sin combos ni promociones, el flujo de venta y los totales son idénticos a los actuales.
- [ ] Las pestañas de Menú admin y del POS se muestran en filas de 6 (3 en pantallas estrechas), las que sobran pasan a la fila de abajo y no hay scroll horizontal.
- [ ] Cada pestaña de `BottomNav` muestra un icono representativo; el activo se distingue en color dorado.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** combos y promociones en una sola spec, por pedido del usuario, aunque la regla de tamaño sugería partirla. Se mitiga con pasos independientes y con `pricing.ts` aislado.
- **Sí:** combo libre con componentes de texto y cantidad (`{ name, qty }`). Permite armar paquetes sin depender del catálogo y cubre "burrito + refresco" sin la complejidad de espacios a elegir.
- **Sí:** pestaña fija "Combos" fuera de `categories`. Un combo mezcla productos de varias categorías y no pertenece a ninguna.
- **Sí:** agotado del combo manual (`soldOut` propio). Al no estar vinculado a productos, no hay estado del que derivarlo.
- **Sí:** editar y eliminar combos y promociones. Se replica lo que ya existe en `useProducts`.
- **Sí:** habilitar/deshabilitar en lugar de depender solo de eliminar. Permite pausar sin perder la configuración.
- **Sí:** promociones automáticas con toggle manual. El cajero no decide nada en la venta y no hay fechas que gestionar.
- **Sí:** promoción sobre un solo producto o combo. Es la forma más simple de validar y probar.
- **Sí:** gana la promoción de mayor ahorro por línea. Evita totales impredecibles sin pedir validación al guardar.
- **Sí:** descuento de venta sobre el subtotal ya descontado y con compra mínima opcional. Evita descontar dos veces sobre el mismo ahorro.
- **Sí:** `pricing.ts` puro. Toda la regla de dinero se prueba sin Firestore ni React.
- **Sí:** clave `combo:{id}` en el carrito. Mantiene `Record<string, number>` y evita cualquier colisión con ids de productos.
- **Sí:** paneles dentro de Menú admin. Mismo patrón que "Editar categorías"; evita una vista nueva en `App.tsx`.
- **Sí:** la pestaña "Combos" del POS se muestra con al menos un combo habilitado, aunque estén agotados, para que el cajero vea que existen. Distinto de las categorías, que se ocultan si todos sus productos están agotados.
- **Sí:** pestañas de Menú admin y del POS en cuadrícula, por pedido del usuario durante la implementación, aunque es ajuste de SPEC 03.
- **Sí:** iconos en la navegación principal, por pedido del usuario durante la implementación. Iconos por categoría quedan fuera.
- **No:** espacios a elegir ni modificadores en combos. Otro modelo de datos y de carrito.
- **No:** fechas, horarios o cupones. No se pidieron.
- **No:** promociones por categoría o por varios items. Se pidió un producto o combo concreto.
- **No:** acumular promociones. Requeriría topes para no llegar a totales negativos.
- **No:** persistir ventas. Sin historial de ventas no hay snapshot de precios ni reporte de descuentos; es otra spec.
- **No:** validar nombres duplicados. Se distingue por id, igual que en SPEC 03.

## Riesgos

| Riesgo                                                                                         | Mitigación                                                                                          |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Spec grande (dos modelos de datos y cambios en carrito, POS y Menú admin)                      | Pasos 1 a 3 sin UI; 4 y 5 solo admin; 6 y 7 tocan el POS; cada paso es commiteable                  |
| Redondeo de `percent` produce centavos distintos entre pantallas                               | Un único `computeCart` en `pricing.ts`; todas las pantallas leen su resultado                       |
| Una promoción queda huérfana al eliminar su producto o combo                                   | Promo sin efecto y marcada "Elemento eliminado"                                                     |
| Se cobra un precio distinto al que el cajero vio por edición simultánea desde otro dispositivo | Precio de combo y promos se leen en vivo (`onSnapshot`); el total del cobro es el del último render |
| Dos promos con el mismo ahorro generan un resultado inestable                                  | Desempate por `name` en `computeCart`                                                               |
| Las reglas abiertas de Firestore vencen el 30-nov-2026 y la app deja de leer o escribir        | La spec de Auth debe reemplazarlas antes de esa fecha                                               |

## Lo que **no** está en esta spec

- Combos con opciones a elegir o modificadores.
- Promociones con fechas, horarios, cupones, por categoría o por varios items.
- Aplicar promociones a mano desde el carrito o acumularlas.
- Persistir ventas, tickets o reportes de descuentos.
- Reordenar combos o promociones.
- Firebase Auth o reglas por usuario.
