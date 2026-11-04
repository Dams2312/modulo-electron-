import { useEffect, useState } from 'react';
import { Download, ShieldAlert, Wifi } from 'lucide-react';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:8787';
const DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_URL || '';

/** Página pública para que los compañeros instalen el agente (/#/instalar). */
export default function InstallPage() {
  const [clients, setClients] = useState<number | null>(null);
  const isWindows = /Windows/i.test(navigator.userAgent);

  // Contador de equipos conectados: confirma que la instalación funcionó
  useEffect(() => {
    const load = () =>
      fetch(`${SERVER}/health`)
        .then((r) => r.json())
        .then((j) => setClients(typeof j.clients === 'number' ? j.clients : null))
        .catch(() => setClients(null));

    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white bg-white p-8 shadow-2xl shadow-sky-200/60">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-500">G3 Ops</p>
        <h1 className="mt-1 text-3xl font-black text-slate-800">
          Conecta tu PC a <span className="text-sky-500">Notify</span>
        </h1>
        <p className="mt-2 text-slate-500">
          Instala el agente una sola vez y recibirás los comunicados directamente en tu pantalla.
        </p>

        {!DOWNLOAD_URL ? (
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            El enlace de descarga aún no está configurado (falta VITE_DOWNLOAD_URL).
          </p>
        ) : isWindows ? (
          <a
            href={DOWNLOAD_URL}
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-4 font-extrabold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5"
          >
            <Download size={18} /> Descargar para Windows
          </a>
        ) : (
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            Por ahora el agente solo está disponible para Windows.
          </p>
        )}

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Abre el archivo descargado. Se instala solo y no pide permisos de administrador.</li>
          <li>Quedará en segundo plano (junto al reloj) y arrancará con Windows.</li>
          <li>Listo: ya recibirás las notificaciones.</li>
        </ol>

        <div className="mt-5 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-slate-600">
          <ShieldAlert className="mt-0.5 shrink-0 text-sky-600" size={18} />
          <p>
            Si Windows muestra <b>“Windows protegió su PC”</b>, pulsa <b>Más información</b> y luego{' '}
            <b>Ejecutar de todas formas</b>. Aparece porque el instalador aún no tiene firma digital.
          </p>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
          <Wifi size={16} className={clients ? 'text-emerald-500' : 'text-slate-400'} />
          {clients === null ? 'Comprobando servidor…' : `${clients} equipo(s) conectado(s) ahora`}
        </p>
      </div>
    </main>
  );
}
