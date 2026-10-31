# SPEC 03 — Categorías configurables del menú

> **Estado:** Aprobado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-31
> **Objetivo:** Permitir crear, renombrar, reordenar y habilitar/deshabilitar las categorías del menú desde Menú admin, guardadas en Firestore, y que cada producto pertenezca a una de ellas.

## Por qué existe esta spec

Hoy las categorías son una unión fija en `src/data/mock.ts` (`"Alitas" | "Boneless" | "Más" | "Bebidas" | "Extras"`). El negocio necesita armar el menú desde cero con sus propias secciones (tacos, burritos, bebidas, postres…) para que el vendedor encuentre rápido lo que pide el cliente. Los paquetes armados con productos individuales quedan para la SPEC 04, porque dependen de que los productos ya estén organizados.

## Alcance

**Dentro:**

- Nueva colección `categories` en Firestore, con sincronización en vivo y persistencia offline (mismo mecanismo que SPEC 02).
- "Categoría" y "sección" son el mismo concepto: una sola entidad.
- Operaciones: crear, renombrar, reordenar (botones subir/bajar) y habilitar/deshabilitar.
- Gestión desde `MenuAdminScreen`, con un botón "Editar categorías" que abre un panel dentro de la misma pantalla (sin vista nueva en `App.tsx`).
- Las pestañas de `PosScreen`, `MenuAdminScreen` y los chips de `ProductFormScreen` salen de `categories`, en el orden definido por `order`.
- Una categoría deshabilitada se oculta de `PosScreen`; en Menú admin sigue visible (atenuada) con sus productos visibles y editables.
- `Product.category` (texto fijo) pasa a `Product.categoryId` (id del documento en `categories`).
- Estado vacío sin categorías: `PosScreen` muestra un mensaje que dirige a Más → Menú, y `ProductFormScreen` desactiva "Guardar producto".
- Nuevo hook `src/hooks/useCategories.ts` con `loading`, `error` y `retry`; reutiliza `ErrorBanner` y `ProductsSkeleton` de SPEC 02.
- Se eliminan `Category` (unión) y `categories` de `src/data/mock.ts`.
- Edición de nombre con lápiz: en `CategoryEditor` el nombre se muestra de solo lectura; un icono de lápiz lo habilita para editar y se guarda al salir del campo o con Enter (Escape cancela).
- Nombres en mayúsculas en pantalla: el `name` de categorías y productos se muestra siempre en mayúsculas (clase `uppercase` de Tailwind) en POS, Menú admin, formulario de producto y carrito.
- Nombres en minúsculas en Firestore: `createCategory`, `renameCategory` y `addProduct` guardan `name` con `trim().toLowerCase()`, mediante una sola función `normalizeName` en `src/lib/text.ts`.

**Fuera de alcance (specs futuras):**

- Paquetes armados con productos individuales (SPEC 04).
- Eliminar categorías.
- Editar, mover o eliminar productos existentes.
- Reordenar con arrastrar y soltar.
- Jerarquía de dos niveles (sección que contiene categorías).
- Migración automática de productos con `category` en texto.
- Firebase Auth y reglas de seguridad por usuario.
- Convertir a minúsculas los documentos que ya existen en Firestore (se muestran en mayúsculas igualmente).
- Aplicar mayúsculas/minúsculas a `Product.group` (etiqueta) u otros textos.

## Modelo de datos

Colección `categories` en Firestore. Documento `categories/{categoryId}`:

```ts
// src/hooks/useCategories.ts
export interface Category {
  id: string; // doc.id, no se guarda en el documento
  name: string;
  order: number;
  enabled: boolean;
}
```

Cambio en `Product` (`src/data/mock.ts`) y en los documentos de `products`:

```ts
export interface Product {
  id: string;
  group: string;
  name: string;
  price: number;
  categoryId: string; // antes: category: Category
  soldOut?: boolean;
}
```

Convenciones:

