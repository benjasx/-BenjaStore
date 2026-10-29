# SPEC 01 — Layout responsivo para desktop

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-10-28
> **Objetivo:** Adaptar todas las pantallas existentes a desktop (≥1024px) con clases responsivas de Tailwind, dejando la vista móvil actual intacta.

## Alcance

**Dentro:**

- Breakpoint desktop = `lg` (1024px). Por debajo de `lg` nada cambia.
- `Screen` (`src/components/Screen.tsx`): quitar `max-w-md` desde `lg`; el contenido usa ancho máx. ~1200px centrado.
- `BottomNav` (`src/components/BottomNav.tsx`): desde `lg` pasa a sidebar izquierdo fijo con las mismas 5 pestañas (`pos`, `orders`, `inventory`, `reports`, `more`).
- Vender + Carrito: desde `lg`, `PosScreen` muestra productos a la izquierda y el carrito a la derecha en la misma pantalla. Bajo `lg` el carrito sigue siendo pantalla aparte (`view = "cart"`).
- `LoginScreen` y `PinScreen`: tarjeta centrada, sin sidebar.
- `ReportsScreen`, `MoreScreen`, `MenuAdminScreen`: ancho amplio con sidebar; listas y tarjetas en grid de 2–3 columnas.
- `ProductFormScreen` y `ShiftCloseScreen`: columna centrada de ~640px dentro del área con sidebar.
- `PaymentSheet`: se muestra como diálogo centrado en desktop (hoja inferior en móvil).

**Fuera de alcance (specs futuras):**

- Funcionalidad nueva (las pestañas `orders` e `inventory` siguen sin pantalla).
- Rediseño visual, nuevos colores, tipografía o iconos.
- Modo tablet específico, orientación, o breakpoints adicionales.
- Atajos de teclado y optimizaciones para ratón.

## Modelo de datos

Esta feature no introduce estructuras de datos nuevas. Reutiliza `Product`, `NavTab` y el estado de `App.tsx`.

Convenciones:

- Breakpoint único: `lg:` (1024px). Estilos móvil sin prefijo, desktop con `lg:`.
- En `App.tsx`, la vista `cart` en desktop se resuelve renderizando el panel de carrito dentro de `PosScreen`; el estado `cart` y `changeQty` no cambian.

## Plan de implementación

1. `Screen.tsx` + `BottomNav.tsx`: sidebar desde `lg` y contenedor ancho (`lg:max-w-none`, contenido máx. ~1200px). Prueba manual: pantalla "Más" a 1280px muestra sidebar; a 390px, barra inferior igual que antes.
2. `LoginScreen` y `PinScreen`: tarjeta centrada en `lg`. Prueba manual a 1280px.
3. `ReportsScreen`, `MoreScreen`: grid de 2–3 columnas en `lg`.
4. `MenuAdminScreen`: grid de productos en `lg`.
5. `ProductFormScreen` y `ShiftCloseScreen`: columna centrada ~640px en `lg`.
6. `PosScreen` + `CartScreen` + `App.tsx`: panel de carrito lateral en `lg`; extraer el contenido del carrito en un componente reutilizable por ambos. Bajo `lg` conserva el flujo actual.
7. `PaymentSheet`: diálogo centrado en `lg`.
8. Actualizar `App.test.tsx` si algún test depende de la estructura modificada; correr `npm run typecheck`, `npm run lint`, `npm test`.

## Criterios de aceptación

- [ ] A 390px de ancho, ninguna pantalla cambia respecto al estado previo (barra inferior, `max-w-md`, carrito en pantalla aparte).
- [ ] A ≥1024px, `BottomNav` se muestra como sidebar izquierdo en Vender, Reportes, Más y Menú admin, y no aparece la barra inferior.
- [ ] A ≥1024px, Login y PIN se muestran como tarjeta centrada, sin sidebar.
- [ ] A ≥1024px, Vender muestra productos y carrito a la vez; agregar un producto actualiza el carrito sin cambiar de pantalla.
- [ ] A ≥1024px, "Cobrar" desde el panel abre `PaymentSheet` como diálogo centrado.
- [ ] A ≥1024px, Reportes, Más y Menú admin usan grid de 2–3 columnas.
- [ ] A ≥1024px, `ProductFormScreen` y `ShiftCloseScreen` ocupan una columna de ≈640px centrada.
- [ ] Ninguna pantalla tiene scroll horizontal a 1024px, 1280px y 1920px.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** un solo breakpoint `lg`. Evita estados intermedios y cubre tablets en horizontal.
- **Sí:** móvil intacto, con clases `lg:` sobre el código actual. Evita duplicar pantallas.
- **Sí:** sidebar en lugar de barra superior. Mejor uso del ancho y mantiene las 5 pestañas visibles.
- **Sí:** carrito en panel lateral en desktop. Cobrar sin cambiar de pantalla es el flujo más rápido en caja.
- **No:** versión desktop como pantallas separadas. Duplicaría mantenimiento.
- **No:** `md` (768px) como breakpoint. Las tablets verticales siguen con el layout móvil.
- **No:** pantalla dividida con panel de marca en Login. Innecesario para una herramienta de uso diario.

## Riesgos

| Riesgo                                                         | Mitigación                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Cambios en `Screen`/`BottomNav` rompen la vista móvil          | Criterio de aceptación explícito a 390px; todos los estilos nuevos con `lg:` |
| Duplicar la lógica de carrito entre `PosScreen` y `CartScreen` | Extraer el contenido del carrito a un componente compartido (paso 6)         |
| `LoginScreen.tsx` tiene cambios sin commitear                  | Revisar `git diff` antes de empezar la implementación                        |

## Lo que **no** está en esta spec

- Pantallas para `orders` e `inventory`.
- Rediseño visual o nuevas funcionalidades.
- Breakpoints distintos de `lg`, modo tablet o atajos de teclado.
