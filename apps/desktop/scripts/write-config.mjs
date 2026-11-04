// Guarda la URL del servidor dentro del agente al compilar el instalador.
// Uso (PowerShell):  $env:G3OPS_SERVER_URL="https://tu-servidor.onrender.com"; npm run build:desktop
import fs from 'node:fs';

const serverUrl = (process.env.G3OPS_SERVER_URL || '').trim().replace(/\/+$/, '');

if (!/^https?:\/\//.test(serverUrl)) {
  console.error('\n[write-config] Falta G3OPS_SERVER_URL (debe empezar por https://)\n');
  process.exit(1);
}

fs.mkdirSync('dist-electron', { recursive: true });
fs.writeFileSync('dist-electron/config.json', JSON.stringify({ serverUrl }, null, 2));
console.log('[write-config] serverUrl =', serverUrl);
