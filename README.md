# G3 Ops Notify — PoC Electron + React + TypeScript + Tailwind

Prueba de concepto pequeña y modular para validar notificaciones corporativas de G3 Ops en varios computadores. Incluye un **panel web React**, un **servidor Node/Socket.IO** y un **agente Electron para Windows**.

> ## Importante: Electron no se instala con un permiso del navegador
> Esta PoC aproxima la experiencia de Web Push, pero Windows **no permite que una web instale silenciosamente un ejecutable Electron con un simple permiso**. El usuario o TI debe ejecutar/autorizar el instalador al menos una vez. Después de esa instalación, Electron puede iniciar con Windows, funcionar con el navegador cerrado y recibir mensajes automáticamente. Para una experiencia corporativa limpia, el instalador debe firmarse y puede distribuirse mediante herramientas de TI (GPO/Intune/SCCM u otra plataforma corporativa).

## Arquitectura

- `apps/web`: panel React + TypeScript + Tailwind. Se puede publicar en Netlify.
- `server`: API Express + Socket.IO. Mantiene las conexiones de los equipos y distribuye mensajes.
- `apps/desktop`: agente Electron. Se conecta al servidor, arranca con Windows y muestra un toast propio que no toma el foco.
- `ARCHITECTURE.md`: diagrama y resumen del flujo.

Flujo: **G3 Ops / Panel → API HTTPS → Socket.IO → Electron → Toast → Detalle/URL/Ack**.

## Qué demuestra la PoC

1. Envío de texto y URL de imagen a todos los equipos o a un `Device ID` específico.
2. Toast corporativo azul claro/blanco/verde, animado, `alwaysOnTop`, `showInactive` y `focusable:false` para evitar robar el foco.
3. Clic sobre el toast abre el detalle dentro del agente.
4. Botón para abrir una URL externa.
5. Mensaje urgente persistente y Ack básico.
6. Reconexión automática de Socket.IO.
7. Inicio automático con Windows mediante `app.setLoginItemSettings({ openAtLogin:true })`.
8. Instalador Windows one-click, por usuario y sin elevación configurado con NSIS.

## Requisitos

- Windows 10/11 para la prueba de escritorio.
- Node.js 20+ (recomendado Node 22 LTS para desarrollo).
- npm.

## Ejecutar todo localmente

Desde la raíz:

```bash
npm install
npm run dev
```

Se levantan:

- API/Socket.IO: `http://localhost:8787`
- Panel web: Vite (normalmente `http://localhost:5173`)
- Electron: ventana del agente.

En el panel usa:

- Servidor: `http://localhost:8787`
- API key de PoC: `g3ops-poc-key`
- Device ID vacío para enviar a todos.

## Probar con dos o más computadores en la misma LAN

1. En el PC que hará de servidor ejecuta `npm run dev:server`.
2. Obtén su IP local, por ejemplo `192.168.1.20`.
3. Permite el puerto TCP 8787 en el firewall **solo para la red de prueba**.
4. En cada cliente inicia Electron con la URL del servidor:

```powershell
$env:G3OPS_SERVER_URL="http://192.168.1.20:8787"
npm run dev:desktop
```

5. En el panel cambia Servidor a `http://192.168.1.20:8787` y envía una alerta.

Para producción no se recomienda exponer HTTP/8787 directamente: usa HTTPS/WSS detrás de un reverse proxy y autenticación real.

## Netlify: qué se publica y qué no

El **panel React** sí está preparado para Netlify mediante `netlify.toml`. Define `VITE_SERVER_URL` con la URL pública del servidor Socket.IO.

El servidor Socket.IO necesita un proceso con conexiones persistentes. Por ello, esta arquitectura separa el hosting estático del panel del canal en tiempo real. Para la PoC puedes ejecutar el servidor en una VM/servidor corporativo o en un PaaS que soporte WebSockets. En una integración final de G3 Ops, lo ideal es alojar este componente en infraestructura controlada por la organización.

### Publicar panel en Netlify

```bash
npm run build:web
```

O conecta el repositorio a Netlify; `netlify.toml` ya apunta a `apps/web/dist`.

Variable de entorno en Netlify:

```text
VITE_SERVER_URL=https://TU-SERVIDOR-DE-NOTIFICACIONES
```

## Crear el instalador Electron para Windows

En Windows:

```bash
npm install
npm run build:desktop
```

El resultado queda en `apps/desktop/release/`. La configuración usa NSIS `oneClick`, instalación por usuario y `allowElevation:false`.

### Sobre la instalación “con un permiso”

No es técnicamente equivalente a Web Push. Una página web no puede instalar Electron automáticamente sin intervención por razones de seguridad del sistema operativo. La experiencia objetivo debe ser:

1. Usuario pulsa **Instalar G3 Ops Notify** o TI lo despliega.
2. Windows ejecuta el instalador firmado.
3. Se instala una sola vez en el perfil del usuario.
4. El agente arranca y queda registrado para iniciar con Windows.
5. Desde entonces no hace falta navegador ni reinstalación para recibir alertas.

