# Diseño: landing de AFLOAT

## Estructura

```
┌────────────────────────────────────────────┐
│ AFLOAT   Cómo se juega · Tripulación ·     │  menú fijo
│          Objetos · Salas · Eventos  [Jugar]│
├────────────────────────────────────────────┤
│        (submarino 3D girando de fondo)     │
│                 A F L O A T                │  cabecera 100vh
│  La alarma os despierta en un submarino…   │
│        [ Jugar ]   2–5 jugadores · PC      │
├────────────────────────────────────────────┤
│ Cómo se juega: 4–6 pasos con icono y número│
├────────────────────────────────────────────┤
│ Tripulación: 5 tarjetas (retrato + ficha)  │
├────────────────────────────────────────────┤
│ Objetos: rejilla de tarjetas con imagen    │
├────────────────────────────────────────────┤
│ Salas: rejilla; sistemas destacados        │
├────────────────────────────────────────────┤
│ Eventos: cartas                            │
├────────────────────────────────────────────┤
│ [ Jugar ]  · GitHub · MIT                  │
└────────────────────────────────────────────┘
```

## Técnica

- `ui/landing.ts` genera el HTML de la portada a partir de `CHARACTERS`, `ROLES`, `ITEMS`/`ITEM_ORDER`, `ROOM_NAMES`/`ROOM_GUIDE`/`ROOM_BLURBS`, `EVENT_NAMES`/`EVENT_DESCRIPTIONS` y `BALANCE`. Los textos propios de la portada (títulos, pasos de "Cómo se juega") van centralizados en ese módulo, como el resto del HUD.
- Retratos e imágenes de objetos: se reutilizan `renderPortraits` y `renderItemImages`, que ya existen.
- Fondo: se crea un estado con `newGame` y una semilla fija, se marcan todas las salas como visibles **solo en la copia que usa la portada** (no es una acción del motor; es una vista) y se pinta con el `World` real. La cámara orbita con el bucle de animación existente. Al pulsar Jugar se libera la escena (geometrías, materiales y renderer) para no cargar la partida.
- Fallback sin WebGL: fondo con el degradado de la paleta.
- Estilo: paleta, tipografía (Barlow Condensed) y componentes de `docs/design-system.md` y `styles.ts`. Sin librerías nuevas.

## Descripciones de sala propuestas (para revisar)

Para las salas que no tienen texto en `ROOM_GUIDE`. Revisa que coincidan con las reglas actuales:

| Sala | Propuesta |
|---|---|
| Camarotes | Donde os despierta la alarma. La única sala con luz al empezar, y siempre esconde algún objeto. |
| Sala de control | Con la energía y las bombas reparadas, desde aquí se emerge con todo el submarino. |
| Cantina | Sala doble. Comer y descansar para recuperar fuerzas. |
| Enfermería | Camillas y botiquines de pared. |
| Almacén | Cajas y estanterías. |
| Sala de torpedos | Tubos de lanzamiento y torpedos en sus raíles. |
| Pasillo | Conecta salas. |

Para energía, soporte vital, bombas, cápsula, invernadero y laboratorio se usa el texto que ya existe en `ROOM_GUIDE`. Enfermería, almacén, torpedos y pasillo no tienen efecto en las reglas: son decorado. Como en cualquier sala, puede haber objetos escondidos (se reparten al azar), y la portada lo dirá una vez, en la cabecera de la sección, no en cada sala.