- Categoría nueva: `enabled: true` y `order` = máximo `order` existente + 1 (0 si no hay ninguna).
- El cliente ordena `categories` por `order` y, en empate, por `name`; no hay índices compuestos.
- Subir/bajar intercambia el `order` de dos categorías contiguas en un solo `writeBatch`.
- Habilitar/deshabilitar y renombrar usan `updateDoc` de un solo campo (`enabled`, `name`).
- `name` (categorías y productos) se guarda sin espacios en los extremos, en minúsculas y no puede quedar vacío. Solo la capa de escritura normaliza; la UI nunca transforma el texto guardado, solo lo muestra en mayúsculas con CSS.
- `useProducts` deja de ordenar por categoría; ordena solo por `name`. Las pantallas filtran por `categoryId`.
- Estado del hook: `{ categories: Category[], loading: boolean, error: Error | null, retry: () => void }`.

## Plan de implementación

1. Paso manual: borrar en la consola de Firestore los documentos de `products` (solo son datos de prueba con `category` en texto). Las reglas actuales ya cubren `categories` (`/{document=**}`, vencen el 30-nov-2026).
2. Crear `src/hooks/useCategories.ts` con `Category`, `onSnapshot`, `loading`, `error` y `retry`. Verificación: crear un documento en `categories` desde la consola y verlo aparecer sin recargar.
3. Añadir al hook `createCategory`, `renameCategory`, `setCategoryEnabled` y `moveCategory` (`writeBatch` para el intercambio de `order`).
4. Panel "Editar categorías" en `MenuAdminScreen` (botón + lista con nombre editable, subir/bajar y toggle habilitada) y cableado en `App.tsx`. Verificación: crear dos categorías y ver los documentos en Firestore; las pestañas todavía usan el modelo anterior.
5. Migrar el modelo: `Product.categoryId`, quitar `Category` y `categories` de `mock.ts`, y que `PosScreen`, `MenuAdminScreen`, `ProductFormScreen` y `useProducts` usen `categories`. Incluye estados vacíos (mensaje en POS, "Guardar producto" desactivado) y la regla de pestaña activa. Este paso es atómico: el cambio de tipo rompe el typecheck hasta que todas las pantallas se actualizan.
6. Actualizar `App.test.tsx` mockeando `@/hooks/useCategories`; correr `npm run typecheck`, `npm run lint` y `npm test`.
7. Ajustes de nombres: crear `src/lib/text.ts` con `normalizeName` y usarla en `useCategories` y `useProducts`; aplicar `uppercase` a los nombres mostrados; cambiar el nombre de `CategoryEditor` a lectura con lápiz. Verificación: crear "Tacos" con "TaCos " guarda `tacos` en Firestore y se ve "TACOS" en pantalla. Se añade un test de `normalizeName`.

## Criterios de aceptación

