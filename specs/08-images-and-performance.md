# SPEC 08 — Manejo de imágenes y página rápida

> **Estado:** Implementado.
> **Depende de:** SPEC 02, SPEC 04
> **Fecha:** 2026-11-01
> **Objetivo:** Sacar las fotos de productos y combos de sus documentos a una colección aparte con un formato más liviano, y reducir lo que se descarga al abrir la app (carga por pantalla, logos optimizados, caché de hosting y PWA con actualización segura).

## Por qué existe esta spec

Hoy cada foto es un data URL JPEG de hasta 480 px guardado dentro del documento del producto o combo. Cada lectura de `products` y `combos` baja todas las fotos antes de poder pintar el POS, y el listado espera a lo más pesado. Además el bundle de entrada pesa ~900 kB (todas las pantallas, aunque se abra solo el login), los dos logos pesan ~700 kB sin optimizar y no hay configuración de caché de hosting ni service worker. Se hacen juntas porque comparten el objetivo (abrir y vender rápido), pero cada bloque es independiente: imágenes (pasos 3–6), carga y hosting (1, 2 y 7) y PWA (8). Si pesa demasiado, se puede partir en dos specs en el paso 7 sin rehacer nada.

## Alcance

**Dentro:**

- Nueva colección `images` en Firestore: `images/{ownerId}` guarda la foto de un producto o combo (el id del documento es el id del producto o del combo, ambos autogenerados y únicos). El documento del producto o combo deja de guardar `image`.
- Formato nuevo al cargar una imagen: lado mayor 320 px, WebP con calidad 0.8; si el navegador no puede codificar WebP desde el canvas (por ejemplo Safari), JPEG con calidad 0.8. Si el resultado pasa de 200 kB se reintenta con calidad 0.6.
- Hook `src/hooks/useImages.ts`: una sola suscripción en vivo a `images` (`onSnapshot`) con persistencia offline, que expone un mapa `ownerId → data URL`. No bloquea el listado: productos y precios se pintan primero con la imagen por defecto y las fotos llegan después.
- Lectura con compatibilidad: la foto de un producto o combo es `images[id]`, si no existe la imagen vieja `image` del documento, si no `DEFAULT_PRODUCT_IMAGE`. `PosScreen`, `MenuAdminScreen`, `ProductEditor`, `ProductFormScreen` y `ComboEditor` usan esa regla.
- Escritura: guardar o cambiar una foto escribe `images/{id}` y elimina el campo `image` viejo del documento en el mismo `writeBatch`; "Quitar" elimina `images/{id}` y el campo viejo; borrar un producto o combo elimina también `images/{id}`. Crear un producto o combo con foto usa una referencia con id reservado para escribir ambos documentos en un solo `writeBatch`.
- Migración única de imágenes existentes: botón "Migrar imágenes" en `MenuAdminScreen`, visible solo si algún producto o combo aún tiene `image` en su documento. Convierte cada foto al formato nuevo, crea `images/{id}`, elimina `image` y muestra el progreso y el total migrado. Es repetible: lo ya migrado no se vuelve a procesar.
- Carga diferida de pantallas con `React.lazy` y `Suspense`: `ReportsScreen`, `SalesScreen`, `MenuAdminScreen`, `ProductFormScreen` y `ShiftCloseScreen` salen del bundle de entrada. `LoginScreen`, `PinScreen`, `PosScreen`, `CartScreen` y `MoreScreen` se quedan en el de entrada. Dependencias grandes en chunks propios (`firebase`) para que el navegador los cachee aparte.
- Imágenes de la interfaz con `loading="lazy"`, `decoding="async"` y tamaño fijo (`width`/`height`) en las tarjetas de producto, el listado de administración y los combos.
- Logos optimizados: `public/logo_solo.jpeg` y `public/logo_letras.jpeg` se reemplazan por versiones redimensionadas de máximo 60 kB cada una, en JPEG (el PDF de `pdfmake` solo acepta JPEG y PNG). Mismos nombres de archivo, para no cambiar ninguna referencia.
- `index.html`: `preconnect` a `fonts.gstatic.com` además del actual a `fonts.googleapis.com`.
- `firebase.json` para Firebase Hosting (carpeta `dist`, reescritura a `index.html`) con cabeceras de caché: `/assets/**` con `public, max-age=31536000, immutable`; `index.html` y `sw.js` con `no-cache`; logos, íconos e imágenes públicas con `public, max-age=86400`. La compresión (gzip/brotli) la aplica Firebase Hosting por sí solo.
- PWA con `vite-plugin-pwa` (se verifica su compatibilidad con Vite 8 en el paso 8; si no es compatible se detiene y se decide con el usuario):
  - `manifest.webmanifest`: nombre "Doble Tentación", `display: standalone`, `start_url: /`, colores tomados de `src/index.css`, íconos 192 y 512 px generados de `logo_solo`.
  - Service worker con precaché del shell (HTML, JS, CSS, logos, íconos, `mock-product.svg`) y caché en ejecución de las fuentes de Google Fonts.
  - Actualización con aviso, no automática: al haber una versión nueva se muestra "Nueva versión disponible" con botón "Actualizar"; la página no se recarga sola. Razón: el carrito vive en memoria y una recarga a mitad de una venta lo perdería.
  - La app abre sin conexión después de la primera visita. Los datos siguen viniendo de la persistencia de Firestore.

