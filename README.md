# Campeonato Municipal

Frontend de campeonato de fútbol en HTML, CSS y JavaScript, sin dependencias ni instalación.

Abre `index.html` en tu navegador. Todos los archivos del frontend están en la raíz del repositorio; también puedes servir esta carpeta con cualquier servidor estático.

- 20 equipos, grupos A y B de 10, 9 jornadas y 90 partidos de una vuelta.
- Clasificación automática: 3 puntos por victoria, 1 por empate y 0 por derrota.
- Calendario editable, registro y corrección de resultados, goles y tarjetas por jugador.
- Goleadores y porteros menos vencidos por promedio de goles recibidos.
- Edición de equipos, colores y plantillas. Permite añadir jugadores y porteros.
- Guardado local y copias de seguridad JSON con importación y exportación.
- Diseño adaptable a móviles y navegación por teclado.
- Modo de consulta al abrir la página y acceso de administrador para habilitar cambios.

Pulsa **Administrar** e introduce la contraseña acordada para registrar, corregir o quitar resultados, modificar equipos y plantillas, configurar el torneo o importar copias. Sin acceso puedes navegar, filtrar, consultar partidos y plantillas y exportar datos. **Bloquear edición** o recargar la página vuelve al modo de consulta; el permiso y la contraseña no se guardan en el navegador ni en las copias JSON.

Este bloqueo controla la interfaz de una aplicación estática: quien controle el navegador o los archivos puede modificar el código y los datos locales. Para proteger resultados compartidos entre usuarios se requiere autenticación y autorización en un servidor. La comprobación local utiliza PBKDF2 mediante Web Crypto; utiliza un navegador actualizado con HTTPS, un servidor local o apertura de archivos que admita esta API. Si no está disponible, la edición permanece bloqueada.

El primer inicio carga la **primera jornada con ocho partidos jugados, 34 goles y dos partidos pendientes**: Cachorros FC–Celajes FC y Real X–Rep. Tel. y Radiadores Velazquez. Las posiciones se calculan automáticamente con esos marcadores. El calendario de una vuelta parte de los cruces reales de esa jornada, sin repetir enfrentamientos.

El calendario comienza el **domingo 22 de noviembre de 2026 con el grupo A**, seguido del grupo B el martes 24. JavaScript programa los domingos, martes y jueves alternando continuamente los grupos: A el jueves 26, B el domingo 29, y así sucesivamente. Son 18 fechas, hasta el jueves 31 de diciembre, con nueve jornadas por grupo. Cada fecha tiene cinco partidos de **40 minutos**, a las **18:00, 18:40, 19:20, 20:00 y 20:40**, con cierre a las 21:20, hora de Guatemala. La regla incluye el 24 y el 31 de diciembre.

Los dos partidos pendientes de la primera jornada conservan sus fechas originales del 22 y 24 de noviembre hasta que un administrador los reprograme. Los goleadores y porteros de esos partidos todavía no están confirmados. Puedes guardar marcadores sin asignar todos los goles ni seleccionar un portero; las clasificaciones individuales incluyen solo los datos registrados. Los goles asignados a jugadores no pueden superar el marcador del equipo. La sede principal y la de todos los encuentros es siempre **Cancha Municipal**, también en guardados anteriores y copias importadas.

Las plantillas incluyen nombres provisionales como «Portero» y «Jugador 7»; sustitúyelos desde **Equipos**. Al guardar, corregir o quitar un resultado, JavaScript recalcula las posiciones, puntos, goles, tarjetas y estadísticas de porteros.

Los guardados de la versión anterior reciben esta jornada una sola vez al abrir la página. Antes de actualizarlos, se conserva una copia local en `copa-navidad-v1-before-jornada-1`. Los otros resultados reales se conservan por enfrentamiento y las demostraciones antiguas se reemplazan por los marcadores comunicados. Las correcciones posteriores, los resultados vaciados y las copias importadas explícitamente se respetan al recargar.