- [ ] Con `categories` vacía, `PosScreen` muestra un mensaje que indica ir a Más → Menú, y en `ProductFormScreen` "Guardar producto" está desactivado.
- [ ] Crear la categoría "Tacos" desde "Editar categorías" crea un documento en `categories` con `enabled: true` y `order` correcto, y sigue ahí tras recargar.
- [ ] Al crear "Burritos" después, su `order` es el de "Tacos" + 1 y aparece a su derecha en las pestañas de POS y Menú admin.
- [ ] Renombrar una categoría cambia solo `name` en Firestore y sus productos siguen en ella.
- [ ] Subir/bajar intercambia el `order` de dos categorías y cambia el orden de las pestañas en POS, Menú admin y el formulario de producto.
- [ ] Deshabilitar una categoría la quita de las pestañas de `PosScreen`; en Menú admin sigue visible atenuada con sus productos visibles y con el toggle de agotado operativo.
- [ ] Volver a habilitarla la devuelve a `PosScreen`.
- [ ] Un producto nuevo se guarda con `categoryId` igual al id de la categoría elegida y aparece solo en la pestaña de esa categoría.
- [ ] Si la pestaña activa se deshabilita, `PosScreen` pasa a la primera categoría habilitada.
- [ ] Un cambio de categorías hecho en un dispositivo se ve en otro abierto, sin recargar, en menos de 3 s.
- [ ] Con la red cortada, las categorías cargan desde caché y los cambios sincronizan al reconectar.
- [ ] No existe ninguna acción para eliminar categorías en la UI.
- [ ] `src/data/mock.ts` ya no exporta `Category` ni `categories`, y ningún archivo los importa.
- [ ] En "Editar categorías" el nombre no es editable al hacer clic; al pulsar el lápiz el campo se habilita, Enter o salir del campo guardan y Escape cancela.
- [ ] Un nombre registrado como " TaCos " se guarda en Firestore como `tacos` (categorías y productos).
- [ ] Los nombres de categorías y productos se ven en mayúsculas en POS, Menú admin, formulario y carrito, aunque el documento esté guardado en minúsculas o con mayúsculas mezcladas.
- [ ] Renombrar con solo espacios o vacío no escribe en Firestore y restaura el nombre.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** categoría y sección son una sola entidad. Dos niveles complicarían el POS sin que el negocio lo necesite.
- **Sí:** separar paquetes en la SPEC 04. Son otro modelo de datos y la regla de tamaño de spec pide partir.
- **Sí:** `categoryId` en el producto (id del documento). Permite renombrar sin tocar productos.
- **Sí:** habilitar/deshabilitar en lugar de eliminar. Nunca hay productos huérfanos ni reglas extra; eliminar queda para otra spec si hace falta.
- **Sí:** categoría deshabilitada oculta solo en `PosScreen`. Menú admin mantiene todo visible para poder reactivarla y gestionar agotados.
- **Sí:** `ProductFormScreen` lista todas las categorías, incluidas las deshabilitadas, porque la decisión solo ocultó la categoría del POS.
- **Sí:** botones subir/bajar con intercambio de `order`. Funciona en celular y no necesita librería.
- **Sí:** panel dentro de Menú admin. Evita una vista nueva en `App.tsx` y una entrada en `MoreScreen`.
- **Sí:** empezar de cero borrando los datos de prueba a mano. No hay datos reales que migrar.
- **Sí:** minúsculas en la base y mayúsculas solo en pantalla. Un formato único evita duplicados por capitalización y la presentación se puede cambiar sin migrar datos.
- **Sí:** `normalizeName` en un solo módulo usado por las funciones de escritura de los hooks. Evita repetir la regla en cada pantalla.
- **Sí:** lápiz para editar el nombre. Evita renombrar por un clic accidental, sobre todo en celular.
- **No:** convertir datos existentes. Se muestran en mayúsculas igual; los nuevos o editados quedan normalizados.
- **No:** categoría por defecto "General". El usuario pidió construir el menú desde cero; el estado vacío guía a crearla.
- **No:** validar nombres duplicados. Se pospone; no se pidió y no rompe el modelo, porque se distingue por id.
- **No:** arrastrar y soltar. Requiere código táctil o librería y es difícil de probar.
- **No:** migración automática de `category` en texto. Solo hay datos de prueba.

## Riesgos

| Riesgo                                                                                  | Mitigación                                                                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Productos antiguos con `category` en texto quedan sin pestaña                           | Paso 1 los borra antes del cambio de modelo; un producto con `categoryId` inexistente simplemente no se muestra |
| Dos dispositivos crean categorías a la vez y obtienen el mismo `order`                  | El desempate por `name` mantiene un orden estable; subir/bajar lo corrige                                       |
| El cambio de tipo de `Product` rompe varias pantallas a la vez                          | El paso 5 se hace de una sola vez y se valida con `typecheck`                                                   |
| Deshabilitar por error todas las categorías deja el POS sin pestañas                    | `PosScreen` muestra el mismo mensaje del estado vacío, indicando ir a Más → Menú                                |
| Las reglas abiertas de Firestore vencen el 30-nov-2026 y la app deja de leer o escribir | La spec de Auth debe reemplazarlas antes de esa fecha                                                           |

## Lo que **no** está en esta spec

- Paquetes con productos individuales (SPEC 04).
- Eliminar categorías o editar/mover/eliminar productos.
- Arrastrar y soltar, jerarquía de dos niveles, validación de duplicados.
- Firebase Auth o reglas por usuario.
