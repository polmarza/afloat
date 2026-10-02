# Tareas: sonido

## 1. Motor de sonido
- [x] 1.1 `audio/engine.ts`: contexto, volumen general, silencio, compresor, preferencias guardadas.
- [x] 1.2 `audio/recipes.ts`: un sonido por fila de la tabla de `design.md`.
- [x] 1.3 `audio/ambience.ts`: zumbido y pulsos de alarma con fundidos.

## 2. Integración
- [x] 2.1 `App`: sonido de cada suceso al animarlo, pasos por casilla, aviso de tu turno, ambiente al empezar y parar al salir.
- [x] 2.2 HUD: botón de altavoz y tecla M; menú: volumen.

## 3. Verificación
- [x] 3.1 `npm run typecheck`, `npm test`, `npm run build`.
- [x] 3.2 En el navegador: partida local y online sin errores; el ambiente para al salir; el silencio se recuerda; ninguna descarga de audio.
- [ ] 3.3 Escucha del usuario: los sonidos solo se pueden juzgar oyéndolos. Ajustar con sus comentarios.

## 4. Documentación y publicación
- [x] 4.1 Spec a `openspec/specs/sound/spec.md`; actualizar `docs/` y README; revisar etiquetas del repo.
- [x] 4.2 `npm run deploy`.
