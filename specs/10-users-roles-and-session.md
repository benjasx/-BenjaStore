# SPEC 10 — Usuarios, roles y sesión persistente

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07, SPEC 09
> **Fecha:** 2026-11-01
> **Objetivo:** Reemplazar el login y los usuarios simulados por usuarios reales en Firestore con dos roles (Dueño y Cajero) y permisos por rol, y conservar la sesión y la página actual al refrescar.

## Por qué existe esta spec

Hoy cualquier PIN de 4 dígitos entra, el login de administrador acepta cualquier valor, los usuarios viven en `src/data/mock.ts` y todo refresco vuelve al login porque la sesión (`seller`, `shift`, `view`) es estado de React. Las specs 05, 07 y 09 ya guardan vendedor y turno en cada venta, pero nada impide que un cajero entre a reportes, edite el menú o cancele ventas ajenas. Esta spec une identidad real, permisos y sesión persistente porque la sesión solo tiene sentido sobre usuarios reales.

El usuario eligió **no usar Firebase Auth**: la identidad se valida en el cliente contra hashes guardados en Firestore. Esto da control de interfaz, no seguridad de datos (ver Riesgos).

## Alcance

**Dentro:**

- Usuarios reales en Firestore (`users`), con rol `owner` (Dueño) o `cashier` (Cajero), PIN de 4 dígitos con hash y, solo para el Dueño, usuario y contraseña de administrador. Se elimina `src/data/mock.ts → users`.
- Configuración inicial: si `users` está vacía, `LoginScreen` muestra "Crear dueño" (nombre, usuario, contraseña, PIN) en lugar del login; al crear el primer Dueño la pantalla deja de aparecer y se inicia sesión con él.
- Login de administrador real: usuario + contraseña verificados contra el Dueño; error "Usuario o contraseña incorrectos" sin decir cuál falló. Se quitan los valores precargados (`rodrigo.admin` / `12345678`).
- PIN real: `PinScreen` lista los usuarios activos con PIN, verifica el PIN con su hash y solo entonces abre/retoma el turno (SPEC 09). Bloqueo de 30 s tras 5 fallos seguidos por usuario, con cuenta regresiva visible; un acierto reinicia el contador.
- Gestión de usuarios (solo Dueño), en la sección "Usuarios" de `MoreScreen`:
  - Lista desde Firestore con nombre, rol y estado; el interruptor activo/inactivo ya existente pasa a ser real.
  - "+ Agregar" abre `src/components/UserSheet.tsx` para crear: nombre (obligatorio, máximo 30), rol y PIN (4 dígitos, dos veces). Las iniciales se calculan (dos primeras letras de la primera palabra, o inicial de las dos primeras palabras). Crear un Dueño exige además usuario y contraseña.
  - Tocar un usuario abre la misma hoja en modo edición: cambiar nombre y rol, restablecer PIN (el PIN actual nunca se muestra) y, si pasa a Dueño, definir usuario y contraseña.
  - Eliminar usuario con confirmación; las ventas conservan el snapshot `seller` y los turnos conservan el suyo.
  - Reglas: siempre debe quedar al menos un Dueño activo (no se puede desactivar, eliminar ni degradar al último); un usuario no puede eliminarse ni desactivarse a sí mismo.
  - Un usuario desactivado o eliminado no puede entrar, y si tiene una sesión abierta esta se cierra en vivo (la lista de usuarios se escucha con `onSnapshot`).
- Permisos por rol (matriz en `src/lib/permissions.ts`):
  - **Dueño:** todo — Vender, Reportes, Ventas (todas y cancelar cualquiera), Más (Menú, Usuarios, Corte, cambiar usuario, cerrar sesión).
  - **Cajero:** Vender, Ventas y Más. En Ventas solo ve y puede cancelar las ventas cuyo `seller.id` sea el suyo; en Más solo ve su cuenta, "Corte", "Cambiar usuario" y "Cerrar sesión" (sin Menú ni Usuarios). No ve ni abre Reportes, `MenuAdminScreen` ni `ProductFormScreen`.
  - La interfaz oculta lo no permitido (`BottomNav` filtra pestañas) y una guarda de vista redirige si se llega a una vista prohibida por el hash o la sesión.
