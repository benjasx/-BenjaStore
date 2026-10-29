---
name: Doble Tentación
description: POS oscuro y táctil para mostrador de alitas y boneless; rojo chile, amarillo y crema sobre café carbón.
colors:
  ink: "#17110f"
  ink-deep: "#110c0b"
  surface: "#221a17"
  surface-2: "#2d2420"
  surface-3: "#3d302a"
  line: "#3a2f2a"
  cream: "#f6ead2"
  sand: "#d9cab3"
  muted: "#b8a690"
  faint: "#8a7a6c"
  gold: "#f7c531"
  chili: "#d42c1f"
  salmon: "#ff8a7e"
  ok: "#6fcf7a"
typography:
  marker:
    fontFamily: "Permanent Marker, cursive"
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
  label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  sheet: "28px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "56px"
  button-cta:
    backgroundColor: "{colors.chili}"
    textColor: "{colors.cream}"
    rounded: "{rounded.lg}"
    height: "64px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.md}"
    height: "56px"
  chip-category:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sand}"
    rounded: "{rounded.full}"
    height: "44px"
  chip-category-active:
    backgroundColor: "{colors.chili}"
    textColor: "{colors.cream}"
  product-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cream}"
    rounded: "{rounded.lg}"
    height: "132px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cream}"
    rounded: "{rounded.md}"
    height: "56px"
  segmented-active:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "44px"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
---

# Design System: Doble Tentación

## Overview

**Creative North Star: "El Pizarrón del Mostrador"**

Interfaz oscura de cocina nocturna: café carbón como lienzo, crema como tinta, y dos acentos de salsa, rojo chile para la acción y amarillo para dinero y selección. La tipografía de marcador aparece solo en la marca y en las cifras que cierran una operación (total, cambio), como si el total estuviera escrito a mano en el pizarrón.

Denso pero legible a una mano: objetivos táctiles de 44 a 64px, texto nunca menor a 13px, cifras tabulares. Plano por defecto; la jerarquía sale del tono de superficie, no de sombras.

**Key Characteristics:**
- Tema oscuro único, mobile-first (columna de máx. 448px centrada).
- Rojo = acción de vender/confirmar; amarillo = dinero, selección, foco.
- Marcador solo en marca y totales.
- Radios generosos (10 a 28px), sin sombras.

## Colors

Paleta cálida y de alto contraste: neutros café, crema como texto, dos acentos de salsa.

### Primary
- **Rojo Chile** (`chili`): CTA de venta (Cobrar, Confirmar venta), categoría activa, logo DT.
- **Amarillo Mostaza** (`gold`): precios, insignia de cantidad, botón de entrada, foco de input, tab activa.

### Secondary
- **Verde Caja** (`ok`): indicador de turno activo, cambio a devolver, interruptor encendido.
- **Salmón** (`salmon`): estado AGOTADO y errores suaves.

### Neutral
- **Carbón** (`ink`): fondo de pantalla. **Carbón Profundo** (`ink-deep`): barra de navegación.
- **Superficie 1/2/3** (`surface`, `surface-2`, `surface-3`): tarjetas, controles y estados seleccionados, de menos a más elevado.
- **Crema** (`cream`): texto principal y segmento activo. **Arena** (`sand`), **Apagado** (`muted`), **Tenue** (`faint`): texto secundario y deshabilitado.
- **Línea** (`line`): bordes de 1.5px.

### Named Rules
**The Money Gold Rule.** El amarillo señala dinero y selección; no se usa como decoración.
**The One Red Rule.** Una sola acción roja dominante por pantalla.

## Typography

**Display Font:** Permanent Marker (cursive)
**Body Font:** Archivo (sans-serif), pesos 400 a 900
**Mono:** JetBrains Mono (declarada, uso mínimo)

**Character:** Archivo pesado y compacto para lectura rápida; marcador como firma manuscrita en marca y totales.

### Hierarchy
- **Marker** (400, 36 a 44px, 1): marca "Doble Tentación", total en cobro, cambio.
- **Headline** (900, 24px, tracking -0.025em): título de pantalla.
- **Title** (900, 26px, 1): nombre de producto en tile; precios 20px/800 tabular.
- **Body** (600, 17px): campos y botones secundarios.
- **Label** (600, 15px): etiquetas de campo y metadatos en `muted`; 13px mínimo en navegación.

### Named Rules
**The Marker Is Rare Rule.** Marcador solo en marca y cifras finales de dinero.
**The Tabular Money Rule.** Todo importe usa `tabular-nums` y formato `$1,234`.

## Layout

Columna única centrada de máx. 448px (`max-w-md`), alto `100dvh`. Gutter horizontal de 20px (`px-5`), 28px en login. Rejilla de 2 columnas con gap de 12px para productos; barra de navegación inferior de 80px con 5 tabs; CTA fijo sobre la barra. Desktop adapta la misma columna (diseño de escritorio aún no documentado).

## Elevation & Depth

Sin sombras. La profundidad es tonal: `ink` < `surface` < `surface-2` < `surface-3`. Las hojas modales usan un velo `rgba(8,5,4,0.72)` y un asa de 44×5px.

### Named Rules
**The Flat Tonal Rule.** Elevar = subir un escalón de superficie, nunca añadir sombra.

## Shapes

Esquinas suaves y consistentes: 10px segmento interno, 14px campos y botones, 18px tiles y CTA, 28px hoja inferior, píldora completa para chips y avatar. Selección = borde de 2px en `gold`; agotado = borde discontinuo de 1.5px en `line`. Insignia de cantidad recortada en la esquina superior derecha del tile.

## Components

### Buttons
- **Primary:** fondo `gold`, texto `ink`, 56px, radio 14px, peso 800 (Entrar).
- **CTA venta:** fondo `chili`, 64px, radio 18px, con total a la izquierda y "Cobrar" en pastilla crema a la derecha.
- **Outline:** borde 1.5px `line`, 56px (Entrar con PIN).
- **Disabled:** opacidad 40%.

### Chips
Categorías: píldora 44px; activa `chili`/800, inactiva `surface` + `sand`/600; scroll horizontal.

### Cards / Containers
Tile de producto 132px: `surface`, radio 18px, padding 14px; nombre 26px/900, precio en `gold` abajo; seleccionado borde `gold` + insignia "×n"; agotado discontinuo y texto `faint` con "AGOTADO" en `salmon`.

### Inputs / Fields
56px, `surface`, borde 1.5px `line`, radio 14px; foco borde `gold`, sin outline nativo. Monto recibido: borde 2px `gold`, 30px/900.

### Navigation
Barra inferior `ink-deep`, 5 tabs; activa en `gold` con icono relleno y peso 800, inactiva `muted` con icono contorneado. Segmentado: contenedor `surface`, segmento activo `cream`/`ink`.

### Hoja de cobro (signature)
Hoja inferior `surface`, radio 28px: métodos en rejilla de 3 (64px), monto recibido, atajos, y recuadro `ink` con el cambio en marcador verde.

## Do's and Don'ts

### Do:
- **Do** usar `chili` solo para la acción principal de venta y `gold` para dinero y selección.
- **Do** mantener objetivos táctiles ≥44px y texto ≥13px.
- **Do** mostrar totales, cambio y faltantes siempre visibles, en `tabular-nums`.
- **Do** expresar profundidad con escalones de superficie.

### Don't:
- **Don't** usar marcador en texto corrido o etiquetas.
- **Don't** añadir sombras ni degradados.
- **Don't** introducir fondos claros: el tema es oscuro único.
- **Don't** cambiar nombre, logo "DT" ni la combinación oscuro + rojo + amarillo + crema (compromiso de marca).
