# SPEC 02 — Persistencia de productos en Firebase

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-10-31
> **Objetivo:** Reemplazar la lista de productos en memoria por una colección `products` en Firestore, sincronizada en vivo entre dispositivos y con persistencia offline.

## Por qué existe esta spec

Hoy `App.tsx` guarda `products` en `useState` sembrado desde `src/data/mock.ts`: al recargar se pierde todo y cada dispositivo ve datos distintos. Es el primer paso de consistencia de datos; ventas, turnos, usuarios y autenticación quedan para specs posteriores.

## Alcance

**Dentro:**

- Dependencia `firebase` (SDK modular) y proyecto Firebase con Firestore creado manualmente en la consola.
- Config por variables `VITE_FIREBASE_*` en `.env.local` (ignorado por git) y `.env.example` commiteado.
- Nuevo `src/lib/firebase.ts`: inicializa la app y Firestore con caché persistente multi-pestaña (`persistentLocalCache` + `persistentMultipleTabManager`).
- Nuevo `src/hooks/useProducts.ts`: suscripción `onSnapshot` a `products`, más `addProduct` y `setSoldOut`.
- `App.tsx` usa `useProducts` en lugar de `useState(seedProducts)`; `crypto.randomUUID()` se elimina (el id lo genera Firestore).
- `setSoldOut` escribe con `updateDoc` solo del campo `soldOut` (última escritura gana).
- Estado de carga (skeleton) en `PosScreen` y `MenuAdminScreen`, y banner de error con botón "Reintentar".
- Colección vacía = estado vacío con mensaje; los productos se dan de alta a mano desde Menú admin (sin script de seed ni autoseed).
- Quitar el array `products` de `src/data/mock.ts`; se conservan `Category`, `Product`, `categories`, `users`, `channels` y `money`.

**Fuera de alcance (specs futuras):**

- Firebase Auth; `LoginScreen` y `PinScreen` siguen siendo mock.
- Ventas/cobros, turnos (`ShiftCloseScreen`), usuarios, carrito persistente.
- Editar o eliminar productos (hoy solo existen alta y agotado).
- Reglas de seguridad por usuario y rol.
- Script de seed o migración de los 11 productos de `mock.ts`.
- Transacciones o control de versiones para conflictos.

## Modelo de datos

Colección `products` en Firestore. Cada documento es un `Product` sin el campo `id` (el id del documento):

```ts
// products/{productId}
{
  group: string,
  name: string,
  price: number,
  category: Category, // "Alitas" | "Boneless" | "Más" | "Bebidas" | "Extras"
  soldOut?: boolean,
}
```

Convenciones:

- `Product.id` en el cliente = `doc.id`; no se guarda dentro del documento.
- Orden: el cliente ordena por `category` según `categories` y luego por `name`; no hay índices compuestos.
- Variables de entorno: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- Estado del hook: `{ products: Product[], loading: boolean, error: Error | null, retry: () => void }`.

## Plan de implementación

1. Paso manual: crear proyecto Firebase y Firestore (modo producción) en la consola; registrar la app web y copiar la config a `.env.local`. Crear `.env.example` y añadir `.env.local` a `.gitignore`. Verificación: `git status` no muestra `.env.local`.
2. `npm install firebase` y crear `src/lib/firebase.ts` con la inicialización y caché persistente. Verificación: `npm run dev` arranca sin errores en consola.
3. Crear `src/hooks/useProducts.ts` con `onSnapshot`, `loading`, `error` y `retry`. Verificación manual: crear un documento en la consola de Firestore y verlo aparecer en el hook sin recargar.
4. Añadir `addProduct` (`addDoc`) y `setSoldOut` (`updateDoc` de un solo campo) al hook.
5. Conectar `App.tsx` al hook y quitar `products` de `mock.ts`. Verificación: alta desde Menú admin → recargar → el producto sigue ahí.
6. Estados de UI: skeleton de carga, estado vacío y banner de error con "Reintentar" en `PosScreen` y `MenuAdminScreen`.
7. Actualizar `App.test.tsx` mockeando `@/hooks/useProducts` (sin red en tests); correr `npm run typecheck`, `npm run lint` y `npm test`.

## Criterios de aceptación

- [] Con la colección vacía, Vender y Menú admin muestran el estado vacío, sin errores en consola.
- [ ] Dar de alta un producto desde Menú admin crea un documento en `products` y sigue ahí tras recargar.
- [ ] Marcar un producto como agotado en un dispositivo se refleja en otro abierto, sin recargar, en menos de 3 s.
- [ ] Marcar agotado escribe solo el campo `soldOut` (verificable en la consola de Firestore: los demás campos no cambian).
- [ ] Con la red cortada (DevTools → Offline), la app carga los productos desde caché y permite marcar agotado; al reconectar el cambio llega a Firestore.
- [ ] Mientras llega el primer snapshot se muestra el skeleton; si la lectura falla se muestra el banner y "Reintentar" vuelve a suscribir.
- [ ] `.env.local` no aparece en `git status` y `.env.example` lista las 6 variables.
- [ ] `src/data/mock.ts` ya no exporta `products` y ningún archivo lo importa.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores.

## Decisiones

- **Sí:** Firestore. Ofrece `onSnapshot` y caché offline sin servidor propio.
- **Sí:** persistencia offline. En caja el internet puede caerse y la venta no se debe detener.
- **Sí:** `onSnapshot` en vez de lectura al cargar. Varios dispositivos deben ver el mismo estado de agotado.
- **Sí:** `updateDoc` por campo, última escritura gana. Para un solo campo booleano una transacción es sobreingeniería.
- **Sí:** id de documento generado por Firestore (`addDoc`). Evita colisiones entre dispositivos.
- **Sí:** solo productos en esta spec. Ventas, turnos y usuarios son dominios aparte (regla: más de 3 áreas = partir).
- **Sí:** carga manual de productos desde Menú admin. El usuario prefirió no tener seed.
- **No:** Firebase Auth ahora. Va en su propia spec; mientras tanto el login sigue mock.
- **No:** autoseed desde la app. Con varios dispositivos duplicaría productos.
- **No:** ordenar con `orderBy` en Firestore. Evita índices compuestos; son pocos documentos.

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                                                  |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Sin Auth, las reglas de Firestore no pueden restringir por usuario               | Reglas temporales abiertas solo para `products`, con fecha de expiración; la spec de Auth las reemplaza antes de producción |
| La API key de Firebase queda en el bundle                                        | Es pública por diseño; la protección real son las reglas de Firestore                                                       |
| Menú vacío tras desplegar y la caja no puede vender                              | Dar de alta los productos desde Menú admin antes de usar la app; el estado vacío lo indica                                  |
| Caché persistente multi-pestaña no soportada en algún navegador                  | Si `initializeFirestore` falla, caer a caché en memoria y mostrar el aviso en consola                                       |
| Escrituras offline pendientes se pierden si se borra el almacenamiento del sitio | Documentarlo; sincronizar antes de limpiar datos del navegador                                                              |

## Lo que **no** está en esta spec

- Firebase Auth, roles o reglas por usuario.
- Persistir ventas, turnos, usuarios o el carrito.
- Editar o eliminar productos.
- Script de seed o migración de `mock.ts`.