- Sesión persistente:
  - `src/lib/session.ts` guarda en `localStorage` (`benjastore.session`, versionado) `{ v: 1, userId, mode }` con `mode` `"admin"` (login de administrador, sin turno) o `"pin"` (con turno). Sin caducidad: dura hasta cerrar sesión, cerrar turno o desactivar al usuario.
  - Al cargar la app: se lee la sesión, se valida que el usuario exista y esté activo, y si `mode` es `"pin"` se retoma su turno abierto con `findOpenShift` (SPEC 09). Si algo falla, se limpia la sesión y se va al login. Mientras se valida se muestra la pantalla de carga existente, nunca un parpadeo de login.
  - Cerrar sesión, "Salir" del corte (SPEC 09) y desactivar al usuario limpian la sesión.
- Página actual en la URL: ruta por hash (`#/ventas`, `#/reportes`, `#/vender`, `#/mas`, `#/menu`, `#/turno`, `#/login`, `#/pin`) en `src/lib/route.ts`, sin librería de enrutado. Refrescar conserva la vista; el botón atrás del navegador navega entre vistas. Vistas con estado que no se puede reconstruir se restauran a su padre: `cart` → `pos` (el carrito se pierde) y `product-new` → `menu`.
- Pruebas: `auth`, `permissions`, `session`, `route`, `users`, hoja de usuarios, login/PIN y los flujos de `App`.

**Fuera de alcance (specs futuras):**

- Firebase Auth, reglas de seguridad de Firestore por usuario y cualquier protección real de los datos en el servidor.
- Conservar el carrito en curso al refrescar.
- Caducidad automática de sesión, cierre por inactividad y sesiones simultáneas por usuario/dispositivo.
- Roles editables, permisos por usuario y más de dos roles.
- Recuperar contraseña del Dueño olvidada (hoy requiere editar Firestore a mano).
- Cambiar la contraseña de administrador desde la interfaz (solo se redefine al editar el rol del usuario).
- Bitácora de acciones y registro de intentos fallidos en el servidor.
- Pantallas de Pedidos e Inventario (no existen aún) y sus permisos.
- Foto o avatar de usuario.
- Internacionalización de roles; los nombres visibles son "Dueño" y "Cajero".

## Modelo de datos

Nueva colección `users/{userId}`:

```ts
// src/lib/users.ts
export type Role = "owner" | "cashier";

export interface Credential {
  hash: string; // base64 de PBKDF2-SHA256 (100 000 iteraciones)
  salt: string; // base64, 16 bytes aleatorios por credencial
}

export interface AppUser {
  id: string;
  name: string; // sin espacios en los extremos, 1–30 caracteres
  initials: string; // calculadas, 2 letras en mayúscula
  role: Role;
  active: boolean;
  pin: Credential; // PIN de 4 dígitos (todos los usuarios)
  admin?: { username: string; password: Credential }; // solo Dueño; username en minúsculas, único
  createdAt: Timestamp; // serverTimestamp()
}

export const createUser: (input: NewUserInput) => Promise<AppUser>;
export const updateUser: (id: string, changes: UserChanges) => Promise<void>; // nombre, rol, admin, PIN nuevo
export const setUserActive: (id: string, active: boolean) => Promise<void>;
export const deleteUser: (id: string) => Promise<void>;
// Las tres últimas corren en transacción y rechazan si dejarían la app sin un Dueño activo.
export const createFirstOwner: (input: NewOwnerInput) => Promise<AppUser>;
// Transacción: rechaza si `users` ya tiene documentos.
```

Autenticación en `src/lib/auth.ts` (sin Firestore, pura salvo `crypto.subtle`):

```ts
export const hashSecret: (secret: string) => Promise<Credential>;
export const verifySecret: (
  secret: string,
  cred: Credential,
) => Promise<boolean>;
export const isValidPin: (pin: string) => boolean; // /^\d{4}$/
export const isValidPassword: (p: string) => boolean; // 8–64 caracteres
export const MAX_PIN_ATTEMPTS = 5;
export const LOCK_SECONDS = 30;
// Contador de fallos y fin de bloqueo por userId en localStorage ("benjastore.attempts")
export const registerFailure: (
  userId: string,
  now?: number,
) => { locked: boolean; until?: number };
export const registerSuccess: (userId: string) => void;
export const lockedUntil: (userId: string, now?: number) => number | null;
```

Permisos en `src/lib/permissions.ts`:

```ts
export type Permission =
  | "sell"
  | "viewSales"
  | "viewAllSales"
  | "cancelAnySale"
  | "viewReports"
  | "manageMenu"
  | "manageUsers"
  | "closeShift";
export const can: (role: Role, permission: Permission) => boolean;
export const allowedViews: (role: Role) => View[];
export const homeView: (role: Role, mode: "admin" | "pin") => View; // pin → pos; admin → more
```

