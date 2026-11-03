import {app,BrowserWindow,ipcMain,shell,screen} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io, Socket } from 'socket.io-client';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let settingsWindow: BrowserWindow | null = null;
let toastWindow: BrowserWindow | null = null;

let detailWindow: BrowserWindow | null = null;
let detailItem: any = null;

let socket: Socket | null = null;

let current: any = null;
let toastTimer: NodeJS.Timeout | null = null;

const serverUrl = process.env.G3OPS_SERVER_URL || 'http://localhost:8787';

const deviceId = (process.env.G3OPS_DEVICE_ID || os.hostname()).toUpperCase();

/**
 * Obtiene la URL que utilizará el renderer.
 *
 * En desarrollo:
 * http://localhost:5174
 *
 * En producción:
 * archivo HTML empaquetado dentro de Electron.
 */
function rendererUrl(route = '') {
  const dev = process.env.VITE_DEV_SERVER_URL;

  if (dev) {
    return `${dev}/#${route}`;
  }

  return `file://${path.join(
    __dirname,
    '../dist/index.html'
  )}#${route}`;
}

/**
 * Crea la ventana principal de configuración.
 */
function createSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 540,
    show: true,

    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadURL(
    rendererUrl('/settings')
  );

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

/**
 * Ventana grande y centrada con el detalle completo de la notificación.
 * Si ya está abierta, solo actualiza su contenido.
 */
function openDetailWindow(notification: any) {
  detailItem = notification;

  if (detailWindow && !detailWindow.isDestroyed()) {
    detailWindow.webContents.send('detail', notification);
    if (detailWindow.isMinimized()) detailWindow.restore();
    detailWindow.show();
    detailWindow.focus();
    return;
  }

  const { workArea } = screen.getPrimaryDisplay();

  const win = new BrowserWindow({
    width: Math.min(760, workArea.width - 80),
    height: Math.min(680, workArea.height - 80),
    minWidth: 520,
    minHeight: 420,
    center: true,
    show: false,
    title: 'G3 Ops · Detalle de notificación',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    // Se abre al frente: el toast no tiene foco y Windows podría dejarla detrás
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  detailWindow = win;
  win.removeMenu();

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.show();
    win.focus();
    // Ya está al frente: se libera para que se comporte como ventana normal
    setTimeout(() => {
      if (!win.isDestroyed()) win.setAlwaysOnTop(false);
    }, 300);
  });

  win.on('closed', () => {
    if (detailWindow === win) detailWindow = null;
    detailItem = null;
  });

  win.loadURL(rendererUrl('/detail')).catch((error) => {
    console.error('[Detail] Error en loadURL:', error);
  });
}

/**
 * Cancela el temporizador de cierre automático
 * de la notificación actual.
 */
function clearToastTimer() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

/**
 * Cierra el Toast de forma segura.
 *
 * isDestroyed() es importante porque Electron
 * lanza "Object has been destroyed" si intentamos
 * utilizar una BrowserWindow que ya fue destruida.
 */
function closeToast() {
  clearToastTimer();

  if (toastWindow && !toastWindow.isDestroyed()) {
    toastWindow.close();
  }

  toastWindow = null;
}

/**
 * Muestra una notificación Toast.
 */
