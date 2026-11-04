import { useRef, useState } from 'react';
import { BellRing, Send, MonitorSmartphone, ShieldCheck, Radio, Image as ImageIcon, Upload, X } from 'lucide-react';
import InstallPage from './pages/InstallPage';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:8787';
const MAX_SIDE = 1280;

/** Lee la imagen, la reduce y la devuelve como data URL JPEG. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(objectUrl);
      if (!ctx) return reject(new Error('No se pudo procesar la imagen'));
      ctx.fillStyle = '#ffffff'; // los PNG transparentes quedan con fondo blanco
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = objectUrl;
  });
}

function Panel() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('g3ops_api_key') || '');
  const [needsKey] = useState(() => !localStorage.getItem('g3ops_api_key'));
  const [title, setTitle] = useState('Comunicado G3 Ops');
  const [message, setMessage] = useState('Prueba de notificación corporativa enviada desde el panel.');
  const [type, setType] = useState('info');
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [actionUrl, setActionUrl] = useState('https://example.com');
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState('Listo para enviar');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function changeKey(value: string) {
    setApiKey(value);
    localStorage.setItem('g3ops_api_key', value);
  }

  async function pickImage(file?: File) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setStatus('Formato no válido. Usa PNG, JPG o WEBP');
      return;
    }
    try {
      setImage(await compressImage(file));
      setImageName(file.name);
      setStatus('Listo para enviar');
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : 'imagen no válida'}`);
    }
  }

  function removeImage() {
    setImage('');
    setImageName('');
  }

  async function send() {
    if (!apiKey) {
      setStatus('Falta la clave de acceso (sección "Conexión")');
      return;
    }
    setBusy(true);
    setStatus('Enviando…');
    try {
      const r = await fetch(`${SERVER}/api/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          title,
          message,
          type,
          imageData: image,
          actionUrl,
          targetDeviceId: target,
          duration: type === 'urgent' ? 0 : 8000,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Datos inválidos, revisa el formulario');
      setStatus(`Enviado ✓ · ${j.connectedClients} cliente(s) conectado(s)`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : 'No fue posible conectar'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-5 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sky-700">
              <Radio size={14} />PoC · Electron
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              G3 Ops <span className="text-sky-500">Notify</span>
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Panel de prueba para enviar alertas a los agentes Electron conectados.
            </p>
          </div>
          <div className="glass rounded-2xl border border-white p-4 shadow-glow">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                <ShieldCheck />
              </span>
              <div>
                <b className="block">Canal corporativo</b>
                <small className="text-slate-500">WebSocket + API autenticada</small>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <section className="glass rounded-3xl border border-white p-6 shadow-xl shadow-sky-100/60">
            <div className="mb-6 flex items-center gap-3">
              <BellRing className="text-sky-500" />
              <h2 className="text-xl font-extrabold">Crear notificación</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Título">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="input" />
              </Field>

              <Field label="Tipo">
                <select value={type} onChange={(e) => setType(e.target.value)} className="input">
                  <option value="info">Informativa</option>
                  <option value="reminder">Recordatorio</option>
                  <option value="urgent">Urgente</option>
                  <option value="image">Imagen + resumen</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label={`Mensaje (${message.length}/2000)`}>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    className="input min-h-28 resize-y"
                  />
                </Field>
              </div>

              {/* Imagen: NO usar <Field>/<label> aquí, el clic abriría el selector dos veces */}
              <div className="md:col-span-2">
                <span className="mb-1.5 block text-sm font-bold text-slate-600">Imagen (opcional)</span>

                {image ? (
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img src={image} alt="Vista previa" className="max-h-56 w-full bg-slate-50 object-contain" />
                    <button
                      type="button"
                      onClick={removeImage}
                      aria-label="Quitar imagen"
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
                    >
                      <X size={16} />
                    </button>
                    <p className="truncate px-3 py-2 text-xs text-slate-500">{imageName}</p>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      pickImage(e.dataTransfer.files[0]);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/50 px-4 py-8 text-center text-sm text-slate-500 transition hover:border-sky-400 hover:bg-sky-50"
                  >
                    <Upload className="text-sky-500" />
                    <span>
                      <b className="text-sky-600">Haz clic para elegir</b> o arrastra una imagen aquí
                    </span>
                    <small>PNG, JPG o WEBP · se optimiza automáticamente</small>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    pickImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>

              <Field label="URL al hacer clic">
                <input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} className="input" />
              </Field>

              <Field label="Device ID (vacío = todos)">
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="input"
                  placeholder="PC-CONTABILIDAD-01"
                />
              </Field>
            </div>

            <button
              disabled={busy}
              onClick={send}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-4 font-extrabold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Send size={18} />
              {busy ? 'Enviando…' : 'Enviar notificación'}
            </button>
            <p className="mt-3 text-center text-sm font-semibold text-slate-500">{status}</p>

            {/* Conexión: solo PoC. En producción lo hace el backend de G3 Ops */}
            <details open={needsKey} className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm">
              <summary className="cursor-pointer font-bold text-slate-600">Conexión (solo PoC)</summary>
              <div className="mt-3 grid gap-3">
                <p className="text-slate-500">
                  Servidor: <b className="text-slate-700">{SERVER}</b>
                </p>
                <Field label="Clave de acceso">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => changeKey(e.target.value)}
                    className="input"
                    placeholder="Se guarda en este navegador"
                  />
                </Field>
              </div>
            </details>
          </section>

          <aside className="space-y-5">
            <Card icon={<MonitorSmartphone />} title="Agente Electron">
              Se instala una sola vez, queda en segundo plano y puede iniciar con Windows. No depende de tener el
              navegador abierto.
            </Card>
            <Card icon={<ImageIcon />} title="Toast corporativo">
              Azul claro, blanco y verde; admite imagen, animación, detalle y acción al hacer clic.
            </Card>
            <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Flujo</p>
              <p className="mt-3 font-mono text-sm leading-7 text-slate-300">
                G3 Ops → API → Socket.IO
                <br />→ Electron → Toast
                <br />→ Detalle / Ack
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl border border-white p-6 shadow-lg shadow-slate-200/60">
      <div className="mb-3 flex items-center gap-3 text-sky-600">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100">{icon}</span>
        <b className="text-slate-900">{title}</b>
      </div>
      <p className="text-sm leading-6 text-slate-500">{children}</p>
    </div>
  );
}

/** Elige la vista según la dirección: /#/instalar = página de descarga. */
export default function App() {
  return window.location.hash.startsWith('#/instalar') ? <InstallPage /> : <Panel />;
}