Sesión en `src/lib/session.ts`:

```ts
export interface Session {
  v: 1;
  userId: string;
  mode: "admin" | "pin";
}
export const loadSession: () => Session | null; // null si falta, está corrupta o tiene otra versión
export const saveSession: (s: Session) => void;
export const clearSession: () => void;
```

Rutas en `src/lib/route.ts`: `viewToHash(view)`, `hashToView(hash): View | null`, `restorable(view): View` (aplica `cart → pos`, `product-new → menu`).

Hook `src/hooks/useUsers.ts`: `{ users: AppUser[]; loading; error; retry }` con `onSnapshot` sobre `users`.

Cambios en `sales`/`shifts`: ninguno de estructura; `seller` y `by` ahora salen del usuario de la sesión. `src/data/mock.ts` pierde `User` y `users` (el tipo `User` pasa a ser `AppUser`).

## Plan de implementación

1. `src/lib/auth.ts` (hash, verificación, validaciones, bloqueo) y `src/lib/permissions.ts` con pruebas. Sin tocar la interfaz.
2. `src/lib/users.ts` (CRUD con reglas del último Dueño y `createFirstOwner`) y `useUsers`; pruebas de las reglas con Firestore simulado.
3. Configuración inicial y login de administrador real en `LoginScreen`/`App.tsx`; gestión de usuarios en `MoreScreen` con `UserSheet` (crear, editar, restablecer PIN, activar, eliminar). El PIN todavía acepta cualquier valor mientras tanto, pero lista usuarios reales.
4. PIN real en `PinScreen` con verificación, bloqueo y cuenta regresiva; usuario de sesión (`AppUser`) alimenta `seller`, turno y `cancelSale.by`; se retira `src/data/mock.ts → users`.
5. `src/lib/session.ts` y `src/lib/route.ts`: guardar/restaurar sesión y turno, vista en el hash, atrás del navegador y estado de carga al restaurar; cierre de sesión en vivo si el usuario se desactiva o elimina.
6. Permisos aplicados: `BottomNav` filtra pestañas, guarda de vista en `App.tsx`, `MoreScreen` por rol y filtro de ventas propias y cancelación en `SalesScreen`.
7. Actualizar `App.test.tsx` y pruebas de pantallas; `npm run typecheck`, `npm run lint`, `npm test` y revisar el formato de los archivos tocados.

## Criterios de aceptación

- [ ] Con `users` vacía, el login muestra "Crear dueño"; al crearlo se inicia sesión y la pantalla no vuelve a aparecer; un segundo `createFirstOwner` se rechaza.
- [ ] El login de administrador con usuario o contraseña incorrectos muestra "Usuario o contraseña incorrectos" y no entra; con credenciales correctas entra a "Más".
- [ ] Un PIN incorrecto no entra; el quinto fallo seguido bloquea a ese usuario 30 s con cuenta regresiva y rechaza incluso el PIN correcto hasta que termine; un acierto antes del quinto fallo reinicia el contador.
- [ ] Los hashes en `users` son distintos para dos usuarios con el mismo PIN (sal por credencial) y ningún campo guarda el PIN ni la contraseña en claro.
- [ ] El Dueño puede crear un cajero (nombre, PIN dos veces coincidentes), editar nombre y rol, restablecer su PIN, desactivarlo y eliminarlo; el PIN anterior deja de funcionar al restablecerlo.
- [ ] No se puede desactivar, eliminar ni degradar al único Dueño activo, ni un usuario puede eliminarse o desactivarse a sí mismo.
- [ ] Desactivar o eliminar a un usuario con sesión abierta cierra su sesión sin recargar y lo envía al login.
- [ ] Un Cajero no ve la pestaña Reportes ni las opciones Menú y Usuarios; abrir `#/reportes`, `#/menu` o `#/menu/nuevo` lo redirige a su vista de inicio.
- [ ] En Ventas, un Cajero solo ve y puede cancelar ventas con su `seller.id`; el Dueño ve y cancela todas.
- [ ] Refrescar en `#/ventas` con sesión válida deja la app en Ventas sin pasar por el login; con `mode: "pin"` retoma el turno abierto (misma hora de apertura y fondo).
- [ ] Refrescar en el carrito va al POS (carrito vacío); refrescar en el formulario de producto nuevo va al menú.
- [ ] Con la sesión corrupta, de otra versión o de un usuario inexistente, la app limpia la sesión y muestra el login.
- [ ] Cerrar sesión y "Salir" del corte limpian `benjastore.session`; el botón atrás del navegador vuelve a la vista anterior sin romper la sesión.
- [ ] Ya no existen `users` ni valores precargados de login en `src/data/mock.ts` ni en `LoginScreen`.
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan.