function showToast(notification: any) {
  console.log('[Toast] Iniciando creación...');

  current = notification;

  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;

  const toastWidth = 390;
  const toastHeight = notification.imageUrl ? 250 : 170;

  clearToastTimer();
  closeToast();

  const newToastWindow = new BrowserWindow({
    width: toastWidth,
    height: toastHeight,

    x: Math.round(
      workArea.x + workArea.width - toastWidth - 20
    ),

    y: Math.round(
      workArea.y + workArea.height - toastHeight - 20
    ),

    frame: false,
    transparent: false,
    resizable: false,
    movable: false,

    alwaysOnTop: true,
    skipTaskbar: false,

    // Importante para P3:
    // el toast no roba el foco.
    focusable: false,

    show: false,

    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),

      contextIsolation: true,
      nodeIntegration: false
    }
  });

  toastWindow = newToastWindow;

  console.log(
    '[Toast] BrowserWindow creada:',
    newToastWindow.id
  );

  const url = rendererUrl('/toast');

  console.log('[Toast] Cargando:', url);

  // Registramos los eventos ANTES de loadURL.
  newToastWindow.once('ready-to-show', () => {
    console.log('[Toast] ready-to-show');

    if (!newToastWindow.isDestroyed()) {
      console.log('[Toast] Mostrando ventana...');
      newToastWindow.showInactive();
    }
  });

  newToastWindow.webContents.on('did-finish-load',() => {
      console.log('[Toast] HTML cargado correctamente');

      if (!newToastWindow.isDestroyed()) {

        console.log(
          '[Toast] Enviando notificación al renderer:',
          notification.title
        );

        newToastWindow.webContents.send(
          'toast-notification',
          notification
        );

        newToastWindow.showInactive();
      }
    }
  );

  newToastWindow.webContents.on(
    'did-fail-load',
    (
      _event,
      errorCode,
      errorDescription,
      validatedURL
    ) => {
      console.error(
        '[Toast] ERROR cargando renderer:',
        {
          errorCode,
          errorDescription,
          validatedURL
        }
      );
    }
  );

  newToastWindow.on('show', () => {
    console.log('[Toast] Ventana visible ✅');
  });

  newToastWindow.on('closed', () => {
    console.log('[Toast] Ventana cerrada');

    if (toastWindow === newToastWindow) {
      toastWindow = null;
    }

    clearToastTimer();
  });

  // DevTools solo si lo pides: G3OPS_DEBUG=1 (abrirlas siempre roba el foco)
  if (process.env.G3OPS_DEBUG === '1') {
    newToastWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Los errores del renderer ahora salen en la terminal
  newToastWindow.webContents.on('console-message', (_e, level, msg) => {
    console.log(`[Toast renderer:${level}]`, msg);
  });
  newToastWindow.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.error('[Toast] PRELOAD FALLÓ:', preloadPath, error);
  });

  newToastWindow
    .loadURL(url)
    .catch((error) => {
      console.error(
        '[Toast] Error en loadURL:',
        error
      );
    });

  if (notification.type !== 'urgent') {
    const duration =
      notification.duration ?? 8000;

    toastTimer = setTimeout(() => {
      if (
        toastWindow === newToastWindow &&
        !newToastWindow.isDestroyed()
      ) {
        console.log(
          '[Toast] Cierre automático después de',
          duration,
          'ms'
        );

        newToastWindow.close();
        toastWindow = null;
      }

      toastTimer = null;
    }, duration);
  }
}

/**
 * Conexión con el servidor Socket.IO.
 */
function connect() {
  socket?.disconnect();

  socket = io(serverUrl, {
    transports: [
      'websocket',
      'polling'
    ],

    reconnection: true
  });

  socket.on('connect',() => {
      console.log(
        `[Electron] Conectado al servidor: ${serverUrl}`
      );

      console.log(
        `[Electron] Device ID: ${deviceId}`
      );

      socket?.emit(
        'register-device',
        {
          deviceId,
          name: os.hostname()
        }
      );
    }
  );

  socket.on('disconnect',() => {
      console.log(
        '[Electron] Desconectado del servidor'
      );
    }
  );

  socket.on('connect_error',(error) => {
      console.error(
        '[Electron] Error de conexión:',
        error.message
      );
    }
  );

  socket.on('notification', (notification) => {
  console.log('======================================');
  console.log('[Electron]  NOTIFICACIÓN RECIBIDA');
  console.log('[Electron] Título:', notification.title);
  console.log('[Electron] Mensaje:', notification.message);
  console.log('[Electron] Tipo:', notification.type);
  console.log('[Electron] Datos completos:', notification);
  console.log('======================================');

  showToast(notification);
});
}

/**
 * Inicio de Electron.
 */
app.whenReady().then(() => {
  app.setAppUserModelId(
    'com.g3ops.notify.poc'
  );

  /**
   * Hace que Electron pueda iniciar
   * automáticamente con Windows.
   */
  app.setLoginItemSettings({
    openAtLogin: true
  });

  connect();

  createSettings();
});

/**
 * En Windows mantenemos Electron ejecutándose
 * aunque no haya ventanas tradicionales.
 */
app.on(
  'window-all-closed',
  () => {
    // No hacemos app.quit().
    // El agente debe permanecer ejecutándose
    // para recibir notificaciones.
  }
);

/**
 * Estado actual del agente.
 */
ipcMain.handle('get-state',() => ({
    serverUrl,
    deviceId,
    connected:
      socket?.connected ?? false,
    notification: current
  })
);

/**
 * Cerrar Toast desde React.
 */
ipcMain.on('close-toast',() => {
    closeToast();
  }
);

/**
 * Abrir detalle de la notificación.
 */
ipcMain.on('open-detail', () => {
  // Los urgentes mantienen el toast hasta que el usuario confirme lectura
  if (current?.type !== 'urgent') closeToast();
  if (current) openDetailWindow(current);
});

ipcMain.handle('get-detail', () => detailItem);

ipcMain.on('close-detail', () => {
  if (detailWindow && !detailWindow.isDestroyed()) detailWindow.close();
});

/**
 * Abrir enlace externo.
 *
 * Solo permitimos URLs HTTP/HTTPS.
 */
ipcMain.on('open-action',(_, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
  }
);

/**
 * Confirmación de lectura.
 */
ipcMain.on('ack', (_, id) => {
  socket?.emit('ack', { id, deviceId });
  // Confirmada la lectura, el toast urgente ya puede desaparecer
  if (current?.id === id) closeToast();
});