**Fuera de alcance (specs futuras):**

- Firebase Storage u otro servicio de archivos, CDN de imágenes o redimensionado en el servidor.
- Recortar o editar la foto en pantalla, varias fotos por producto, galerías.
- Cobrar o confirmar ventas sin conexión (SPEC 05 exige conexión por el folio consecutivo): la PWA solo permite abrir la app y ver lo que ya está en caché.
- Notificaciones push y sincronización en segundo plano.
- Ejecutar el despliegue (`firebase deploy`) y crear el proyecto o `.firebaserc`: el repo no los tiene y quedan a cargo del usuario.
- Optimizar consultas de Reportes y Ventas más allá de cargarlas diferidas.
- Mover `logo_*` a WebP o SVG, y cambiar las fuentes de la marca.
- Reglas de seguridad de Firestore y Firebase Auth.

## Modelo de datos

Colección nueva `images`. Documento `images/{ownerId}`:

```ts
// src/hooks/useImages.ts
export interface ImageDoc {
  data: string; // data URL "data:image/webp;base64,..." o "data:image/jpeg;base64,..."
}

export type ImageMap = Record<string, string>; // ownerId → data URL
```

Cambios en tipos existentes:

```ts
// src/data/mock.ts y src/hooks/useCombos.ts
// Product.image y Combo.image pasan a ser solo lectura de compatibilidad:
// imagen vieja anterior a esta spec; la migración las elimina de Firestore.
// Ninguna escritura nueva las guarda.
```

Módulo `src/lib/image.ts`:

```ts
export const MAX_SIZE = 320;
export const fitSize: (
  width: number,
  height: number,
  max?: number,
) => { width: number; height: number }; // sin ampliar; conserva proporción

export const readImage: (file: File | Blob) => Promise<string>; // data URL nuevo formato
export const reencode: (dataUrl: string) => Promise<string>; // para migrar fotos viejas
export const pickImage: (
  id: string,
  images: ImageMap,
  legacy: string | undefined,
) => string | undefined; // images[id] ?? legacy; sin resolver el default
```

Operaciones nuevas en `src/lib/imageStore.ts`:

```ts
export const saveImage: (
  batch: WriteBatch,
  ownerId: string,
  data: string | undefined,
) => void;
// data definido → set images/{id}; undefined → delete images/{id}

export const migrateImages: (
  items: { id: string; collection: "products" | "combos"; image: string }[],
  onProgress: (done: number, total: number) => void,
) => Promise<number>; // devuelve cuántas migró
```

Convenciones:

- La imagen por defecto sigue siendo `DEFAULT_PRODUCT_IMAGE`; `useImages` no la incluye en el mapa.
- Un documento de `images` por dueño; reemplazar la foto sobrescribe el mismo documento.
- Todo cambio de foto junto con el del producto o combo va en un `writeBatch`, para no dejar un producto sin foto ni una foto huérfana.
- Los documentos de `products` y `combos` ya migrados no tienen `image`; los no migrados siguen mostrándose con su `image`.
- Archivos de `public/` mantienen su nombre actual.

## Plan de implementación

