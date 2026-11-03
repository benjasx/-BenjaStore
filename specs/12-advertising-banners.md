# SPEC 12 — Banners de publicidad

> **Estado:** implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 04, SPEC 05, SPEC 08, SPEC 10
> **Fecha:** 2026-11-03
> **Objetivo:** Dar al Dueño una sección Más → Publicidad (`#/publicidad`) que arme y descargue en PNG y PDF dos banners, "Promo" (combos con foto y precio) y "Menú" (productos por categoría y salsas), con los datos registrados en la app.

## Por qué existe esta spec

El negocio hoy hace sus pósters (combos con foto y menú por categorías) a mano en un editor externo y repite precios que ya están en la app. Cada cambio de precio obliga a rehacerlos. Esta spec los genera desde `products`, `combos`, `sauces` e `images`, de modo que el cartel siempre refleja el menú vigente. Es una herramienta de consulta/exportación: no cambia ventas, productos ni combos.

## Alcance

**Dentro:**

- Nueva vista `advertising` (`#/publicidad`) en `src/screens/AdvertisingScreen.tsx`, solo para el Dueño. Se llega desde una nueva tarjeta "Publicidad" (subtítulo "Banners y carteles") en `MoreScreen`, junto a "Menú", "Corte" e "Historial de cortes".
- Selector de plantilla (`Segmented`): "Promo" y "Menú". Cada plantilla tiene su propia configuración, vista previa y descarga.
- **Plantilla "Promo"** (vertical, 3:4, como la imagen 1 de referencia):
  - Hasta 3 combos registrados, elegidos y ordenados por el Dueño. Cada bloque muestra nombre, componentes (`items` con cantidad, p. ej. "1 kg de alitas"), precio en etiqueta y la foto del combo (`images/{comboId}`); sin foto, el bloque se muestra sin imagen.
  - Encabezado con logo y nombre del negocio; pie con teléfono y dirección.
  - Solo se pueden elegir combos `enabled` y no `soldOut`.
- **Plantilla "Menú"** (horizontal, 16:9, como la imagen 2 de referencia):
  - Un bloque por categoría habilitada (orden de SPEC 03) con los productos elegidos de esa categoría, cada uno con nombre, descripción corta y precio, más un bloque "Salsas" con las salsas habilitadas, solo nombre (sin precio).
  - El Dueño elige con casillas qué productos entran y los ordena dentro de su categoría con botones subir/bajar. Las categorías sin productos elegidos no se dibujan.
  - Solo se pueden elegir productos no agotados (`soldOut` falso).
  - Encabezado con logo; recuadro de contacto con teléfono.
- **Plantilla "Producto"** (ampliación pedida por el usuario tras la implementación inicial): banner individual cuadrado (1080×1080, 1:1) de un solo producto: foto (`images/{productId}`), nombre, descripción (2 líneas), precio y datos de contacto de la marca. Se elige con un selector agrupado por categoría (productos no agotados de categorías habilitadas) y se guarda en `productBannerId`. Misma descarga PNG/PDF (`publicidad-product-YYYY-MM-DD.ext`; PDF A4 vertical). Implementada en `src/components/ProductBanner.tsx`.
- **Marca editable** (compartida por las dos plantillas): nombre del negocio, teléfono, dirección y texto del título de la plantilla Promo. Logo fijo `/logo_letras.jpeg` (el mismo de `reportPdf.ts`).
- **Persistencia** en un único documento `settings/advertising` (uno por plantilla, sin banners con nombre). Se escucha con `onSnapshot` (hook `useAdvertising`).
- **Precios, nombres y fotos siempre en vivo:** el documento guarda solo ids y orden. Si un id guardado ya no existe, está deshabilitado o agotado, se omite del banner y la lista de selección lo marca "No disponible" para que el Dueño lo quite; nunca se muestra un precio guardado.
- **Descarga:**
  - Botón "PNG": renderiza el banner a imagen a 2× con `html-to-image` y la descarga (`publicidad-promo-YYYY-MM-DD.png` / `publicidad-menu-YYYY-MM-DD.png`).
  - Botón "PDF": incrusta ese PNG en una página con `pdfmake` (`loadPdfMake` de `reportPdf.ts`), A4 vertical para Promo y A4 horizontal para Menú, imagen ajustada a la página (`publicidad-…-YYYY-MM-DD.pdf`).
  - Botones desactivados mientras carga, hay error, no hay elementos que mostrar o se está generando ("Generando…"); un fallo muestra "No se pudo generar el archivo. Inténtalo de nuevo." sin cerrar la pantalla.