La actualización del calendario también se aplica una sola vez, con respaldo en `copa-navidad-v1-before-calendario-2026`: cambia únicamente fechas y horas y conserva resultados, jugadores, goles, tarjetas y sedes. Las fechas modificadas después por un administrador y las de una copia importada explícitamente se respetan al recargar.

La jornada 2 del grupo A tiene **Central Club–Calle los Pinos como tercer partido**, el jueves 26 de noviembre a las **19:20**. Las jornadas restantes del grupo A se recalculan para mantener los 45 enfrentamientos únicos y una participación por equipo en cada jornada. La primera jornada y los cruces del grupo B se conservan. Los guardados reciben esta corrección una sola vez, con respaldo en `copa-navidad-v1-before-cruces-jornada-2-a`; los resultados y estadísticas se trasladan por pareja de rivales, intercambiando marcador y porteros si cambia el orden local/visitante. Los partidos ya jugados conservan su fecha y hora registradas; la sede se normaliza a Cancha Municipal. Las copias importadas explícitamente se respetan.

**Grupo A:** Real Aurora, Los Amigos, Fer. La Esperanza, Central Club, Auto. Rep. San Francisco, Club TK, Calle los Pinos, Grupo Master, Cachorros FC y Celajes FC.

**Grupo B:** Los Brothers, Las Palmas, La Gran Manzana, Auto Rep. JR, Fer. Velazquez, Los Panas, Los Primos, Shulú, Real X y Rep. Tel. y Radiadores Velazquez.

Los guardados y las copias importadas del catálogo anterior actualizan los nombres de ejemplo a estos equipos conservando sus IDs, jugadores, resultados y fechas. Se respetan los nombres y abreviaturas personalizados. En **Configurar torneo → Cargar demostración** puedes cargar jugadores y resultados ficticios para probar el panel; **Vaciar resultados** conserva equipos, plantillas y fechas.

Los datos se guardan en el navegador y dispositivo actual. No hay servidor de datos ni sincronización entre usuarios; exporta copias periódicamente y antes de cambiar de dispositivo o dirección web. El navegador puede limitar el guardado al abrir archivos directamente; en ese caso utiliza un servidor estático o exporta tus datos.

Los porteros se clasifican por goles recibidos por partido, con mínimo de una aparición. Cada partido se atribuye por completo al portero seleccionado de cada equipo. Las sustituciones, autogoles, sanciones automáticas y fase eliminatoria no forman parte de esta versión.

## Archivos

- `index.html`: estructura y símbolos de iconos SVG.
- `styles.css`: diseño y adaptación a distintos tamaños de pantalla.
- `assets/escudo-tacana.jpg`: logo original proporcionado para la página y su icono del navegador.
- `engine.js`: datos, calendario, cálculos y validación.
- `app.js`: vistas, formularios, importación y guardado.
- `checks/engine.test.cjs`: pruebas del calendario y estadísticas; se ejecutan con `node checks/engine.test.cjs`.
- `checks/opening-round.test.cjs`: pruebas de la primera jornada, pendientes y conservación de guardados; se ejecutan con `node checks/opening-round.test.cjs`.
- `checks/schedule.test.cjs`: pruebas de las 18 fechas, alternancia, horarios y conservación de resultados; se ejecutan con `node checks/schedule.test.cjs`.
- `checks/pairings.test.cjs`: pruebas del ajuste de la jornada 2 del grupo A y migración de resultados por pareja; se ejecutan con `node checks/pairings.test.cjs`.
- `checks/access.browser.html` y `checks/access.browser.js`: pruebas de consulta, acceso y bloqueo en un navegador aislado; el ejecutor solicita la contraseña, sin incluirla en los archivos de pruebas.
- `checks/run_access_checks.py`: ejecuta las pruebas de acceso con Chrome y un servidor local temporal; usa `python checks/run_access_checks.py` e introduce la contraseña cuando la solicite.

## GitHub

El repositorio contiene el código fuente listo para clonar o descargar. No requiere paquetes comprimidos, instalación de dependencias ni configuración de Sites. Subirlo a GitHub conserva el código; no publica automáticamente una página web.
