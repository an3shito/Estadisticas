# Copa Navidad

Frontend de campeonato de fútbol en HTML, CSS y JavaScript, sin dependencias ni instalación.

Abre `index.html` en tu navegador. Todos los archivos del frontend están en la raíz del repositorio; también puedes servir esta carpeta con cualquier servidor estático.

- 20 equipos, grupos A y B de 10, 9 jornadas y 90 partidos de una vuelta.
- Clasificación automática: 3 puntos por victoria, 1 por empate y 0 por derrota.
- Calendario editable, registro y corrección de resultados, goles y tarjetas por jugador.
- Goleadores y porteros menos vencidos por promedio de goles recibidos.
- Edición de equipos, colores y plantillas. Permite añadir jugadores y porteros.
- Guardado local y copias de seguridad JSON con importación y exportación.
- Diseño adaptable a móviles y navegación por teclado.

El primer inicio muestra **datos ficticios de demostración**. En **Configurar torneo → Vaciar resultados** puedes empezar conservando los equipos, jugadores y fechas; personalízalos desde **Equipos**. Asigna todos los goles a los jugadores al registrar un resultado.

Los datos se guardan en el navegador y dispositivo actual. No hay servidor de datos ni sincronización entre usuarios; exporta copias periódicamente y antes de cambiar de dispositivo o dirección web. El navegador puede limitar el guardado al abrir archivos directamente; en ese caso utiliza un servidor estático o exporta tus datos.

Los porteros se clasifican por goles recibidos por partido, con mínimo de una aparición. Cada partido se atribuye por completo al portero seleccionado de cada equipo. Las sustituciones, autogoles, sanciones automáticas y fase eliminatoria no forman parte de esta versión.

## Archivos

- `index.html`: estructura y símbolos de iconos SVG.
- `styles.css`: diseño y adaptación a distintos tamaños de pantalla.
- `engine.js`: datos, calendario, cálculos y validación.
- `app.js`: vistas, formularios, importación y guardado.
- `checks/engine.test.cjs`: pruebas del calendario y estadísticas; se ejecutan con `node checks/engine.test.cjs`.

## GitHub

El repositorio contiene el código fuente listo para clonar o descargar. No requiere paquetes comprimidos, instalación de dependencias ni configuración de Sites. Subirlo a GitHub conserva el código; no publica automáticamente una página web.