- Estados: carga, error con `ErrorBanner` y reintento, sin combos registrados (plantilla Promo), sin productos registrados (plantilla Menú), nada elegido todavía.
- Permisos: nuevo permiso `manageAdvertising` solo para `owner` en `src/lib/permissions.ts`; la vista `advertising` entra en `allowedViews` solo con ese permiso; la guarda de vista redirige al Cajero a su inicio.
- Ruta `#/publicidad` en `src/lib/route.ts`.
- Dependencia nueva: `html-to-image` (versión fija, la única añadida).
- Lógica pura en `src/lib/advertising.ts` con pruebas; hooks `src/hooks/useAdvertising.ts`; componentes `src/components/PromoBanner.tsx` y `src/components/MenuBanner.tsx` (el banner en HTML/Tailwind, con tamaño fijo en px independiente de la pantalla); `src/lib/bannerExport.ts` para PNG/PDF.
- Diseño mobile-first con adaptación a escritorio (como SPEC 01): en móvil, formulario de selección arriba y vista previa escalada al ancho debajo (sin scroll horizontal); en escritorio, formulario y vista previa en dos columnas.

**Fuera de alcance (specs futuras):**

- Varios banners con nombre, plantillas adicionales o editor libre de bloques (título de bloque, posiciones, colores).
- Compartir directo (Web Share API), enviar por WhatsApp o correo, o publicar en redes.
- Elegir colores, tipografías o fondo del banner; subir logo propio (el logo es fijo).
- Banners con productos agotados que el Dueño quiera mostrar de todos modos, o con promociones (SPEC 04) aplicadas al precio mostrado: se muestra el precio de lista.
- Plantilla "Promo" con productos sueltos (solo combos; los productos sueltos van en la plantilla "Producto").
- Precios del banner distintos a los del menú (precio de campaña).
- Programar o fechar banners, o historial de banners generados.
- Cambios en productos, combos, categorías, salsas o imágenes: esta spec solo los lee.

## Modelo de datos

Nuevo documento `settings/advertising`. La colección `settings` no existía; el documento es único.

```ts
// src/lib/advertising.ts
export interface AdvertisingBrand {
  name: string; // nombre del negocio, 1–40 caracteres
  phone: string; // texto libre, hasta 20 caracteres
  address: string; // texto libre, hasta 60 caracteres, puede ir vacío
  promoTitle: string; // título del banner Promo, hasta 30 caracteres, puede ir vacío
}

export interface AdvertisingConfig {
  brand: AdvertisingBrand;
  promoComboIds: string[]; // 0–3 ids de `combos`, en orden de aparición
  menuProductIds: string[]; // ids de `products`; el orden relativo dentro de cada categoría es el orden de aparición
  productBannerId: string | null; // producto de la plantilla "Producto"
}

export const MAX_PROMO_COMBOS = 3;
export const DEFAULT_ADVERTISING: AdvertisingConfig; // brand "Doble Tentación", teléfono "81 4973 6481", dirección "Villas del Prado #127"; listas vacías
```

Lectura/escritura en `src/hooks/useAdvertising.ts`:

```ts
// onSnapshot sobre doc(db, "settings", "advertising"); documento ausente = DEFAULT_ADVERTISING.
export const useAdvertising: () => {
  config: AdvertisingConfig;
  loading: boolean;
  error: Error | null;
  retry: () => void;
  save: (config: AdvertisingConfig) => Promise<void>; // setDoc, reemplaza el documento
};
```

Lógica pura (sin Firestore) en `src/lib/advertising.ts`:

```ts
export interface PromoBlock {
  combo: Combo;
  image?: string;
}
export interface MenuBlock {
  category: Category;
  products: Product[];
}

// Resuelve ids contra los datos vivos: omite inexistentes, deshabilitados y agotados; conserva el orden guardado; máximo MAX_PROMO_COMBOS.
export const resolvePromo: (
  config: AdvertisingConfig,
  combos: Combo[],
  images: ImageMap,
) => PromoBlock[];

// Agrupa por categoría habilitada (orden de SPEC 03), productos en el orden de menuProductIds; omite categorías vacías.
export const resolveMenu: (
  config: AdvertisingConfig,
  products: Product[],
  categories: Category[],
) => MenuBlock[];

// Mueve un id una posición dentro de su categoría (subir/bajar); no cruza categorías.
export const moveProduct: (
  ids: string[],
  productId: string,
  direction: -1 | 1,
  products: Product[],
) => string[];

// Ids guardados que ya no se pueden mostrar, para marcarlos "No disponible".
export const unavailableIds: (
  ids: string[],
  available: { id: string }[],
) => string[];

export const bannerFileName: (
  template: "promo" | "menu",
  date: Date,
  ext: "png" | "pdf",
) => string; // publicidad-promo-YYYY-MM-DD.png

export const validateBrand: (brand: AdvertisingBrand) => string | null; // mensaje de error o null
```