## Decisiones tomadas y descartadas

- **Una sola spec** para usuarios, roles, permisos y sesión: la sesión necesita usuarios reales y los permisos necesitan la sesión. Descartado dividirla porque la sesión persistente habría que rehacerla. Es una spec grande: si el avance se atora, el corte natural es después del paso 4 (identidad real) y antes del 5 (sesión).
- **PIN y contraseña con hash en Firestore, sin Firebase Auth** (elección del usuario): menos fricción para el personal. Descartado Firebase Auth porque cambia el flujo de PIN y exige correos. Costo aceptado: las reglas de Firestore no pueden distinguir usuarios (ver Riesgos).
- **PBKDF2-SHA256 con sal por credencial** vía `crypto.subtle`: sin dependencias nuevas. Descartado SHA-256 simple (demasiado barato de atacar con un PIN de 4 dígitos) y librerías externas.
- **El PIN se verifica contra un usuario elegido**, no es único global: se elige el avatar y luego se teclea el PIN, como hoy. Por eso dos usuarios pueden tener el mismo PIN.
- **Dos roles fijos, Dueño y Cajero**: descartados permisos por usuario y roles editables por el costo de interfaz y pruebas; quedan para una spec propia. Los permisos dependen del rol, no del modo de entrada: un Dueño que entra con PIN conserva sus permisos.
- **El Dueño también tiene PIN** para poder vender con turno; el login de administrador abre sesión sin turno, como hoy.
- **Cajero ve y cancela solo sus ventas** (por `seller.id`): descartado quitarle la cancelación completa para no frenar la operación del mostrador, y descartado quitarle Ventas por completo.
- **Crear dueño en pantalla inicial** (en lugar de semilla en el código): no deja credenciales en el repositorio. Riesgo asumido: quien abra la app primero con `users` vacía reclama el dueño.
- **Bloqueo de 30 s tras 5 fallos y sesión sin caducidad**: el teléfono se queda en la caja todo el día; el bloqueo se guarda en `localStorage`, es solo una barrera de interfaz (se puede borrar el almacenamiento).
- **Sesión en `localStorage`** (no `sessionStorage`) para que sobreviva a cerrar la pestaña o reiniciar el navegador. Se guarda solo `userId` y `mode`, nunca secretos; el usuario y el turno se vuelven a leer de Firestore al restaurar.
- **Vista en el hash, sin librería de rutas**: la app tiene una docena de vistas y ninguna ruta con parámetros; basta `hashchange`. Descartado `react-router` por tamaño y por reescribir `App.tsx`.
- **El carrito no se conserva al refrescar** (decisión del usuario): `cart` restaura a `pos`.
- **Eliminar usuarios sí se permite**: las ventas y turnos guardan su propio snapshot de vendedor, así que el historial no se rompe.

## Riesgos identificados

- **Sin seguridad real en el servidor:** sin Firebase Auth, cualquier persona con la configuración de Firebase (visible en el cliente) puede leer `users` y los hashes, y escribir en cualquier colección. Con un PIN de 4 dígitos los hashes se rompen por fuerza bruta en segundos. Esta spec limita la interfaz, no protege los datos; una spec de Firebase Auth y reglas lo corregiría.
- **Bloqueo evitable:** el contador de intentos vive en `localStorage`; borrarlo, usar otra pestaña privada u otro dispositivo lo reinicia.
- **Reclamo del dueño inicial:** hasta que se cree el primer Dueño, cualquiera que abra la app puede crearlo. Crearlo inmediatamente tras el despliegue.
- **Dueño bloqueado:** si se olvida la contraseña de administrador no hay recuperación en la interfaz; hay que editar `users` en la consola de Firebase. Mitigación: que el Dueño tenga también PIN y, si hay otro Dueño, que pueda restablecerlo.
- **Última sesión huérfana:** una sesión guardada de un usuario cuyo turno se cerró desde otro dispositivo se limpia al restaurar y manda al PIN; no hay aviso previo al usuario.
- **`crypto.subtle` requiere contexto seguro:** funciona en HTTPS y `localhost`, no en HTTP sobre la red local; las pruebas necesitan un polyfill o el `webcrypto` de Node en `src/test/setup.ts`.
- **Pruebas existentes:** `App.test.tsx` y el flujo de PIN asumen usuarios simulados y entrada con cualquier PIN; hay que simular `useUsers` y el hash.
