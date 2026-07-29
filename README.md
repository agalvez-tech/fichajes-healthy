# HealthyMeat · App de fichajes

App de control de jornada para HealthyMeat: fichar entrada/salida, solicitar y aprobar
vacaciones, y generar el PDF de resumen de fichajes que pide la Inspección de Trabajo.
Funciona con varias empresas a la vez (ahora mismo HealthyMeat Fit y HealthyMeat
Restauración) y se puede filtrar por cada una.

## Qué incluye

- **Fichar entrada / salida**: cada empleado elige su empresa → su nombre → un botón
  grande para fichar. Queda guardado con fecha y hora reales.
- **Pausas (almuerzo)**: mientras está fichada la entrada, cada empleado puede fichar
  el inicio y el fin de su pausa. El tiempo de pausa se descuenta automáticamente de
  las horas trabajadas, y no se puede fichar la salida con una pausa abierta.
- **PIN personal por empleado**: al tocar tu nombre, la app pide un PIN de 4 dígitos
  antes de dejar fichar o ver tus propios datos. Así nadie ficha ni ve las vacaciones
  de otro compañero. El PIN de cada uno son las 4 últimas cifras de su DNI (ver
  sección 1 para cambiarlos).
- **Vacaciones con límite de 22 días**: el empleado solicita días desde su propio
  panel y ve cuántos lleva pedidos y cuántos le quedan ese año (solo cuenta días
  laborables, de lunes a viernes). La app no deja enviar una solicitud que supere los
  22 días — la validación se hace tanto en la pantalla como en el servidor, para que
  no se pueda saltar. Patricia Lázaro (gerencia) aprueba o rechaza cada solicitud
  desde un panel protegido por su propio PIN, y ve el saldo de todos los empleados.
- **Informes PDF**: Patricia puede filtrar por empresa, empleado y rango de fechas, y
  descargar un PDF con el resumen de jornadas —incluidas las pausas— para enseñar a
  Inspección de Trabajo si lo pide.
- **Multiempresa**: los datos de cada empresa están separados y se pueden filtrar.

Todo se guarda en una base de datos en la nube (Redis de Upstash), así que si dos
personas usan la app a la vez desde el móvil o el ordenador, ambas ven los mismos datos.

## 1. Antes de publicarla — revisa estos datos

Abre `src/data.js` y revisa:

- **Patricia Lázaro / PIN de gerencia**: el PIN de ejemplo es `2026`. Cámbialo por uno
  que solo conozca gerencia (misma línea, `pin: '2026'`).
- **PIN de cada empleado**: por defecto son las 4 últimas cifras del DNI de cada
  persona (campo `pin` en cada empleado de `EMPLEADOS`). Cámbialos si prefieres otros
  números — solo tienen que ser 4 dígitos y no hace falta que sigan ningún patrón.
- **Días de vacaciones**: están fijados en 22 días laborables al año para todos
  (`DIAS_VACACIONES_ANUALES` en `src/lib/vacaciones.js`). Si alguna persona tuviera un
  número distinto, dilo y lo hacemos configurable por empleado.
- Si algún horario cambia o entra alguien nuevo, se edita en `src/data.js`
  (es una lista sencilla, no hace falta tocar nada más). Recuerda añadirle también un
  `pin` de 4 dígitos.

## 2. Publicar la app (sin usar la terminal)

1. **Crea un repositorio en GitHub** (con tu cuenta `agalvez-tech`, como en tus otras
   apps) y sube esta carpeta completa arrastrándola en la web de GitHub.
2. Entra en [vercel.com](https://vercel.com) → **Add New → Project** → importa ese
   repositorio.
3. Antes de darle a "Deploy", ve a la pestaña **Storage** de ese proyecto en Vercel →
   **Create Database** → elige **Upstash Redis** (o "KV") → créala y conéctala al
   proyecto. Vercel añade solas las variables `UPSTASH_REDIS_REST_URL` y
   `UPSTASH_REDIS_REST_TOKEN`.
4. Dale a **Deploy**. Cuando termine, tendrás una URL tipo
   `healthymeat-fichajes.vercel.app`.
5. Si conectas la base de datos **después** del primer deploy, ve a **Deployments** →
   los tres puntos del último → **Redeploy** para que la app la detecte.

## 3. Uso diario

- Cada empleado entra en la web, elige su empresa, toca su nombre y ficha.
- Para pedir vacaciones, dentro de su propio panel hay un botón "Solicitar
  vacaciones".
- Patricia entra por "Acceso gerencia" (abajo de la pantalla de inicio), pone el PIN,
  y desde ahí aprueba/rechaza vacaciones y descarga los PDF de fichajes.

## Notas técnicas

- React + Vite, desplegado como funciones serverless en Vercel (carpeta `api/`).
- Persistencia con `@upstash/redis` (mismo patrón que tus otras apps RK).
- PDF con `jspdf` + `jspdf-autotable`, con el logo y los colores de HealthyMeat.
- Logo tomado de la web pública de HealthyMeat (`healthymeatfit.com`) — si tienes un
  archivo de logo en mejor calidad, sustituye `public/logo.jpg` por el tuyo con el
  mismo nombre.