Exportación en `src/lib/bannerExport.ts`:

```ts
export const downloadBannerPng: (
  node: HTMLElement,
  template: "promo" | "menu",
) => Promise<void>;
export const downloadBannerPdf: (
  node: HTMLElement,
  template: "promo" | "menu",
) => Promise<void>; // genera el PNG con html-to-image y lo incrusta con pdfmake
```

Permisos: `Permission` suma `"manageAdvertising"`; `View` suma `"advertising"`; `paths.advertising = "/publicidad"`.

Convenciones: el nombre de producto y combo se muestra en mayúsculas (`uppercase`, como SPEC 03/04); los precios se formatean como en el resto de la app (`$299`). Las fotos salen de `useImages` (SPEC 08), no del campo `image` heredado.

## Plan de implementación

1. `src/lib/advertising.ts` con `DEFAULT_ADVERTISING`, `resolvePromo`, `resolveMenu`, `moveProduct`, `unavailableIds`, `bannerFileName`, `validateBrand` y `advertising.test.ts` (ids inexistentes, combo agotado/deshabilitado, más de 3 combos, categorías vacías, orden, mover en los extremos).
2. `manageAdvertising` en `permissions.ts`, vista `advertising` en `View`/`allowedViews`, ruta en `route.ts`, con sus pruebas; `App.tsx` renderiza una `AdvertisingScreen` vacía con "Volver" a Más y la guarda redirige al Cajero.
3. Hook `useAdvertising` (lectura en vivo y `save`) con pruebas con Firestore simulado; tarjeta "Publicidad" en `MoreScreen` solo para el Dueño y su prueba.
4. `PromoBanner` y `MenuBanner` (HTML/Tailwind, tamaño fijo) con pruebas de render (bloques, precios, sin foto, categorías vacías omitidas, salsas).
5. `AdvertisingScreen`: selector de plantilla, formulario de marca, selección y orden de combos (Promo) y de productos (Menú), vista previa escalada y guardado, con estados de carga/error/vacío; pruebas de pantalla.
6. Instalar `html-to-image` y crear `src/lib/bannerExport.ts` con `downloadBannerPng`; botón "PNG" con estados "Generando…" y error.
7. `downloadBannerPdf` y botón "PDF"; pruebas de pantalla (botones desactivados, error); `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`.

## Criterios de aceptación

