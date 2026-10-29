# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Cajeros en el mostrador de "Doble Tentación" (alitas y boneless): cobran con prisa desde celular o tablet, entran con usuario + PIN.
- Dueño (Rodrigo): entra con usuario y contraseña; revisa reportes, cortes de turno, menú y usuarios.
- Prioridad de dispositivo: celular (mobile-first); también debe funcionar y verse bien en desktop.

## Product Purpose

Punto de venta y control de ventas de un restaurante: registrar ventas por canal (mostrador, llevar, WhatsApp, domicilio), cobrar (efectivo, tarjeta, transferencia), cerrar turno con corte de caja y consultar reportes. Éxito: vender rápido en mostrador y que el dueño sepa cuánto se vendió y si la caja cuadra.

## Operating Context

- Mostrador con alto volumen en horas pico; ticket numerado, cambio en efectivo, retiros de caja y cierre de turno por cajero.
- Menú organizado en categorías (Alitas, Boneless, Más, Bebidas, Extras) con grupos de modificadores (salsa, extras con costo) y marcado de agotado.

## Capabilities and Constraints

- Moneda: pesos (MXN), formato `$1,234`; sin impuestos ni propinas por ahora.
- Debe funcionar sin conexión en el mostrador (requisito; aún no implementado).
- Debe poder imprimir/compartir el ticket (requisito; aún no implementado).
- Sin backend todavía: los datos viven en memoria. Persistencia y backend se definirán con specs posteriores.
- Funcionalidades se implementan spec por spec; no asumir features no pedidas.
- Pantallas implementadas: login, PIN, POS, ticket, cobro, corte, reportes, menú (+ alta de producto), más/usuarios. Pedidos e Inventario sin diseño aún.

## Brand Commitments

- Nombre "Doble Tentación", logo circular "DT" y el estilo del diseño de Claude Design (oscuro con rojo, amarillo y crema; tipografía de marcador solo en marca y totales) son vinculantes.
- Idioma de la interfaz: español.

## Evidence on Hand

- Diseño fuente: proyecto de Claude Design `Doble Tentacion App.dc.html` (9 pantallas a 390×844) y `Doble Tentacion Desktop.dc.html` (no revisado).
- Datos de ejemplo en `src/data/mock.ts`; no hay ventas, clientes ni cifras reales.

## Product Principles

- Velocidad en el mostrador sobre todo: pocas pulsaciones por venta, objetivos táctiles grandes.
- El dinero nunca es ambiguo: totales, cambio y faltantes siempre visibles y legibles.
- Mobile-first, desktop como adaptación.
- Un solo flujo claro por rol: cajero vende, dueño administra.