1. **Carga por pantalla.** Convertir `ReportsScreen`, `SalesScreen`, `MenuAdminScreen`, `ProductFormScreen` y `ShiftCloseScreen` en `React.lazy` dentro de `App.tsx` con un `Suspense` de carga, y partir `firebase` en un chunk propio en `vite.config.ts`. Añadir `preconnect` a `fonts.gstatic.com` en `index.html`. Verificación: `npm run build` muestra esas pantallas como chunks separados y el chunk de entrada pesa menos que 899 kB; anotar los tamaños antes y después en el mensaje de entrega.
2. **Logos e imágenes de la interfaz.** Reemplazar `public/logo_solo.jpeg` y `public/logo_letras.jpeg` por versiones redimensionadas de máximo 60 kB; añadir `loading="lazy"`, `decoding="async"` y tamaño fijo a las `<img>` de producto en `PosScreen`, `MenuAdminScreen` y combos. Verificación: los dos archivos pesan ≤ 60 kB, el login y el PDF (descargar uno de Reportes) siguen mostrando el logo.
3. **Formato nuevo de imagen.** Reescribir `src/lib/image.ts` (`fitSize`, `readImage` a 320 px WebP con fallback JPEG y reintento por tamaño, `reencode`, `pickImage`) y `src/lib/image.test.ts` para lo puro (`fitSize` sin ampliar, vertical, horizontal y cuadrada; `pickImage` con mapa, con imagen vieja y sin ninguna). Nada lo usa todavía salvo `ImagePicker`. Verificación: `npx vitest run src/lib/image.test.ts`; cargar una foto de 4000×3000 en un producto y ver que el valor guardado mide ≤ 320 px.
4. **Lectura desde `images`.** Crear `src/hooks/useImages.ts` (`onSnapshot`, mapa, `error`), conectarlo en `App.tsx` y pasar `images` a `PosScreen`, `MenuAdminScreen`, `ProductEditor`, `ProductFormScreen` y `ComboEditor`, que usan `pickImage`. Verificación: crear a mano `images/{idDeUnProducto}` desde la consola de Firestore con un `data` válido y ver esa foto en el POS sin recargar; los productos con `image` vieja siguen mostrando su foto.
5. **Escritura en `images`.** Crear `src/lib/imageStore.ts` (`saveImage`) y cambiar `addProduct`, `updateProduct`, `deleteProduct` en `useProducts.ts` y `createCombo`, `updateCombo`, `deleteCombo` en `useCombos.ts` para guardar o quitar la foto en `images/{id}` dentro del mismo `writeBatch` y eliminar el campo `image` viejo. Verificación: crear un producto con foto y comprobar en Firestore que el producto no tiene `image` y existe `images/{id}`; cambiarla, quitarla y borrar el producto, y ver en cada caso el estado de `images/{id}`.
6. **Migración.** Añadir `migrateImages` y el botón "Migrar imágenes" con progreso y mensaje de error en `MenuAdminScreen`. Verificación: con 2 productos con `image` vieja, pulsar el botón y ver que desaparecen sus campos `image`, existen sus `images/{id}`, las fotos se ven igual y el botón desaparece.
7. **Hosting.** Crear `firebase.json` con carpeta `dist`, reescritura a `index.html` y las cabeceras de caché descritas. Verificación: leer el archivo y comprobar con `npx firebase-tools emulators:start --only hosting` (o, ya desplegado, con `curl -I`) que `/assets/*.js` devuelve `immutable` y `/index.html` `no-cache`.
8. **PWA.** Instalar `vite-plugin-pwa` (verificar compatibilidad con Vite 8 antes de seguir), configurar manifest, íconos 192 y 512 generados de `logo_solo`, precaché del shell y caché de Google Fonts, y registrar el service worker con aviso "Nueva versión disponible" y botón "Actualizar" en un componente nuevo. Verificación: `npm run build` y `npm run preview`; en el navegador instalar la app, cortar la red y recargar para ver que abre el login; publicar un cambio visible y ver el aviso sin que se pierda el carrito.
9. **Pruebas y cierre.** Actualizar `App.test.tsx` mockeando `@/hooks/useImages`, probar el aviso de actualización y el botón de migración, y correr `npm run typecheck`, `npm run lint` y `npm test`.

## Criterios de aceptación