En entorno corporativo, **GPO/Intune/SCCM + firma de código** puede hacer el alta prácticamente transparente para el colaborador.

## Seguridad antes de integrar con G3 Ops

La API key incluida es deliberadamente simple y **solo sirve para la PoC**. No debe incrustarse una clave maestra en el frontend de producción. Para G3 Ops se recomienda:

- G3 Ops backend autentica el envío server-to-server (OAuth2/JWT o credencial de servicio).
- Cada agente recibe un token de dispositivo/usuario de vida limitada.
- HTTPS/WSS obligatorio.
- Autorización por usuario, sede, rol o grupo antes de unir sockets a canales.
- No incluir secretos ni datos sensibles innecesarios en el payload.
- Registro auditable de envío, recepción y Ack.
- Rate limiting y validación estricta de URLs e imágenes.
- Rotación/revocación de dispositivos.

## Problemas esperables de Electron y mitigaciones

### SmartScreen / antivirus

Un `.exe` sin firma puede mostrar advertencias o ser bloqueado por políticas corporativas. **Mitigación:** firmar instalador/binarios con un mecanismo de firma de código admitido por Windows y distribuir desde un origen corporativo confiable. Validar el paquete con TI antes del piloto.

### Peso y RAM

Electron incluye Chromium/Node, por lo que consume más disco y memoria que un agente nativo. **Mitigación:** mantener una sola ventana oculta/ligera, evitar dependencias pesadas, medir idle/peak en P5 y, si el consumo no es aceptable, comparar con .NET/WinUI como contingencia.

### Actualizaciones

Los clientes instalados deben mantenerse. **Mitigación:** usar el mecanismo de actualización de Electron/Squirrel o distribución administrada por TI. Las versiones productivas deben firmarse.

### Firewall/proxy corporativo

WebSocket puede ser inspeccionado o bloqueado. Socket.IO incluye fallback de polling, pero debe probarse con proxy/VPN reales. **Mitigación:** WSS sobre 443, allowlist del dominio y coordinación con TI.

### No Molestar

Esta PoC usa una ventana propia, no la notificación nativa de Windows, por lo que su comportamiento es distinto al Centro de notificaciones. Debe validarse que la política corporativa acepte este diseño. Para una versión productiva también puede evaluarse el API nativo de notificaciones de Electron.

### Equipo apagado/desconectado

Esta PoC no persiste mensajes. Si el equipo está offline, el mensaje se pierde. **Mitigación productiva:** base de datos/cola, estado `pending/delivered/read`, reenvío al reconectar e idempotencia.

## Ventajas frente a Web Push

- Funciona sin tener el navegador abierto una vez instalado.
- Control mucho mayor del toast, animaciones, ventana de detalle y comportamiento urgente.
- Integración futura con bandeja del sistema, archivos, SSO corporativo, autoarranque y políticas de escritorio.
- Puede mantener un canal persistente y enviar Ack/telemetría de entrega.

Web Push gana en **cero instalación**, menor consumo y mantenimiento. Electron gana cuando G3 Ops necesita una experiencia de escritorio controlada y capacidades más allá de las que el navegador permite.

## Integración propuesta con G3 Ops

En producción el panel de esta PoC no tendría por qué existir como sistema separado. G3 Ops incorporaría el formulario/módulo de comunicaciones y su backend llamaría al servicio de notificaciones. El servicio resolvería destinatarios y publicaría el evento a los agentes Electron autenticados. El agente mostraría el toast y devolvería `delivered/read/ack` al backend.

Una evolución razonable:

```text
G3 Ops UI
   ↓
G3 Ops Backend ── autenticación/autorización
   ↓
Notification Service ── DB/cola/auditoría
   ↓ WSS
Electron Agent
   ↓
Toast → detalle → Ack
```

## Pruebas P1–P5 sugeridas

- **P1:** enviar 20 mensajes y medir `receivedAt - sentAt`; reportar promedio/p95.
- **P2:** comprobar clic → detalle → URL.
- **P3:** escribir continuamente en Word/Excel mientras llega el toast; confirmar que el cursor/foco no cambia.
- **P4:** cerrar todos los navegadores; mantener Electron en segundo plano y repetir. Reiniciar Windows para validar autoarranque.
- **P5:** Administrador de tareas: RAM/CPU en reposo y durante 20 alertas. Ejecutar instalador firmado/no firmado en el entorno de prueba y documentar SmartScreen/antivirus.

## Limitaciones deliberadas de esta PoC

- API key estática.
- Sin base de datos ni cola offline.
- Sin TLS propio en desarrollo.
- Sin firma de código incluida.
- URL del servidor del agente se configura por variable de entorno antes de compilar/ejecutar.
- Ack se emite en tiempo real, pero no se persiste.

Estas limitaciones mantienen el proyecto pequeño y permiten validar primero UX, conectividad, no intrusividad y viabilidad operativa.