- [ ] El Dueño ve la tarjeta "Publicidad" en Más y al tocarla abre `#/publicidad`; el Cajero no la ve.
- [ ] Un Cajero que abre `#/publicidad` es redirigido a su vista de inicio.
- [ ] Refrescar en `#/publicidad` con sesión de Dueño válida conserva la vista.
- [ ] Con `settings/advertising` ausente, la pantalla muestra la marca por defecto y nada elegido, sin error.
- [ ] En "Promo" solo se pueden elegir combos habilitados y no agotados, con un máximo de 3; intentar elegir un cuarto no lo agrega.
- [ ] El bloque Promo muestra nombre, cada componente del combo con su cantidad, precio y foto de `images/{comboId}`; un combo sin foto se dibuja sin imagen y sin romper el diseño.
- [ ] En "Menú" hay un bloque por categoría con productos elegidos, en el orden de categorías de SPEC 03; una categoría sin productos elegidos no aparece.
- [ ] "Subir/bajar" cambia el orden de un producto solo dentro de su categoría y se refleja en la vista previa.
- [ ] El bloque "Salsas" lista las salsas habilitadas sin precio; sin salsas habilitadas no se dibuja.
- [ ] Cambiar el precio de un producto o combo en el menú actualiza el banner sin volver a guardar la selección.
- [ ] Un id guardado de un producto/combo eliminado, deshabilitado o agotado no aparece en el banner y se marca "No disponible" en la lista de selección.
- [ ] Editar nombre, teléfono, dirección y título y guardar persiste en `settings/advertising`; recargar los conserva. Un nombre vacío o más largo que el límite muestra error y no guarda.
- [ ] "PNG" descarga `publicidad-promo-YYYY-MM-DD.png` / `publicidad-menu-YYYY-MM-DD.png` con el banner completo (sin recortes) en proporción 3:4 (Promo) y 16:9 (Menú).
- [ ] "PDF" descarga `publicidad-…-YYYY-MM-DD.pdf` de una página, vertical para Promo y horizontal para Menú, con la imagen del banner ajustada a la página.
- [ ] "PNG" y "PDF" están desactivados con carga, error o nada que mostrar, y muestran "Generando…" mientras se crea el archivo.
- [ ] Un fallo al generar muestra "No se pudo generar el archivo. Inténtalo de nuevo." y la pantalla sigue usable.
- [ ] En un teléfono de 375 px la pantalla no tiene scroll horizontal y la vista previa cabe en el ancho; en escritorio formulario y vista previa van en dos columnas.
- [ ] La spec no modifica `products`, `combos`, `sauces`, `images`, `sales` ni `shifts` (solo escribe en `settings/advertising`).
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` pasan.

## Decisiones tomadas y descartadas

- **PNG y PDF, ambos:** PNG para redes/WhatsApp y PDF para imprimir. Descartado solo vista en pantalla (el cartel debe salir de la app).
- **Dos plantillas fijas (Promo y Menú), copia de las referencias:** cubre los dos carteles que ya usa el negocio. Descartado un editor libre de bloques por costo de interfaz y pruebas.
- **Promo = combos, no productos sueltos:** los combos ya traen componentes, precio y foto (SPEC 04); encaja con "Tentación Clásica $299". Descartado mezclar productos y combos.
- **El Dueño elige y ordena; el documento guarda solo ids:** precios y fotos siempre vivos, sin cartel desactualizado. Descartado tomar todo el menú automáticamente (un menú largo no cabe en 16:9) y descartado guardar copias de precios.
- **Un banner por plantilla en `settings/advertising`:** simple y suficiente. Descartado colección de banners con nombre y descartado no guardar nada (obligaría a rearmar el cartel cada vez).
- **Marca editable, logo fijo:** teléfono y dirección cambian con más frecuencia que el logo. Descartado hardcodear los textos; descartada la subida de logo (SPEC 08 maneja imágenes de producto, no de marca).
- **`html-to-image` en vez de canvas 2D:** el banner se diseña con las mismas herramientas que la app (Tailwind) y se exporta tal cual; el PDF reutiliza ese PNG con `pdfmake`, sin lógica de maquetación duplicada. Descartado dibujar a mano en canvas (frágil con texto y ajuste de líneas). Es la única dependencia nueva.
- **Precio de lista, sin promociones aplicadas:** el cartel anuncia el precio del menú; las promociones de SPEC 04 se calculan en el carrito, no por producto.
- **Nueva vista y permiso propios (`advertising`, `manageAdvertising`):** mantiene explícita la matriz de `permissions.ts` como en SPEC 11. Descartado reutilizar `manageMenu` (hoy coinciden, pero son responsabilidades distintas).
- **Banner en tamaño fijo y escalado en pantalla:** el PNG sale idéntico en cualquier dispositivo. Descartado renderizar al ancho de la pantalla (el resultado dependería del teléfono).

- **Plantilla "Producto" dentro de esta spec** (el usuario pidió implementarla aquí en vez de una spec aparte): reutiliza hooks, exportación y permisos. Descartados varios productos a la vez y banners individuales de combos.

## Riesgos identificados

- **Fotos y fuentes sin cargar al exportar:** `html-to-image` puede producir un PNG sin imágenes si aún no cargaron. Mitigación: esperar la carga de las `<img>` del banner antes de exportar y deshabilitar los botones hasta entonces.
- **Rendimiento en teléfonos modestos:** PNG a 2× de un banner con varias fotos en base64 (SPEC 08) puede tardar y gastar memoria. Mitigación: estado "Generando…" y un fallo se reporta sin cerrar la pantalla; si falla de forma recurrente se baja la escala a 1× en otra spec.
- **Texto largo que no cabe:** nombres o descripciones largas pueden desbordar el recuadro. Mitigación: límites de longitud en la marca y truncado de descripción a 2 líneas en el banner Menú.
- **Documento `settings/advertising` editable por cualquiera:** igual que SPEC 10/11, sin Firebase Auth el permiso solo oculta la interfaz.
- **Safari/iOS y descargas:** iOS puede abrir el PNG en una pestaña en lugar de descargarlo. Mitigación aceptada: el usuario lo guarda desde ahí; compartir directo queda para otra spec.

## Qué **no** entra en esta spec

- Varios banners guardados, más plantillas o editor libre.
- Compartir directo, enviar por WhatsApp/correo o publicar en redes.
- Colores, fondos o tipografías configurables; logo subido por el usuario.
- Plantilla Promo con productos sueltos; precios de campaña distintos al menú.
- Programación, fechas o historial de banners.
- Cualquier cambio en productos, combos, categorías, salsas, imágenes, ventas o turnos.