- [ ] Cargar una foto de 4000×3000 guarda en `images/{id}` un data URL cuyo lado mayor mide ≤ 320 px, en WebP (o JPEG si el navegador no codifica WebP) y pesa ≤ 200 kB.
- [ ] Un producto o combo nuevo con foto crea el documento y `images/{id}` en una sola operación, y el documento del producto no tiene `image`.
- [ ] Cambiar la foto sobrescribe `images/{id}`; "Quitar" elimina `images/{id}`; en ambos casos el documento del producto queda sin `image`.
- [ ] Borrar un producto o combo elimina también `images/{id}`.
- [ ] `fitSize` no amplía imágenes menores de 320 px y conserva la proporción en imágenes verticales y horizontales.
- [ ] Con `images` aún vacío o cargando, el POS muestra productos y precios con la imagen por defecto y las fotos aparecen al llegar, sin bloquear el listado.
- [ ] Un producto con `image` vieja en su documento y sin `images/{id}` sigue mostrando su foto.
- [ ] Si existen ambas, se muestra `images/{id}`.
- [ ] Un cambio de foto en un dispositivo se ve en otro abierto, sin recargar, en menos de 3 s.
- [ ] El botón "Migrar imágenes" solo aparece si algún producto o combo tiene `image` en su documento, muestra el progreso y, al terminar, esos documentos ya no tienen `image`, existen sus `images/{id}` y las fotos se ven igual.
- [ ] Ejecutar la migración dos veces no crea duplicados ni vuelve a procesar lo ya migrado.
- [ ] Si falla la migración de un elemento se muestra el error, lo ya migrado se conserva y se puede reintentar.
- [ ] `npm run build` muestra `ReportsScreen`, `SalesScreen`, `MenuAdminScreen`, `ProductFormScreen` y `ShiftCloseScreen` como chunks separados del de entrada, y el chunk de entrada pesa menos que los 899.48 kB actuales.
- [ ] Abrir una pantalla diferida muestra un estado de carga y luego la pantalla, sin pantalla en blanco.
- [ ] `public/logo_solo.jpeg` y `public/logo_letras.jpeg` pesan cada uno ≤ 60 kB y el login, la barra lateral y los PDF siguen mostrando el logo.
- [ ] Las `<img>` de productos tienen `loading="lazy"`, `decoding="async"`, `width` y `height`.
- [ ] `index.html` incluye `preconnect` a `fonts.googleapis.com` y a `fonts.gstatic.com`.
- [ ] `firebase.json` existe con `public: "dist"`, reescritura a `index.html`, `immutable` de un año para `/assets/**` y `no-cache` para `index.html` y `sw.js`.
- [ ] El build genera `manifest.webmanifest` con nombre, `display: standalone` e íconos de 192 y 512 px, y un service worker; la app se puede instalar desde el navegador.
- [ ] Tras la primera visita con red, recargar sin conexión abre la app (el login se ve).
- [ ] Al publicar una versión nueva se muestra "Nueva versión disponible"; la página no se recarga sola, el carrito se conserva y "Actualizar" carga la versión nueva.
- [ ] Las llamadas a Firestore no pasan por el service worker (la persistencia sigue siendo la de Firestore).
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** fotos en una colección `images` aparte y no dentro del documento. El listado de productos deja de cargar cientos de kB de fotos y se puede pintar primero; sin Storage, sin plan de pago y con caché offline de Firestore.
- **Sí:** el id del documento de `images` es el id del dueño. Evita un campo de referencia, la consulta es un `get` directo y no hay forma de que un producto apunte a la foto de otro.
- **Sí:** una sola suscripción a toda la colección `images` tras pintar el listado. La primera apertura baja las fotos una vez y después Firestore solo trae los cambios desde su caché; la lectura por tarjeta visible suma más código y una lectura por foto.
- **Sí:** 320 px y WebP, con JPEG de respaldo. Las tarjetas del POS se muestran bien por debajo de 320 px y WebP pesa notablemente menos que JPEG; `canvas.toDataURL("image/webp")` cae a PNG en Safari, por eso se verifica el tipo del resultado y se vuelve a JPEG.
- **Sí:** mantener los campos `image` viejos como lectura de compatibilidad con una migración manual. Ninguna foto se pierde si la migración no se ejecuta aún, y los documentos ya migrados no cargan peso muerto.
- **Sí:** migración con un botón visible solo mientras haga falta. Es explícita, repetible y no depende de abrir un script en consola.
- **Sí:** `writeBatch` para producto y foto. Un producto sin foto o una foto huérfana a medias serían estados difíciles de detectar.
- **Sí:** carga diferida de las cinco pantallas menos usadas durante la venta y el POS en el bundle de entrada. Quien vende abre login, PIN y POS; reportes, historial, menú y cierre pueden esperar. Las bibliotecas pesadas de PDF y Excel ya se cargan por `import()`.
- **Sí:** logos en JPEG y no en WebP. `pdfmake` solo admite JPEG y PNG, y se mantienen los nombres de archivo para no tocar referencias.
- **Sí:** `firebase.json` en el repo. Es la forma de fijar la caché del hosting actual; no se crea `.firebaserc` porque el id del proyecto vive fuera del repo.
- **Sí:** PWA con aviso de actualización y no con actualización automática. El carrito vive en memoria (SPEC 04); una recarga sorpresa a mitad de una venta lo perdería.
- **Sí:** PWA incluida en esta spec por pedido explícito del usuario, aunque se recomendaba separarla. Se deja como último paso, independiente del resto.
- **Sí:** "no lo he medido, optimizar lo evidente" como criterio: los pasos 1 y 2 anotan tamaños antes y después y se actúa solo sobre lo medido.
- **No:** Firebase Storage. Exige plan de pago y reglas propias, y el volumen (decenas de fotos de ≤ 200 kB) no lo justifica.
- **No:** subir la calidad o el tamaño para "pantallas retina". Las tarjetas son pequeñas y el peso importa más.
- **No:** vender sin conexión. SPEC 05 necesita conexión para el folio; la PWA no lo cambia.
- **No:** service worker propio escrito a mano. Mantener un precaché con hashes a mano es frágil; se usa un plugin y, si no es compatible con Vite 8, se detiene y se decide.
- **No:** reducir pesos de fuentes ni quitar Google Fonts. Se cachean con el service worker y quitarlas cambia la marca.

