# Negocio — AFLOAT

## Propuesta de valor

Un juego cooperativo de supervivencia para jugar con amigos en Discord, donde cada partida es un submarino distinto y a oscuras, y salvar a uno puede significar abandonar a otro.

## Modelo de monetización

**Ninguno.** Es un proyecto personal: un reto para comprobar si se puede construir y un juego para el grupo de amigos del creador. Consecuencias prácticas:

- Se pueden usar assets con licencias no comerciales o que exijan atribución (CC-BY, CC-BY-SA), siempre que se registren en `docs/credits.md`.
- Los costes de infraestructura deben ser cero o casi cero (planes gratuitos) cuando llegue la fase online.
- Si en el futuro se quisiera publicar o monetizar, habría que revisar las licencias de los assets.

## Referencias y diferenciación

| Referencia | Qué toma AFLOAT | Qué cambia |
|---|---|---|
| Catan Universe | Juego de mesa online por turnos con amigos | Cooperativo, no competitivo |
| La Isla Prohibida | Roles con habilidades, tablero que se inunda | Mapa oculto y aleatorio, recurso común |
| Sub Terra | Exploración cooperativa por losetas, peligros | Submarino, sistemas a reparar, salidas múltiples |
| Betrayal at House on the Hill | Salas que se descubren al entrar | Sin traidor, puertas con requisitos |
| Deep Sea Adventure | Oxígeno compartido que se agota | El consumo depende de cuántos siguen vivos |
| FTL: Faster Than Light | Nave por salas, oxígeno, puertas, averías | Multijugador por turnos |
| Zelda: The Minish Cap | Referencia visual (pixel art en vista 3/4) | Ambiente industrial oscuro |

**Diferenciación clave**: la combinación de mapa oculto aleatorio + roles complementarios + oxígeno común cuyo consumo baja si alguien muere, lo que convierte el sacrificio en una decisión estratégica real.

## Métricas de éxito

Al ser un proyecto personal, las métricas son de experiencia, no de negocio:

| Métrica | Objetivo |
|---|---|
| MVP jugable de principio a fin en local | Partida completa sin bloqueos ni errores |
| Partidas resolubles | 100% de mapas generados tienen al menos una salida alcanzable |
| Tensión | Al menos la mitad de las partidas se deciden en las últimas rondas de oxígeno |
| Rejugabilidad | El grupo quiere jugar una segunda partida seguida |
| Fase online | Una partida completa de 3+ amigos, cada uno desde su casa |

## Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El arte no alcanza el nivel esperado | Alto | Estilo low-poly asumible por código, iluminación 3D real, referencia visual clara (Lara Croft GO) |
| Alcance excesivo (demasiadas ideas) | Alto | MVP cerrado en `docs/prd.md`; lo demás al roadmap |
| Juego desequilibrado (demasiado fácil o difícil) | Medio | Valores en configuración, semillas reproducibles, partidas de prueba frecuentes |
| Mapas imposibles de resolver | Alto | Validación de resolubilidad en el generador y tests automáticos |
| Multijugador más complejo de lo previsto | Medio | Motor de reglas independiente de la interfaz desde el día uno |
| Licencias de assets incompatibles | Bajo | Registro de licencias desde el primer asset |
| Efecto "líder alfa" (uno decide por todos) | Medio | Acciones por jugador, roles únicos; probar temporizador por turno si aparece |