## Riesgos

| Riesgo                                                                                      | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| La spec abarca imágenes, carga, hosting y PWA                                               | Pasos independientes y ordenados; se puede cortar tras el paso 6 o 7 y mover la PWA a otra spec sin rehacer nada               |
| Una foto puede perderse al migrar si se interrumpe                                          | Se crea `images/{id}` antes de borrar `image` del documento; repetir la migración retoma lo pendiente                          |
| `vite-plugin-pwa` no soporta Vite 8                                                         | Se verifica al empezar el paso 8; si no es compatible, se detiene y se elige otra vía con el usuario                           |
| Caché desactualizada tras un despliegue (usuarios con la versión vieja)                     | `index.html` y `sw.js` con `no-cache`, aviso de "Nueva versión disponible" y botón "Actualizar"                                |
| El service worker sirve un shell viejo con un esquema de datos nuevo                        | El aviso de actualización se muestra en cuanto el navegador detecta el service worker nuevo; datos siempre vienen de Firestore |
| `canvas.toDataURL("image/webp")` devuelve PNG en algunos navegadores y la imagen pesa mucho | Se comprueba el prefijo del data URL y se vuelve a JPEG; límite de 200 kB con reintento a calidad 0.6                          |
| Una colección `images` grande se descarga entera en cada dispositivo nuevo                  | Volumen esperado de decenas de fotos de ≤ 200 kB; la caché persistente evita repetirlo; Storage queda para otra spec           |
| Las reglas abiertas de Firestore vencen el 30-nov-2026 y la app deja de leer o escribir     | La spec de Auth debe reemplazarlas y cubrir la nueva colección `images` antes de esa fecha                                     |
| Lazy loading deja una pantalla en blanco si falla la descarga del chunk (sin red)           | `Suspense` con estado de carga; las pantallas visitadas quedan en el precaché de la PWA                                        |

## Lo que **no** está en esta spec

- Firebase Storage, CDN o redimensionado en el servidor.
- Recortar o editar fotos en pantalla y varias fotos por producto.
- Ventas sin conexión, notificaciones push y sincronización en segundo plano.
- Ejecutar el despliegue, crear el proyecto de Firebase o `.firebaserc`.
- Cambios a las consultas de Reportes y Ventas más allá de la carga diferida.
- Nuevos formatos o cambios de marca en logos y fuentes.
- Firebase Auth y reglas por usuario.
